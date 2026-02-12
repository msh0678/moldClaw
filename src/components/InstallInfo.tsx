import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const InstallInfo: React.FC = () => {
  const [installPath, setInstallPath] = useState<string>('');

  useEffect(() => {
    // 실제 설치 경로를 백엔드에서 가져오기
    invoke<string>('get_install_path')
      .then(setInstallPath)
      .catch(() => {
        // 폴백: 일반적인 경로 표시
        if (process.platform === 'win32') {
          setInstallPath('%LOCALAPPDATA%\\Programs\\openclaw\\');
        } else if (process.platform === 'darwin') {
          setInstallPath('~/Library/Application Support/openclaw/');
        } else {
          setInstallPath('~/.local/share/openclaw/');
        }
      });
  }, []);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-blue-900 mb-2">📁 OpenClaw 설치 위치</h3>
      <p className="text-sm text-blue-800 mb-2">
        OpenClaw는 전체 파일시스템 접근을 위해 다음 위치에 설치됩니다:
      </p>
      <code className="block bg-white p-2 rounded text-xs mb-2 break-all">
        {installPath || '계산 중...'}
      </code>
      <p className="text-xs text-blue-600">
        💡 이 위치는 OS별 표준 프로그램 설치 위치로, 
        백업 서비스가 자동으로 제외하며 전체 파일시스템 접근이 가능합니다.
      </p>
    </div>
  );
};

export const PermissionInfo: React.FC = () => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-bold text-yellow-900 mb-2">🔓 파일 접근 권한</h3>
      <p className="text-sm text-yellow-800 mb-2">
        OpenClaw가 정상 작동하려면 다음 권한이 필요합니다:
      </p>
      <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
        <li>홈 디렉토리 읽기/쓰기</li>
        <li>문서 폴더 접근</li>
        <li>다운로드 폴더 접근</li>
        <li>작업 디렉토리 생성</li>
      </ul>
      <p className="text-xs text-yellow-600 mt-2">
        ⚠️ Flatpak이나 Snap으로 설치한 경우 추가 권한 설정이 필요할 수 있습니다.
      </p>
    </div>
  );
};