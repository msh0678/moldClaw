// GeneralSettings - 일반 설정 (중요한 설정들 모음)
// Gmail 연동 필수 포함

import type { FullConfig, SettingsMode } from '../../types/config';
import { ALL_PROVIDERS } from '../../data/providers';
import { ALL_MESSENGERS } from '../../data/messengers';

interface GeneralSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function GeneralSettings({
  config,
  updateConfig: _updateConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: GeneralSettingsProps) {
  const providerInfo = config.model 
    ? ALL_PROVIDERS.find(p => p.id === config.model?.provider) 
    : null;
  const messengerInfo = config.messenger.type 
    ? ALL_MESSENGERS.find(m => m.id === config.messenger.type) 
    : null;

  // Gmail 설정 모달
  const GmailSetupModal = () => (
    <div className="space-y-4">
      <p className="text-sm text-forge-muted">
        Gmail 연동을 통해 AI가 이메일을 읽고, 작성하고, 관리할 수 있습니다.
      </p>
      
      <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm">
            <p className="text-forge-text font-medium mb-1">Google Cloud Console 설정 필요</p>
            <p className="text-forge-muted">
              Gmail API를 활성화하고 OAuth 2.0 자격 증명을 생성해야 합니다.
            </p>
          </div>
        </div>
      </div>

      <ol className="space-y-2 text-sm text-forge-muted">
        <li className="flex gap-2">
          <span className="text-forge-copper">1.</span>
          Google Cloud Console에서 프로젝트 생성
        </li>
        <li className="flex gap-2">
          <span className="text-forge-copper">2.</span>
          Gmail API 활성화
        </li>
        <li className="flex gap-2">
          <span className="text-forge-copper">3.</span>
          OAuth 2.0 클라이언트 ID 생성
        </li>
        <li className="flex gap-2">
          <span className="text-forge-copper">4.</span>
          credentials.json 다운로드
        </li>
        <li className="flex gap-2">
          <span className="text-forge-copper">5.</span>
          ~/.openclaw/ 폴더에 파일 저장
        </li>
      </ol>

      <input
        type="file"
        accept=".json"
        className="
          w-full px-4 py-3 bg-forge-surface border border-white/10 rounded-xl
          text-sm text-forge-text file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0 file:bg-forge-copper file:text-white
          file:cursor-pointer
        "
      />

      <a
        href="https://console.cloud.google.com/apis/credentials"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-forge-copper hover:text-forge-amber"
      >
        Google Cloud Console 열기 →
      </a>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">일반 설정</h2>
        <p className="text-forge-muted">자주 사용하는 주요 설정입니다</p>
      </div>

      {/* 설정 카드들 */}
      <div className="space-y-4">
        {/* AI 모델 요약 */}
        <div className="card p-5 hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-forge-surface flex items-center justify-center">
                <span className="text-2xl">{providerInfo?.icon || '🤖'}</span>
              </div>
              <div>
                <h3 className="font-medium text-forge-text">AI 모델</h3>
                <p className="text-sm text-forge-muted">
                  {config.model 
                    ? `${providerInfo?.name || config.model.provider} · ${config.model.model}`
                    : '설정되지 않음'}
                </p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-forge-success/20 text-forge-success rounded">
              {config.model ? '연결됨' : '미설정'}
            </span>
          </div>
        </div>

        {/* 메신저 요약 */}
        <div className="card p-5 hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-forge-surface flex items-center justify-center">
                <span className="text-2xl">{messengerInfo?.icon || '💬'}</span>
              </div>
              <div>
                <h3 className="font-medium text-forge-text">메신저</h3>
                <p className="text-sm text-forge-muted">
                  {messengerInfo 
                    ? `${messengerInfo.name} · DM: ${config.messenger.dmPolicy}`
                    : '설정되지 않음'}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              config.messenger.type 
                ? 'bg-forge-success/20 text-forge-success' 
                : 'bg-forge-error/20 text-forge-error'
            }`}>
              {config.messenger.type ? '연결됨' : '미설정'}
            </span>
          </div>
        </div>

        {/* Gmail 연동 (중요 - 필수 표시) */}
        <div 
          className="card p-5 hover:bg-white/5 transition-colors cursor-pointer border-forge-amber/30"
          onClick={() => openModal('Gmail 연동', <GmailSetupModal />)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-forge-surface flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-forge-text">Gmail 연동</h3>
                  <span className="text-xs px-1.5 py-0.5 bg-forge-amber/20 text-forge-amber rounded">
                    권장
                  </span>
                </div>
                <p className="text-sm text-forge-muted">
                  이메일 읽기, 작성, 관리
                </p>
              </div>
            </div>
            <button className="
              px-3 py-1.5 rounded-lg text-sm
              bg-forge-copper/20 text-forge-copper hover:bg-forge-copper/30
              transition-colors
            ">
              설정
            </button>
          </div>
        </div>

        {/* Brave Search (자주 사용) */}
        <div className="card p-5 hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-forge-surface flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="font-medium text-forge-text">웹 검색</h3>
                <p className="text-sm text-forge-muted">
                  {config.integrations.BRAVE_API_KEY 
                    ? 'Brave Search 연결됨'
                    : 'Brave Search API 필요'}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              config.integrations.BRAVE_API_KEY 
                ? 'bg-forge-success/20 text-forge-success' 
                : 'bg-forge-surface text-forge-muted'
            }`}>
              {config.integrations.BRAVE_API_KEY ? '연결됨' : '미설정'}
            </span>
          </div>
        </div>

        {/* Gateway 상태 */}
        <div className="card p-5 bg-forge-surface/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-forge-night flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h3 className="font-medium text-forge-text">Gateway</h3>
                <p className="text-sm text-forge-muted">
                  포트 {config.gateway.port} · {config.gateway.bind}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-forge-muted">인증: {config.gateway.authMode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <div className="mt-8 p-4 bg-forge-copper/10 border border-forge-copper/30 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm">
            <p className="text-forge-text font-medium mb-1">더 많은 설정이 필요하신가요?</p>
            <p className="text-forge-muted">
              좌측 상단의 "고급" 모드를 활성화하면 스킬, 도구, TTS 등 더 많은 설정을 볼 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
