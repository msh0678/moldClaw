// TTSSettings - TTS(음성 합성) 설정 섹션

import type { FullConfig, SettingsMode } from '../../types/config';

interface TTSSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface TTSProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  envVar: string;
  placeholder: string;
  guideUrl: string;
}

const TTS_PROVIDERS: TTSProvider[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🔊',
    description: '고품질 AI 음성 합성',
    envVar: 'ELEVENLABS_API_KEY',
    placeholder: 'sk_...',
    guideUrl: 'https://elevenlabs.io/',
  },
  {
    id: 'openai-tts',
    name: 'OpenAI TTS',
    icon: '🗣️',
    description: 'OpenAI 음성 합성',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-proj-...',
    guideUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
  },
];

export default function TTSSettings({
  config,
  updateConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: TTSSettingsProps) {
  const handleAddTTS = (provider: TTSProvider) => {
    const TTSModal = () => (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">{provider.description}</p>
        
        <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
          <p className="text-sm text-forge-text">
            TTS를 사용하면 AI가 음성으로 응답할 수 있습니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            API 키
          </label>
          <input
            type="password"
            placeholder={provider.placeholder}
            defaultValue={config.integrations[provider.envVar] || ''}
            onChange={(e) => {
              updateConfig({
                integrations: {
                  ...config.integrations,
                  [provider.envVar]: e.target.value,
                }
              });
            }}
            className="
              w-full px-4 py-3 bg-forge-surface border border-white/10 rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
        </div>

        <a
          href={provider.guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-forge-copper hover:text-forge-amber"
        >
          {provider.name} 사이트 열기 →
        </a>
      </div>
    );

    openModal(`${provider.name} 설정`, <TTSModal />);
  };

  const isConfigured = (provider: TTSProvider) => !!config.integrations[provider.envVar];

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">음성 합성 (TTS)</h2>
        <p className="text-forge-muted">AI가 음성으로 응답할 수 있게 설정합니다</p>
      </div>

      {/* TTS 프로바이더 목록 */}
      <div className="space-y-3">
        {TTS_PROVIDERS.map((provider) => {
          const configured = isConfigured(provider);
          return (
            <div
              key={provider.id}
              className={`
                card p-5 cursor-pointer transition-all hover:bg-white/5
                ${configured ? 'border-forge-success/30' : ''}
              `}
              onClick={() => handleAddTTS(provider)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-forge-surface flex items-center justify-center">
                    <span className="text-3xl">{provider.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-forge-text">{provider.name}</h3>
                    <p className="text-sm text-forge-muted">{provider.description}</p>
                  </div>
                </div>
                {configured ? (
                  <span className="text-xs px-2 py-1 bg-forge-success/20 text-forge-success rounded">
                    설정됨
                  </span>
                ) : (
                  <button className="text-xs px-3 py-1.5 bg-forge-copper/20 text-forge-copper rounded hover:bg-forge-copper/30">
                    설정
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 안내 */}
      <div className="mt-8 p-4 bg-forge-surface rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <p className="text-sm text-forge-muted">
            TTS를 설정하면 메신저에서 AI의 음성 응답을 받을 수 있습니다.
            ElevenLabs는 가장 자연스러운 음성을 제공합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
