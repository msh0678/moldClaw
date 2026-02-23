// GmailSettings - Gmail 연동 설정 섹션
// Gmail은 OpenClaw CLI를 통해 설정해야 함 (gogcli + Pub/Sub + Tailscale 필요)

import { open } from '@tauri-apps/plugin-shell';
import type { FullConfig, SettingsMode } from '../../types/config';

interface GmailSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function GmailSettings({
  config: _config,
  updateConfig: _updateConfig,
  commitConfig: _commitConfig,
  mode: _mode,
  openModal: _openModal,
  closeModal: _closeModal,
}: GmailSettingsProps) {

  const openDocs = () => {
    open('https://docs.openclaw.ai/automation/gmail-pubsub').catch(console.error);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">Gmail 연동</h2>
        <p className="text-forge-muted">AI가 이메일 알림을 받고 처리할 수 있게 설정합니다</p>
      </div>

      {/* 안내 */}
      <div className="card p-5 mb-6 bg-forge-amber/10 border-forge-amber/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-forge-surface flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h3 className="font-medium text-forge-text mb-2">CLI 설정 필요</h3>
            <p className="text-sm text-forge-muted">
              Gmail 연동은 복잡한 설정이 필요하여<br />
              <strong className="text-forge-text">터미널에서 OpenClaw CLI</strong>를 사용해야 합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 필요 사항 */}
      <div className="card p-5 mb-6">
        <h3 className="font-medium text-forge-text mb-4">필요 사항</h3>
        <ul className="space-y-3">
          {[
            { icon: '☁️', text: 'Google Cloud 프로젝트 + Pub/Sub 설정' },
            { icon: '🔑', text: 'gogcli (Gmail OAuth CLI) 설치 및 인증' },
            { icon: '🌐', text: 'Tailscale Funnel (공개 HTTPS 엔드포인트)' },
            { icon: '⚙️', text: 'OpenClaw hooks 설정' },
          ].map(({ icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-forge-muted">
              <span className="text-lg">{icon}</span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* CLI 명령어 */}
      <div className="card p-5 mb-6">
        <h3 className="font-medium text-forge-text mb-4">설정 방법</h3>
        <div className="bg-[#0d0f14] rounded-lg p-4 font-mono text-sm">
          <p className="text-forge-muted mb-2"># 터미널에서 실행:</p>
          <p className="text-forge-success">openclaw webhooks gmail setup \</p>
          <p className="text-forge-success pl-4">--account your@gmail.com</p>
        </div>
        <p className="text-xs text-forge-muted mt-3">
          이 명령어가 필요한 모든 설정을 안내합니다.
        </p>
      </div>

      {/* 문서 링크 */}
      <button
        onClick={openDocs}
        className="w-full py-3 rounded-xl btn-primary"
      >
        📖 Gmail 설정 가이드 열기
      </button>

      {/* 부가 설명 */}
      <div className="mt-6 p-4 bg-forge-surface rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm">
            <p className="text-forge-text font-medium mb-1">왜 CLI가 필요한가요?</p>
            <p className="text-forge-muted">
              Gmail은 Google Cloud Pub/Sub, OAuth 인증, Webhook 터널 설정이 필요합니다.
              OpenClaw CLI가 이 복잡한 과정을 단계별로 안내해 드립니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
