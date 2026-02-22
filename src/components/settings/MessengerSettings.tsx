// MessengerSettings - 메신저 설정 섹션

import { useState } from 'react';
import type { FullConfig, SettingsMode, Messenger } from '../../types/config';
import { ALL_MESSENGERS } from '../../data/messengers';

interface MessengerSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function MessengerSettings({
  config,
  updateConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: MessengerSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<typeof ALL_MESSENGERS[0] | null>(null);

  const isConfigured = (messengerId: Messenger) => config.messenger.type === messengerId;

  const handleConnect = (messenger: typeof ALL_MESSENGERS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    
    const MessengerModal = () => {
      const [token, setToken] = useState('');
      const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');
      
      return (
        <div className="space-y-4">
          <p className="text-sm text-forge-muted">{messenger.desc}</p>
          
          {/* 토큰 입력 */}
          {messenger.needsToken && (
            <div>
              <label className="block text-sm font-medium text-forge-muted mb-2">
                {messenger.tokenLabel || 'Bot Token'}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={messenger.tokenPlaceholder}
                className="
                  w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                  focus:outline-none focus:border-forge-copper text-sm font-mono
                "
              />
            </div>
          )}

          {/* DM 정책 */}
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              DM 접근 정책
            </label>
            <select
              value={dmPolicy}
              onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
              className="
                w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none focus:border-forge-copper text-sm
              "
            >
              <option value="pairing">페어링 (코드 승인 필요)</option>
              <option value="allowlist">허용 목록만</option>
              <option value="open">모두 허용 ⚠️</option>
            </select>
          </div>

          {/* 연결 버튼 */}
          <button
            onClick={() => {
              updateConfig({
                messenger: {
                  ...config.messenger,
                  type: messenger.id,
                  token: token || config.messenger.token,
                  dmPolicy,
                }
              });
            }}
            disabled={messenger.needsToken && !token && !config.messenger.token}
            className="
              w-full py-3 rounded-xl btn-primary mt-4
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            연결
          </button>
        </div>
      );
    };

    openModal(`${messenger.name} 연결`, <MessengerModal />);
  };

  const handleDisconnect = (messenger: typeof ALL_MESSENGERS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setDisconnectTarget(messenger);
  };

  const confirmDisconnect = () => {
    if (!disconnectTarget) return;
    
    updateConfig({
      messenger: {
        ...config.messenger,
        type: '' as Messenger,
        token: '',
        dmPolicy: 'pairing',
      }
    });
    setDisconnectTarget(null);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">메신저</h2>
        <p className="text-forge-muted text-sm">AI와 대화할 메신저를 설정합니다</p>
      </div>

      {/* 메신저 그리드 - 3줄 레이아웃 */}
      <div className="grid grid-cols-3 gap-3">
        {ALL_MESSENGERS.map((messenger) => {
          const configured = isConfigured(messenger.id);
          return (
            <div
              key={messenger.id}
              className={`
                bg-[#1e2030] border-2 rounded-xl p-4 transition-all relative
                ${configured 
                  ? 'border-forge-success/40 hover:border-forge-success/60' 
                  : 'border-[#2a2d3e] hover:border-[#3a3f52]'}
              `}
            >
              {messenger.recommended && (
                <span className="absolute -top-2 right-2 text-[10px] px-2 py-0.5 bg-forge-amber text-forge-night rounded font-medium">
                  추천
                </span>
              )}
              
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{messenger.icon}</span>
                <span className="font-medium text-forge-text text-sm">{messenger.name}</span>
              </div>
              <p className="text-xs text-forge-muted mb-3 line-clamp-2">{messenger.desc}</p>
              
              {configured ? (
                <button
                  onClick={(e) => handleDisconnect(messenger, e)}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-error/10 text-forge-error border border-forge-error/30
                    hover:bg-forge-error/20 transition-colors
                  "
                >
                  연결 해제
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnect(messenger, e)}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-copper/10 text-forge-copper border border-forge-copper/30
                    hover:bg-forge-copper/20 transition-colors
                  "
                >
                  연결
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 연결 해제 확인 모달 */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#0a0b0f]/90 backdrop-blur-lg"
            onClick={() => setDisconnectTarget(null)}
          />
          <div className="relative z-10 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-2xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-2">연결 해제 확인</h3>
            <p className="text-sm text-forge-muted mb-4">
              <span className="text-forge-copper">{disconnectTarget.name}</span> 연동을 해제하시겠습니까?
              <br />
              저장된 토큰과 설정이 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDisconnect}
                className="flex-1 px-4 py-2 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 transition-colors"
              >
                해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
