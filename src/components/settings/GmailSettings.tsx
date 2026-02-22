// GmailSettings - Gmail 연동 설정 섹션

import { useState } from 'react';
import type { FullConfig, SettingsMode } from '../../types/config';

interface GmailSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function GmailSettings({
  config: _config,
  updateConfig: _updateConfig,
  mode: _mode,
  openModal: _openModal,
  closeModal: _closeModal,
}: GmailSettingsProps) {
  const [credentialsPath, setCredentialsPath] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  const handleFileSelect = async () => {
    // TODO: 파일 선택 다이얼로그 (Tauri)
    // 임시로 경로 입력 방식 사용
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">Gmail 연동</h2>
        <p className="text-forge-muted">AI가 이메일을 읽고, 작성하고, 관리할 수 있게 설정합니다</p>
      </div>

      {/* 상태 표시 */}
      <div className={`card p-5 mb-6 ${isConfigured ? 'bg-forge-success/10 border-forge-success/30' : 'bg-forge-amber/10 border-forge-amber/30'}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">📧</span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-forge-text">
              {isConfigured ? 'Gmail 연결됨' : 'Gmail 미연결'}
            </h3>
            <p className="text-sm text-forge-muted">
              {isConfigured 
                ? '이메일 읽기, 작성, 관리 가능'
                : 'Google Cloud 설정이 필요합니다'}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            isConfigured 
              ? 'bg-forge-success/20 text-forge-success' 
              : 'bg-forge-amber/20 text-forge-amber'
          }`}>
            {isConfigured ? '활성' : '미설정'}
          </span>
        </div>
      </div>

      {/* 설정 가이드 */}
      <div className="card p-5 mb-6">
        <h3 className="font-medium text-forge-text mb-4">설정 방법</h3>
        <ol className="space-y-3">
          {[
            { step: 1, text: 'Google Cloud Console에서 프로젝트 생성', url: 'https://console.cloud.google.com/' },
            { step: 2, text: 'Gmail API 활성화', url: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com' },
            { step: 3, text: 'OAuth 2.0 클라이언트 ID 생성', url: 'https://console.cloud.google.com/apis/credentials' },
            { step: 4, text: 'credentials.json 다운로드' },
            { step: 5, text: '아래에서 파일 선택' },
          ].map(({ step, text, url }) => (
            <li key={step} className="flex items-start gap-3">
              <span className="
                w-6 h-6 rounded-full bg-forge-copper/20 text-forge-copper
                flex items-center justify-center text-sm font-medium flex-shrink-0
              ">
                {step}
              </span>
              <div className="flex-1">
                <span className="text-sm text-forge-text">{text}</span>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-forge-copper hover:text-forge-amber"
                  >
                    열기 →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* 파일 선택 */}
      <div className="card p-5 mb-6">
        <label className="block text-sm font-medium text-forge-muted mb-3">
          credentials.json 파일
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={credentialsPath}
            onChange={(e) => setCredentialsPath(e.target.value)}
            placeholder="~/.openclaw/gmail-credentials.json"
            className="
              flex-1 px-4 py-3 bg-forge-surface border border-white/10 rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
          <button
            onClick={handleFileSelect}
            className="px-4 py-3 rounded-xl bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
          >
            찾아보기
          </button>
        </div>
        <p className="text-xs text-forge-muted mt-2">
          Google Cloud Console에서 다운로드한 OAuth 자격 증명 파일
        </p>
      </div>

      {/* 적용 버튼 */}
      <button
        onClick={() => setIsConfigured(true)}
        disabled={!credentialsPath}
        className="
          w-full py-3 rounded-xl btn-primary
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        Gmail 연동 적용
      </button>

      {/* 주의사항 */}
      <div className="mt-6 p-4 bg-forge-error/10 border border-forge-error/30 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="text-sm">
            <p className="text-forge-text font-medium mb-1">보안 주의사항</p>
            <p className="text-forge-muted">
              Gmail 연동을 통해 AI가 이메일에 접근할 수 있습니다.
              신뢰할 수 있는 환경에서만 사용하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
