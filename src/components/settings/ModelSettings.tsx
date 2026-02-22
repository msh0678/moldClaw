// ModelSettings - AI 모델 설정 섹션

import { useState } from 'react';
import type { FullConfig, SettingsMode, ModelConfig, AIProvider } from '../../types/config';
import { ALL_PROVIDERS } from '../../data/providers';

interface ModelSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function ModelSettings({
  config,
  updateConfig,
  mode: _mode,
  openModal: _openModal,
  closeModal: _closeModal,
}: ModelSettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    config.model?.provider || null
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(
    config.model?.model || null
  );
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const provider = ALL_PROVIDERS.find(p => p.id === selectedProvider);

  const handleProviderChange = (providerId: AIProvider) => {
    setSelectedProvider(providerId);
    setSelectedModel(null);
    setApiKey('');
  };

  const handleSaveModel = () => {
    if (!selectedProvider || !selectedModel) return;
    
    const newModel: ModelConfig = {
      provider: selectedProvider,
      model: selectedModel,
      apiKey: apiKey || config.model?.apiKey || '',
    };
    
    updateConfig({ model: newModel });
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">AI 모델</h2>
        <p className="text-forge-muted">AI 서비스와 모델을 설정합니다</p>
      </div>

      {/* 현재 설정 */}
      {config.model && (
        <div className="card p-4 mb-6 bg-forge-success/10 border-forge-success/30">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {ALL_PROVIDERS.find(p => p.id === config.model?.provider)?.icon}
            </span>
            <div>
              <p className="font-medium text-forge-text">현재: {config.model.model}</p>
              <p className="text-sm text-forge-muted">{config.model.provider}</p>
            </div>
          </div>
        </div>
      )}

      {/* 프로바이더 선택 - 3줄 그리드 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-forge-muted mb-3">
          AI 서비스
        </label>
        <div className="grid grid-cols-3 gap-3">
          {ALL_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`
                p-4 rounded-xl text-center transition-all
                ${selectedProvider === p.id
                  ? 'bg-forge-copper/20 border-2 border-forge-copper'
                  : 'bg-[#1e2030] border-2 border-[#2a2d3e] hover:border-[#3a3f52]'
                }
              `}
            >
              <div className="h-8 flex items-center justify-center mb-2">
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="h-6 w-6 object-contain" />
                ) : (
                  <span className="text-2xl">{p.icon}</span>
                )}
              </div>
              <div className="text-sm font-medium text-forge-text">{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 모델 선택 */}
      {provider && (
        <div className="mb-6 animate-fadeIn">
          <label className="block text-sm font-medium text-forge-muted mb-3">
            모델
          </label>
          <div className="grid grid-cols-2 gap-2">
            {provider.models.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`
                  p-4 rounded-xl text-left transition-all
                  ${selectedModel === m.id
                    ? 'bg-forge-copper/20 border-2 border-forge-copper'
                    : 'bg-[#1e2030] border-2 border-[#2a2d3e] hover:border-[#3a3f52]'
                  }
                `}
              >
                <div className="font-medium text-forge-text text-sm">{m.name}</div>
                <div className="text-xs text-forge-muted mt-1 line-clamp-1">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* API 키 */}
      {selectedModel && provider && (
        <div className="mb-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-forge-muted">
              API 키
              {config.model?.apiKey && (
                <span className="ml-2 text-forge-success text-xs">기존 키 있음</span>
              )}
            </label>
            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-forge-copper hover:text-forge-amber"
            >
              키 발급받기 →
            </a>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.model?.apiKey ? '(변경하려면 새 키 입력)' : provider.keyPlaceholder}
              className="
                w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none focus:border-forge-copper transition-colors
                text-sm font-mono pr-12
              "
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted hover:text-forge-text"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      )}

      {/* 적용 버튼 */}
      {selectedModel && (
        <button
          onClick={handleSaveModel}
          disabled={!selectedProvider || !selectedModel || (!apiKey && !config.model?.apiKey)}
          className="
            w-full py-3 rounded-xl btn-primary
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          변경 적용
        </button>
      )}
    </div>
  );
}
