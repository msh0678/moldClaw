// BrowserStep - 브라우저 릴레이 설정 단계

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/openclaw-browser-relay/nglingapjinhecnfejdcpihlpneeadjp';

interface BrowserStepProps {
  onComplete: (installed: boolean) => void;
  onBack: () => void;
}

export default function BrowserStep({ onComplete, onBack }: BrowserStepProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      await invoke<string>('install_browser_control');
      setIsInstalled(true);

      // Chrome 웹스토어 열기
      setTimeout(() => {
        open(CHROME_EXTENSION_URL).catch((err) => {
          console.error('웹스토어 열기 실패:', err);
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSkip = () => {
    onComplete(false);
  };

  const handleNext = () => {
    onComplete(isInstalled);
  };

  return (
    <div className="min-h-screen flex flex-col p-8">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        className="text-forge-muted hover:text-forge-text mb-6 flex items-center gap-2 self-start"
      >
        ← 뒤로
      </button>

      <div className="max-w-xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">🌐</span>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">브라우저 릴레이</h2>
          <p className="text-forge-muted">
            Chrome 브라우저 자동 제어 기능 (선택)
          </p>
        </div>

        {/* 안내 */}
        <div className="card p-5 mb-6 bg-forge-amber/10 border-forge-amber/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-forge-text font-medium mb-1">Chromium 기반 브라우저 필요</p>
              <p className="text-forge-muted text-sm">
                Chrome 또는 Edge 브라우저에서 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 기능 설명 */}
        <div className="card p-5 mb-6">
          <h3 className="font-medium text-forge-text mb-3">제공 기능</h3>
          <ul className="space-y-2">
            {[
              '웹 페이지 자동 읽기 및 분석',
              '폼 자동 입력 및 클릭',
              '스크린샷 캡처',
              '웹 자동화 작업',
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-forge-muted">
                <span className="text-forge-success">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* 에러 */}
        {error && (
          <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
            <p className="text-forge-error text-sm">{error}</p>
          </div>
        )}

        {/* 설치 완료 상태 */}
        {isInstalled && (
          <div className="space-y-4 mb-6 animate-fadeIn">
            <div className="card p-4 bg-forge-success/10 border-forge-success/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-medium text-forge-success">Browser Control 설치 완료</p>
                  <p className="text-sm text-forge-success/70">Chrome 확장 프로그램을 설치해 주세요</p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-medium text-forge-text mb-3">📌 Chrome 확장 프로그램 설치</h3>
              <ol className="space-y-2">
                <li className="text-sm text-forge-muted">1. Chrome 웹스토어가 열렸습니다</li>
                <li className="text-sm text-forge-muted">2. "Chrome에 추가" 버튼 클릭</li>
                <li className="text-sm text-forge-muted">3. 권한 요청 승인</li>
                <li className="text-sm text-forge-muted">4. 툴바에 OpenClaw 아이콘 확인</li>
              </ol>
            </div>

            <button
              onClick={() => open(CHROME_EXTENSION_URL).catch(console.error)}
              className="w-full py-3 rounded-xl bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
            >
              Chrome 웹스토어 다시 열기
            </button>
          </div>
        )}

        {/* 버튼들 */}
        {!isInstalled ? (
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-4 rounded-xl bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
            >
              건너뛰기
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="
                flex-1 py-4 rounded-xl font-semibold text-white
                btn-primary disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isInstalling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  설치 중...
                </span>
              ) : (
                '브라우저 제어 설치'
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            className="
              w-full py-4 rounded-xl font-semibold text-white
              btn-primary
            "
          >
            다음 →
          </button>
        )}

        <p className="text-center text-xs text-forge-muted mt-4">
          이 기능은 선택사항입니다. 나중에 설정에서 활성화할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
