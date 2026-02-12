import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

// Chrome 확장 프로그램 URL (나중에 업데이트 가능)
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/openclaw-browser-relay/nglingapjinhecnfejdcpihlpneeadjp';

interface BrowserControlProps {
  onNext: () => void;
  onBack: () => void;
}

export const BrowserControl: React.FC<BrowserControlProps> = ({ onNext, onBack }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipBrowser, setSkipBrowser] = useState(false);

  const handleInstallBrowserControl = async () => {
    if (skipBrowser) {
      onNext();
      return;
    }

    setIsInstalling(true);
    setError(null);

    try {
      // OpenClaw browser control 설치
      const result = await invoke<string>('install_browser_control');
      console.log('Browser control 설치 결과:', result);
      
      setIsInstalled(true);
      
      // Chrome 웹스토어로 이동
      setTimeout(() => {
        open(CHROME_EXTENSION_URL).catch((err) => {
          console.error('웹스토어 열기 실패:', err);
          setError('Chrome 웹스토어를 열 수 없습니다. 수동으로 접속해주세요.');
        });
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSkip = () => {
    setSkipBrowser(true);
    onNext();
  };

  const handleNext = () => {
    if (isInstalled || skipBrowser) {
      onNext();
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">
        🌐 브라우저 자동 제어
      </h2>
      
      {/* Chrome 설치 여부는 백엔드에서 확인하므로 여기서는 안내만 */}

      {!isInstalled && !skipBrowser && (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-purple-900 mb-2">Chrome 브라우저 제어</h3>
            <p className="text-sm text-purple-800 mb-3">
              OpenClaw가 Windows의 Chrome 브라우저를 자동으로 제어할 수 있게 설정하시겠습니까?
            </p>
            <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
              <li>웹 페이지 자동 읽기 및 분석</li>
              <li>폼 자동 입력 및 클릭</li>
              <li>스크린샷 캡처</li>
              <li>웹 자동화 작업</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-yellow-800">
              ⚠️ 이 기능은 선택사항입니다. 나중에 OpenClaw 설정에서 활성화할 수도 있습니다.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleInstallBrowserControl}
              disabled={isInstalling}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isInstalling ? '설치 중...' : '브라우저 제어 설치'}
            </button>
            <button
              onClick={handleSkip}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              건너뛰기
            </button>
          </div>
        </>
      )}

      {isInstalled && !skipBrowser && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-2">✅ Browser Control 설치 완료</h3>
            <p className="text-sm text-green-800">
              이제 Chrome 확장 프로그램을 설치해주세요.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-2">📌 Chrome 확장 프로그램 설치</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
              <li>잠시 후 Chrome 웹스토어가 열립니다</li>
              <li>"Chrome에 추가" 버튼을 클릭하세요</li>
              <li>권한 요청을 승인하세요</li>
              <li>툴바에 OpenClaw 아이콘이 나타납니다</li>
            </ol>
          </div>

          <button
            onClick={() => open(CHROME_EXTENSION_URL).catch(console.error)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Chrome 웹스토어 다시 열기
          </button>

          <button
            onClick={handleNext}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
          >
            완료
          </button>
        </div>
      )}

      {skipBrowser && (
        <div className="text-center py-8">
          <p className="text-gray-600">브라우저 제어를 건너뛰었습니다.</p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
        >
          ← 이전
        </button>
        {(isInstalled || skipBrowser) && (
          <span className="text-green-600">
            준비 완료 ✓
          </span>
        )}
      </div>
    </div>
  );
};