// GmailSettings - Gmail 연동 설정 섹션
// gog(gogcli) 기반 마법사로 간편 설정

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';
import GmailWizard from './GmailWizard';

interface GmailSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface GmailStatus {
  connected: boolean;
  account: string;
}

export default function GmailSettings({
  config: _config,
  updateConfig: _updateConfig,
  commitConfig: _commitConfig,
  mode: _mode,
  openModal,
  closeModal,
}: GmailSettingsProps) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // 상태 로드
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await invoke<GmailStatus>('get_gmail_status');
      setStatus(result);
    } catch (err) {
      console.error('Gmail 상태 로드 실패:', err);
      setStatus({ connected: false, account: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    openModal('Gmail 연동', (
      <GmailWizard
        onComplete={() => {
          closeModal();
          loadStatus();
        }}
        onCancel={closeModal}
      />
    ));
  };

  const handleDisconnect = () => {
    // 커스텀 확인 모달 표시
    openModal('Gmail 연결 해제', (
      <div className="p-6 max-w-sm mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-forge-error/20 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-forge-text mb-2">
            Gmail 연결을 해제할까요?
          </h3>
          <p className="text-sm text-forge-muted">
            {status?.account}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={closeModal}
            className="flex-1 py-2.5 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors"
          >
            취소
          </button>
          <button
            onClick={async () => {
              setDisconnecting(true);
              closeModal();
              try {
                await invoke('disconnect_gmail');
                setStatus({ connected: false, account: '' });
              } catch (err) {
                console.error('Gmail 연결 해제 실패:', err);
                // 에러 시 다시 상태 로드
                loadStatus();
              } finally {
                setDisconnecting(false);
              }
            }}
            className="flex-1 py-2.5 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 transition-colors"
          >
            연결 해제
          </button>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-forge-surface rounded w-1/3" />
          <div className="h-32 bg-forge-surface rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-forge-text mb-2">Gmail 연동</h2>
        <p className="text-forge-muted">AI가 이메일을 읽고 관리할 수 있게 설정합니다</p>
      </div>

      {/* 연결된 경우 */}
      {status?.connected ? (
        <div className="space-y-4">
          {/* 연결 상태 카드 */}
          <div className="card p-5 border-forge-success/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <span className="text-3xl">📧</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-forge-text">Gmail</h3>
                    <span className="text-xs px-2 py-0.5 bg-forge-success/20 text-forge-success rounded">
                      연결됨
                    </span>
                  </div>
                  <p className="text-sm text-forge-muted">{status.account}</p>
                </div>
              </div>
              
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="
                  px-4 py-2 rounded-lg text-sm
                  bg-forge-error/10 text-forge-error border border-forge-error/30
                  hover:bg-forge-error/20 transition-colors
                  disabled:opacity-50
                "
              >
                {disconnecting ? '해제 중...' : '연결 해제'}
              </button>
            </div>
          </div>

          {/* 기능 안내 */}
          <div className="card p-5 bg-forge-surface">
            <h4 className="font-medium text-forge-text mb-3">사용 가능한 기능</h4>
            <ul className="space-y-2 text-sm text-forge-muted">
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                "최근 이메일 확인해줘"
              </li>
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                "OOO에게 온 메일 찾아줘"
              </li>
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                "오늘 온 중요한 메일 요약해줘"
              </li>
            </ul>
          </div>

          {/* 팁 */}
          <div className="p-4 bg-forge-amber/10 border border-forge-amber/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-lg">💡</span>
              <p className="text-sm text-forge-muted">
                메신저에서 자연어로 이메일 관련 요청을 하면 AI가 처리합니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 연결 안된 경우 */
        <div className="space-y-4">
          {/* 연결 카드 */}
          <div 
            className="card p-5 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={handleConnect}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-forge-surface flex items-center justify-center">
                  <span className="text-3xl">📧</span>
                </div>
                <div>
                  <h3 className="font-medium text-forge-text">Gmail 연결</h3>
                  <p className="text-sm text-forge-muted">
                    Google 계정으로 연동합니다
                  </p>
                </div>
              </div>
              
              <button className="px-4 py-2 rounded-lg btn-primary text-sm">
                연결하기
              </button>
            </div>
          </div>

          {/* 기능 소개 */}
          <div className="card p-5">
            <h4 className="font-medium text-forge-text mb-4">Gmail 연동 기능</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📬', title: '이메일 확인', desc: '받은 메일 목록 조회' },
                { icon: '🔍', title: '메일 검색', desc: '발신자/제목으로 검색' },
                { icon: '📝', title: '메일 요약', desc: 'AI가 내용 요약' },
                { icon: '🔔', title: '알림', desc: '새 메일 알림 (선택)' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-forge-text">{title}</p>
                    <p className="text-xs text-forge-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 보안 안내 */}
          <div className="p-4 bg-forge-surface rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <div className="text-sm">
                <p className="text-forge-text font-medium mb-1">안전한 연동</p>
                <p className="text-forge-muted">
                  OAuth 2.0 인증을 사용하며, 비밀번호는 저장되지 않습니다.
                  언제든 연결을 해제할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
