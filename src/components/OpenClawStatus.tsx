import React from 'react';

interface OpenClawStatusProps {
  isInstalled: boolean;
  version?: string;
  installPath?: string;
  onInstall: () => void;
}

export const OpenClawStatus: React.FC<OpenClawStatusProps> = ({
  isInstalled,
  version,
  installPath,
  onInstall
}) => {
  if (isInstalled) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-bold text-green-900 mb-2">✅ OpenClaw 설치됨</h3>
        {version && (
          <p className="text-sm text-green-800 mb-1">
            버전: <code className="bg-green-100 px-1 rounded">{version}</code>
          </p>
        )}
        {installPath && (
          <p className="text-xs text-green-700">
            경로: <code className="bg-green-100 px-1 rounded break-all">{installPath}</code>
          </p>
        )}
        <p className="text-xs text-green-600 mt-2">
          💡 기존 설치를 사용합니다. 재설치가 필요하면 수동으로 제거 후 다시 시도하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-bold text-yellow-900 mb-2">⚠️ OpenClaw 설치 필요</h3>
      <p className="text-sm text-yellow-800 mb-3">
        OpenClaw가 설치되지 않았습니다. 설치하시겠습니까?
      </p>
      <button
        onClick={onInstall}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
      >
        OpenClaw 설치
      </button>
    </div>
  );
};