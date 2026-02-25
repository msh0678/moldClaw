// ModelSettings - AI 모델 설정 섹션
// QA 강화: 저장 중 UI 비활성화, 로딩 스피너, 성공 피드백

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode, ModelConfig, AIProvider } from '../../types/config';
import { ALL_PROVIDERS } from '../../data/providers';
import { BrandIcon } from '../common/BrandIcon';

interface ModelSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function ModelSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const provider = ALL_PROVIDERS.find(p => p.id === selectedProvider);

  const handleProviderChange = (providerId: AIProvider) => {
    if (saving) return; // 저장 중 변경 방지
    setSelectedProvider(providerId);
    setSelectedModel(null);
    setApiKey('');
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleModelChange = (modelId: string) => {
    if (saving) return; // 저장 중 변경 방지
    setSelectedModel(modelId);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveModel = async () => {
    if (saving) return; // 연타 방지
    if (!selectedProvider || !selectedModel) return;
    
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      await invoke('update_model_config', {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey || '',
      });
      
      const newModel: ModelConfig = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey || config.model?.apiKey || '',
      };
      
      const newConfig = { ...config, model: newModel };
      commitConfig(newConfig);
      setApiKey('');
      setSaveSuccess(true);
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (err) {
      console.error('모델 설정 저장 실패:', err);
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
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

      {/* 프로바이더 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-forge-muted mb-3">
          AI 서비스
        </label>
        <div className={`grid grid-cols-3 gap-3 ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
          {ALL_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              disabled={saving}
              className={`
                p-4 rounded-xl text-center transition-all
                ${selectedProvider === p.id
                  ? 'bg-forge-copper/20 border-2 border-forge-copper'
                  : 'bg-[#1e2030] border-2 border-[#2a2d3e] hover:border-[#3a3f52]'
                }
                disabled:cursor-not-allowed
              `}
            >
              <div className="h-8 flex items-center justify-center mb-2">
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
      </div>

      {/* 모델 선택 */}
      {provider && (
        <div className={`mb-6 animate-fadeIn ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
          <label className="block text-sm font-medium text-forge-muted mb-3">
            모델
          </label>
          <div className="grid grid-cols-2 gap-2">
            {provider.models.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                disabled={saving}
                className={`
                  p-4 rounded-xl text-left transition-all
                  ${selectedModel === m.id
                    ? 'bg-forge-copper/20 border-2 border-forge-copper'
                    : 'bg-[#1e2030] border-2 border-[#2a2d3e] hover:border-[#3a3f52]'
                  }
                  disabled:cursor-not-allowed
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
              disabled={saving}
              className="
                w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none focus:border-forge-copper transition-colors
                text-sm font-mono pr-12
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <button
              onClick={() => setShowKey(!showKey)}
              disabled={saving}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted hover:text-forge-text disabled:opacity-50"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {saveSuccess && (
        <div className="mb-3 p-3 rounded-xl bg-forge-success/10 border border-forge-success/30 text-forge-success text-sm flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          모델 설정이 저장되었습니다
        </div>
      )}

      {/* 에러 메시지 */}
      {saveError && (
        <div className="mb-3 p-3 rounded-xl bg-forge-error/10 border border-forge-error/30 text-forge-error text-sm">
          {saveError}
        </div>
      )}

      {/* 적용 버튼 */}
      {selectedModel && (
        <button
          onClick={handleSaveModel}
          disabled={saving || !selectedProvider || !selectedModel || (!apiKey && !config.model?.apiKey)}
          className="
            w-full py-3 rounded-xl btn-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              저장 중...
            </>
          ) : (
            '변경 적용'
          )}
        </button>
      )}
    </div>
  );
}
