// ModelStep - AI 모델 설정 단계
// 기본 보기 (3개) + 더 많은 모델 보기 지원

import { useState, useEffect } from 'react';
import type { ModelConfig, AIProvider } from '../../types/config';
import { BASIC_PROVIDERS, ADDITIONAL_PROVIDERS, ALL_PROVIDERS } from '../../data/providers';
import { BrandIcon } from '../common/BrandIcon';

interface ModelStepProps {
  initialConfig: ModelConfig | null;
  onComplete: (config: ModelConfig) => void;
}

export default function ModelStep({ initialConfig, onComplete }: ModelStepProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(initialConfig?.provider || null);
  const [selectedModel, setSelectedModel] = useState<string | null>(initialConfig?.model || null);
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const displayProviders = showAll ? ALL_PROVIDERS : BASIC_PROVIDERS;
  const provider = ALL_PROVIDERS.find(p => p.id === selectedProvider);

  // 프로바이더 변경 시 모델 초기화
  useEffect(() => {
    if (selectedProvider && !initialConfig) {
      setSelectedModel(null);
      setApiKey('');
    }
  }, [selectedProvider, initialConfig]);

  const handleSubmit = () => {
    if (!selectedProvider || !selectedModel || !apiKey || apiKey.length < 10) return;
    onComplete({
      provider: selectedProvider,
      model: selectedModel,
      apiKey,
    });
  };

  const isValid = selectedProvider && selectedModel && apiKey.length > 10;

  return (
    <div className="min-h-screen flex flex-col p-8">
      <div className="max-w-xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">🤖</span>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">AI 모델 설정</h2>
          <p className="text-forge-muted">
            사용할 AI와 API 키를 입력하세요
          </p>
        </div>

        {/* 프로바이더 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-forge-muted mb-3">
            AI 서비스 선택
            {!selectedProvider && (
              <span className="ml-2 text-forge-copper animate-pulse">← 여기서 시작!</span>
            )}
          </label>
          
          <div className={`
            grid grid-cols-3 gap-3
            ${!selectedProvider ? 'ring-2 ring-forge-copper/50 rounded-xl p-2' : ''}
          `}>
            {displayProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p.id);
                  setSelectedModel(null);
                  setApiKey('');
                }}
                className={`
                  p-4 rounded-xl text-center transition-all
                  ${selectedProvider === p.id
                    ? 'bg-forge-copper/20 border-2 border-forge-copper'
                    : 'bg-forge-surface hover:bg-white/10 border-2 border-transparent'
                  }
                `}
              >
                <div className="h-8 w-8 mx-auto mb-2 flex items-center justify-center">
                  <BrandIcon 
                    iconSlug={p.iconSlug}
                    iconColor={p.iconColor}
                    logo={p.logo}
                    icon={p.icon}
                    name={p.name}
                    size={24}
                  />
                </div>
                <div className="text-sm font-medium text-forge-text">{p.name}</div>
              </button>
            ))}
          </div>

          {/* 더 많은 모델 보기 */}
          {!showAll && ADDITIONAL_PROVIDERS.length > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 py-2 text-sm text-forge-copper hover:text-forge-amber transition-colors"
            >
              더 많은 모델 보기 ({ADDITIONAL_PROVIDERS.length}개) →
            </button>
          )}
          {showAll && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full mt-3 py-2 text-sm text-forge-muted hover:text-forge-text transition-colors"
            >
              ← 기본 보기로
            </button>
          )}
        </div>

        {/* 모델 선택 */}
        {provider && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-3">
              모델 선택
            </label>
            <div className="space-y-2">
              {provider.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    ${selectedModel === m.id
                      ? 'bg-forge-copper/20 border-2 border-forge-copper'
                      : 'bg-forge-surface hover:bg-white/10 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="font-medium text-forge-text">{m.name}</div>
                  <div className="text-sm text-forge-muted">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* API 키 입력 */}
        {selectedModel && provider && (
          <div className="mb-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-forge-muted">
                API 키
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
                placeholder={provider.keyPlaceholder}
                className="
                  w-full px-4 py-3 bg-forge-surface border border-white/10 rounded-xl
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
            <p className="mt-2 text-xs text-forge-muted">
              🔒 키는 이 기기에만 저장되며 외부로 전송되지 않습니다
            </p>
          </div>
        )}

        {/* 다음 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="
            w-full py-4 rounded-xl font-semibold text-white
            btn-primary disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
