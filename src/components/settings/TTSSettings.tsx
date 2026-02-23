// TTSSettings - AI 음성 출력 설정
// QA 강화: 연타 방지, 모달 자동 닫기, 해제 기능

import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';

interface TTSSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface TTSProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  detailedDesc: string;
  envVar: string;
  placeholder: string;
  guideUrl: string;
  guideSteps: string[];
  free?: boolean;
  freeLimit?: string;
}

const TTS_PROVIDERS: TTSProvider[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🔊',
    description: '가장 자연스러운 AI 목소리',
    detailedDesc: 'AI의 응답을 사람처럼 자연스러운 음성으로 들을 수 있습니다. 한국어, 영어 등 다양한 언어와 목소리 스타일을 지원합니다. 유튜브 나레이션 품질의 음성을 제공합니다.',
    envVar: 'ELEVENLABS_API_KEY',
    placeholder: 'sk_...',
    guideUrl: 'https://elevenlabs.io/',
    guideSteps: [
      'elevenlabs.io 접속 → 회원가입',
      '로그인 후 우측 상단 프로필 클릭',
      'Profile Settings 클릭',
      'API Key 섹션에서 키 복사',
    ],
    free: true,
    freeLimit: '월 10,000자 무료',
  },
  {
    id: 'openai-tts',
    name: 'OpenAI 음성',
    icon: '🗣️',
    description: 'ChatGPT 제작사의 음성',
    detailedDesc: 'OpenAI에서 제공하는 음성 출력 기능입니다. 이미 OpenAI API 키가 있다면 별도 설정 없이 바로 사용할 수 있습니다.',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-proj-...',
    guideUrl: 'https://platform.openai.com/api-keys',
    guideSteps: [
      'platform.openai.com 접속 → 로그인',
      'API Keys 메뉴 클릭',
      '+ Create new secret key',
      '생성된 키 복사 (한 번만 표시됨!)',
    ],
    free: false,
    freeLimit: '사용량 기반 과금 ($0.015/1000자)',
  },
];

export default function TTSSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
  mode: _mode,
  openModal,
  closeModal,
}: TTSSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<TTSProvider | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const isWorkingRef = useRef(false);

  const isConfigured = (provider: TTSProvider) => !!config.integrations[provider.envVar];

  const handleAddTTS = (provider: TTSProvider) => {
    if (isWorkingRef.current || isDisconnecting) return;
    
    const TTSModal = () => {
      const [apiKey, setApiKey] = useState(config.integrations[provider.envVar] || '');
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState<string | null>(null);
      
      const handleSave = async () => {
        if (saving) return; // 연타 방지
        if (!apiKey.trim()) return;
        
        setSaving(true);
        setError(null);
        isWorkingRef.current = true;
        
        try {
          await invoke('update_integrations_config', {
            integrations: { [provider.envVar]: apiKey.trim() }
          });
          
          const newConfig = {
            ...config,
            integrations: {
              ...config.integrations,
              [provider.envVar]: apiKey.trim(),
            }
          };
          commitConfig(newConfig);
          closeModal(); // 성공 시 자동 닫기
        } catch (err) {
          console.error('TTS 저장 실패:', err);
          setError(String(err));
        } finally {
          setSaving(false);
          isWorkingRef.current = false;
        }
      };
      
      return (
        <div className="space-y-4">
          {/* 상세 설명 */}
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text leading-relaxed">{provider.detailedDesc}</p>
            {provider.freeLimit && (
              <p className={`text-xs mt-2 ${provider.free ? 'text-forge-success' : 'text-forge-muted'}`}>
                {provider.free ? '✓ ' : '💰 '}{provider.freeLimit}
              </p>
            )}
          </div>
          
          {/* API 키 발급 방법 */}
          <div>
            <p className="text-sm font-medium text-forge-muted mb-2">API 키 발급 방법</p>
            <ol className="space-y-1.5 text-sm text-forge-muted">
              {provider.guideSteps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-forge-copper font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* API 키 입력 */}
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              API 키 입력
            </label>
            <input
              type="password"
              placeholder={provider.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={saving}
              className="
                w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none focus:border-forge-copper text-sm font-mono
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>

          <a
            href={provider.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-forge-copper hover:text-forge-amber"
          >
            🔗 {provider.name} 사이트에서 발급받기 →
          </a>
          
          {error && (
            <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
          )}
          
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="
              w-full py-3 rounded-xl btn-primary mt-2
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
              '저장'
            )}
          </button>
        </div>
      );
    };

    openModal(`${provider.name} 설정`, <TTSModal />);
  };

  const handleDisconnect = (provider: TTSProvider, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    setDisconnectTarget(provider);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget || isDisconnecting) return;
    
    setIsDisconnecting(true);
    isWorkingRef.current = true;
    
    try {
      await invoke('update_integrations_config', {
        integrations: { [disconnectTarget.envVar]: '' }
      });
      
      const newIntegrations = { ...config.integrations };
      delete newIntegrations[disconnectTarget.envVar];
      const newConfig = { ...config, integrations: newIntegrations };
      commitConfig(newConfig);
      setDisconnectTarget(null);
    } catch (err) {
      console.error('연결 해제 실패:', err);
      alert(`연결 해제 실패: ${err}`);
    } finally {
      setIsDisconnecting(false);
      isWorkingRef.current = false;
    }
  };

  const cancelDisconnect = () => {
    if (isDisconnecting) return;
    setDisconnectTarget(null);
  };

  const isWorking = isWorkingRef.current || isDisconnecting;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">AI 음성 출력</h2>
        <p className="text-forge-muted">AI의 응답을 글 대신 음성으로 들을 수 있습니다</p>
      </div>

      {/* TTS 프로바이더 목록 */}
      <div className="space-y-3">
        {TTS_PROVIDERS.map((provider) => {
          const configured = isConfigured(provider);
          return (
            <div
              key={provider.id}
              className={`
                card p-5 transition-all
                ${configured ? 'border-forge-success/30' : ''}
                ${isWorking ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-white/5'}
              `}
              onClick={() => !configured && handleAddTTS(provider)}
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-forge-success/20 text-forge-success rounded">
                      설정됨
                    </span>
                    <button
                      onClick={(e) => handleDisconnect(provider, e)}
                      disabled={isWorking}
                      className="text-xs px-2 py-1 bg-forge-error/10 text-forge-error rounded hover:bg-forge-error/20 disabled:opacity-50"
                    >
                      해제
                    </button>
                  </div>
                ) : (
                  <button 
                    className="text-xs px-3 py-1.5 bg-forge-copper/20 text-forge-copper rounded hover:bg-forge-copper/30 disabled:opacity-50"
                    disabled={isWorking}
                  >
                    설정
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 안내 */}
      <div className="mt-8 p-4 bg-[#252836] rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm text-forge-muted space-y-1">
            <p><strong className="text-forge-text">어떤 상황에 유용한가요?</strong></p>
            <p>• 운전 중 AI 응답을 음성으로 듣고 싶을 때</p>
            <p>• 긴 글을 눈으로 읽기 귀찮을 때</p>
            <p>• 외국어 발음을 확인하고 싶을 때</p>
            <p className="text-forge-copper pt-2">추천: ElevenLabs (무료 + 가장 자연스러움)</p>
          </div>
        </div>
      </div>

      {/* 연결 해제 확인 모달 */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 bg-[#0a0b0f]/70 backdrop-blur-md ${isDisconnecting ? '' : 'cursor-pointer'}`}
            onClick={cancelDisconnect}
          />
          <div className="relative z-10 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-2xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-2">연결 해제 확인</h3>
            <p className="text-sm text-forge-muted mb-4">
              <span className="text-forge-copper">{disconnectTarget.name}</span> TTS를 해제하시겠습니까?
              <br />
              저장된 API 키가 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDisconnect}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDisconnecting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    해제 중...
                  </>
                ) : (
                  '해제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
