// MessengerSettings - 메신저 설정 섹션
// WhatsApp: QR 코드 모달
// Slack: 2개 토큰 (botToken + appToken)

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { FullConfig, SettingsMode, Messenger } from '../../types/config';
import { ALL_MESSENGERS } from '../../data/messengers';

interface MessengerSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;  // 저장 성공 시 호출
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

export default function MessengerSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: MessengerSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<typeof ALL_MESSENGERS[0] | null>(null);

  const isConfigured = (messengerId: Messenger) => config.messenger.type === messengerId;

  // WhatsApp 전용 모달
  // OpenClaw WhatsApp QR은 터미널 창에서 ASCII로 표시됨
  const WhatsAppModal = () => {
    const [status, setStatus] = useState<'init' | 'waiting' | 'connected' | 'error'>('init');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const startConnection = async () => {
      setStatus('waiting');
      setErrorMsg(null);
      try {
        // 터미널 창에서 QR 코드 표시 (login_whatsapp)
        const result = await invoke<string>('login_whatsapp');
        console.log('WhatsApp 결과:', result);
        
        // 성공 시 연결 완료
        setStatus('connected');
        
        // 메신저 설정 업데이트 + 변경 트래킹
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'whatsapp' as Messenger,
            token: '', // WhatsApp은 토큰 없음
            dmPolicy: 'pairing' as const,
          }
        };
        commitConfig(newConfig);
      } catch (err) {
        console.error('WhatsApp QR 실패:', err);
        setErrorMsg(String(err));
        setStatus('error');
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">
          WhatsApp Web을 통해 연결합니다. 휴대폰의 WhatsApp 앱이 필요합니다.
        </p>
        
        <ol className="space-y-2 text-sm text-forge-muted">
          <li className="flex gap-2">
            <span className="text-forge-copper">1.</span>
            아래 "QR 코드 생성" 버튼 클릭
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">2.</span>
            <strong>터미널 창이 열립니다</strong> (QR 코드 표시)
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">3.</span>
            휴대폰 WhatsApp → 설정 → 연결된 기기 → QR 스캔
          </li>
        </ol>

        {status === 'init' && (
          <button
            onClick={startConnection}
            className="w-full py-3 rounded-xl btn-primary mt-4"
          >
            📷 QR 코드 생성
          </button>
        )}

        {status === 'waiting' && (
          <div className="text-center py-6">
            <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto" />
            <p className="text-sm text-forge-amber mt-4 font-medium">
              터미널 창이 열렸습니다!
            </p>
            <p className="text-xs text-forge-muted mt-2">
              터미널에서 QR 코드를 휴대폰으로 스캔하세요.<br />
              완료되면 자동으로 연결됩니다.
            </p>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-forge-success/20 mx-auto flex items-center justify-center mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-forge-success font-medium">WhatsApp 연결 완료!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <p className="text-forge-error font-medium">연결 실패</p>
            {errorMsg && (
              <p className="text-xs text-forge-muted mt-2 break-words">{errorMsg}</p>
            )}
            <button
              onClick={() => setStatus('init')}
              className="mt-4 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d303f] transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    );
  };

  // Slack 전용 모달 (2개 토큰)
  const SlackModal = () => {
    const [botToken, setBotToken] = useState('');
    const [appToken, setAppToken] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');

    const handleSlackConnect = async () => {
      if (!botToken || !appToken) {
        alert('Bot Token과 App Token 모두 필요합니다.');
        return;
      }

      try {
        // Slack 설정 저장
        await invoke('update_messenger_config', {
          channel: 'slack',
          token: botToken,
          dmPolicy: dmPolicy,
          allowFrom: [],
          groupPolicy: 'open',
          requireMention: true,
        });
        
        // App Token도 별도 저장
        await invoke('set_slack_app_token', { appToken: appToken });
        
        // 변경 트래킹용 commitConfig
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'slack' as Messenger,
            token: botToken,
            dmPolicy,
          }
        };
        commitConfig(newConfig);
      } catch (err) {
        console.error('Slack 연결 실패:', err);
        alert(`Slack 연결 실패: ${err}`);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">
          Slack 앱을 생성하고 두 개의 토큰이 필요합니다.
        </p>
        
        <ol className="space-y-2 text-sm text-forge-muted">
          <li className="flex gap-2">
            <span className="text-forge-copper">1.</span>
            <a href="https://api.slack.com/apps" target="_blank" rel="noopener" className="text-forge-copper hover:underline">
              api.slack.com/apps
            </a>에서 앱 생성
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">2.</span>
            OAuth &amp; Permissions → Bot Token (xoxb-)
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">3.</span>
            Socket Mode 활성화 → App Token (xapp-)
          </li>
        </ol>

        {/* Bot Token */}
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Bot Token (xoxb-)
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="xoxb-..."
            className="
              w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
        </div>

        {/* App Token */}
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            App Token (xapp-)
          </label>
          <input
            type="password"
            value={appToken}
            onChange={(e) => setAppToken(e.target.value)}
            placeholder="xapp-..."
            className="
              w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
        </div>

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

        <button
          onClick={handleSlackConnect}
          disabled={!botToken || !appToken}
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

  // Google Chat 전용 모달 (Service Account 필요)
  const GoogleChatModal = () => {
    const [serviceAccountPath, setServiceAccountPath] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');

    const handleSelectFile = async () => {
      try {
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'JSON',
            extensions: ['json']
          }],
          title: 'Service Account JSON 파일 선택',
        });
        
        if (selected && typeof selected === 'string') {
          setServiceAccountPath(selected);
        }
      } catch (err) {
        console.error('파일 선택 실패:', err);
      }
    };

    const handleGoogleChatConnect = async () => {
      if (!serviceAccountPath) {
        alert('Service Account JSON 파일을 선택해주세요.');
        return;
      }

      try {
        // Service Account 파일 경로 저장
        await invoke('set_googlechat_service_account', { filePath: serviceAccountPath });
        
        // 메신저 설정 저장
        await invoke('update_messenger_config', {
          channel: 'googlechat',
          token: '',
          dmPolicy: dmPolicy,
          allowFrom: [],
          groupPolicy: 'open',
          requireMention: true,
        });
        
        // 변경 트래킹
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'googlechat' as Messenger,
            dmPolicy,
          }
        };
        commitConfig(newConfig);
      } catch (err) {
        console.error('Google Chat 연결 실패:', err);
        alert(`Google Chat 연결 실패: ${err}`);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">
          Google Cloud Service Account가 필요합니다.
        </p>
        
        <ol className="space-y-2 text-sm text-forge-muted">
          <li className="flex gap-2">
            <span className="text-forge-copper">1.</span>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="text-forge-copper hover:underline">
              Google Cloud Console
            </a>에서 프로젝트 생성
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">2.</span>
            Chat API 활성화
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">3.</span>
            Service Account 생성 → JSON 키 다운로드
          </li>
        </ol>

        {/* Service Account 파일 선택 */}
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Service Account JSON 파일
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serviceAccountPath}
              readOnly
              placeholder="파일을 선택하세요..."
              className="
                flex-1 px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none text-sm font-mono text-forge-muted cursor-default
              "
            />
            <button
              onClick={handleSelectFile}
              className="
                px-4 py-3 bg-[#252836] border-2 border-[#2a2d3e] rounded-xl
                hover:bg-[#2d303f] transition-colors text-sm font-medium
              "
            >
              📁 선택
            </button>
          </div>
        </div>

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

        <button
          onClick={handleGoogleChatConnect}
          disabled={!serviceAccountPath}
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

  // Mattermost 전용 모달 (URL + Token 필요)
  const MattermostModal = () => {
    const [botToken, setBotToken] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');

    const handleMattermostConnect = async () => {
      if (!botToken || !serverUrl) {
        alert('Bot Token과 서버 URL 모두 필요합니다.');
        return;
      }

      try {
        // Mattermost URL 저장
        await invoke('set_mattermost_url', { url: serverUrl });
        
        // 메신저 설정 저장
        await invoke('update_messenger_config', {
          channel: 'mattermost',
          token: botToken,
          dmPolicy: dmPolicy,
          allowFrom: [],
          groupPolicy: 'open',
          requireMention: true,
        });
        
        // 변경 트래킹
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'mattermost' as Messenger,
            token: botToken,
            dmPolicy,
          }
        };
        commitConfig(newConfig);
      } catch (err) {
        console.error('Mattermost 연결 실패:', err);
        alert(`Mattermost 연결 실패: ${err}`);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">
          Mattermost 서버 관리자 권한이 필요합니다.
        </p>
        
        <ol className="space-y-2 text-sm text-forge-muted">
          <li className="flex gap-2">
            <span className="text-forge-copper">1.</span>
            Mattermost 관리자 설정 → Integrations
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">2.</span>
            Bot Accounts → Add Bot Account
          </li>
          <li className="flex gap-2">
            <span className="text-forge-copper">3.</span>
            토큰 복사
          </li>
        </ol>

        {/* 서버 URL */}
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Mattermost 서버 URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mattermost.example.com"
            className="
              w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
        </div>

        {/* Bot Token */}
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Bot Token
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="..."
            className="
              w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
        </div>

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

        <button
          onClick={handleMattermostConnect}
          disabled={!botToken || !serverUrl}
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

  // 기본 메신저 모달
  const DefaultMessengerModal = ({ messenger }: { messenger: typeof ALL_MESSENGERS[0] }) => {
    const [token, setToken] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');

    const handleConnect = async () => {
      try {
        await invoke('update_messenger_config', {
          channel: messenger.id,
          token: token || '',
          dmPolicy: dmPolicy,
          allowFrom: [],
          groupPolicy: 'open',
          requireMention: true,
        });
        
        // 변경 트래킹용 commitConfig
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: messenger.id,
            token: token || config.messenger.token,
            dmPolicy,
          }
        };
        commitConfig(newConfig);
      } catch (err) {
        console.error('메신저 연결 실패:', err);
        alert(`연결 실패: ${err}`);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">{messenger.desc}</p>
        
        {/* 가이드 단계 */}
        {messenger.guideSteps && (
          <ol className="space-y-2 text-sm text-forge-muted">
            {messenger.guideSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-forge-copper">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        )}
        
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

        {/* 공식 문서 링크 */}
        {messenger.guideUrl && (
          <a
            href={messenger.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-forge-copper hover:text-forge-amber"
          >
            공식 문서 열기 →
          </a>
        )}

        <button
          onClick={handleConnect}
          disabled={messenger.needsToken && !token}
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

  const handleConnect = (messenger: typeof ALL_MESSENGERS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 메신저별 전용 모달
    if (messenger.id === 'whatsapp') {
      openModal('WhatsApp 연결', <WhatsAppModal />);
    } else if (messenger.id === 'slack') {
      openModal('Slack 연결', <SlackModal />);
    } else if (messenger.id === 'googlechat') {
      openModal('Google Chat 연결', <GoogleChatModal />);
    } else if (messenger.id === 'mattermost') {
      openModal('Mattermost 연결', <MattermostModal />);
    } else {
      openModal(`${messenger.name} 연결`, <DefaultMessengerModal messenger={messenger} />);
    }
  };

  const handleDisconnect = (messenger: typeof ALL_MESSENGERS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setDisconnectTarget(messenger);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    
    try {
      // 채널 설정 제거 (빈 값 전달)
      await invoke('update_messenger_config', {
        channel: disconnectTarget.id,
        token: '',
        dmPolicy: 'pairing',
        allowFrom: [],
        groupPolicy: 'disabled',
        requireMention: true,
      });
      
      // 변경 트래킹용 commitConfig
      const newConfig = {
        ...config,
        messenger: {
          ...config.messenger,
          type: '' as Messenger,
          token: '',
          dmPolicy: 'pairing' as const,
        }
      };
      commitConfig(newConfig);
      
      setDisconnectTarget(null);
    } catch (err) {
      console.error('연결 해제 실패:', err);
      alert(`연결 해제 실패: ${err}`);
    }
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
                {messenger.logo ? (
                  <img src={messenger.logo} alt={messenger.name} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-2xl">{messenger.icon}</span>
                )}
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
                    bg-white text-[#1a1c24] font-medium
                    hover:bg-gray-100 transition-colors
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
            className="absolute inset-0 bg-[#0a0b0f]/70 backdrop-blur-md"
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
