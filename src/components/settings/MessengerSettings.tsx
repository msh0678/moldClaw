// MessengerSettings - 메신저 설정 섹션
// QA 강화: 연타 방지, 로딩 상태, 에러 핸들링, 모달 자동 닫기
// 여러 메신저 동시 연결 지원 (하나만 연결 정책 폐기)

import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { FullConfig, SettingsMode, Messenger } from '../../types/config';
import { ALL_MESSENGERS } from '../../data/messengers';

interface MessengerSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
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
  closeModal,
}: MessengerSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<typeof ALL_MESSENGERS[0] | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  
  // 활성화된 채널 목록 (여러 개 가능)
  const [enabledChannels, setEnabledChannels] = useState<string[]>([]);
  
  // 전역 작업 중 플래그 (연결/해제 중 다른 작업 방지)
  const isWorkingRef = useRef(false);
  
  // 활성화된 채널 목록 로드
  const loadEnabledChannels = useCallback(async () => {
    try {
      const channels = await invoke<string[]>('get_enabled_channels');
      setEnabledChannels(channels);
    } catch (err) {
      console.error('채널 목록 로드 실패:', err);
      setEnabledChannels([]);
    }
  }, []);
  
  // 초기 로드 및 config 변경 시 새로고침
  useEffect(() => {
    loadEnabledChannels();
  }, [loadEnabledChannels, config]);

  // DM 정책 도움말 툴팁
  const DmPolicyHelp = () => (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-forge-muted hover:text-forge-copper transition-colors">ⓘ</span>
      <div className="absolute z-50 left-0 bottom-full mb-2 w-72 p-3 bg-[#252836] border border-[#3a3f52] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <p className="text-xs text-forge-text font-medium mb-2">DM 정책이란?</p>
        <ul className="text-xs text-forge-muted space-y-1.5">
          <li><strong className="text-forge-copper">페어링:</strong> 처음 메시지 보내면 인증 코드 발급 → 승인 후 대화 가능</li>
          <li><strong className="text-forge-copper">허용 목록:</strong> 미리 등록한 사용자만 대화 가능</li>
          <li><strong className="text-forge-amber">모두 허용:</strong> 아무나 대화 가능 (⚠️ 비용 주의)</li>
        </ul>
      </div>
    </div>
  );

  // 그룹 정책 도움말 툴팁
  // OpenClaw GroupPolicy: "open" | "disabled" | "allowlist" (NOT "pairing" - DM only)
  const GroupPolicyHelp = () => (
    <div className="group relative inline-block ml-1">
      <span className="cursor-help text-forge-muted hover:text-forge-copper transition-colors">ⓘ</span>
      <div className="absolute z-50 left-0 bottom-full mb-2 w-72 p-3 bg-[#252836] border border-[#3a3f52] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <p className="text-xs text-forge-text font-medium mb-2">그룹 정책이란?</p>
        <ul className="text-xs text-forge-muted space-y-1.5">
          <li><strong className="text-forge-copper">허용 목록:</strong> 등록된 그룹/채널에서만 메시지 수신</li>
          <li><strong className="text-forge-amber">모두 허용:</strong> 모든 그룹 메시지 수신 (⚠️ 비용 주의)</li>
          <li><strong className="text-forge-copper">비활성화:</strong> 그룹 메시지 완전 차단</li>
        </ul>
      </div>
    </div>
  );

  // 활성화된 채널인지 확인 (여러 채널 동시 지원)
  const isConfigured = (messengerId: Messenger) => enabledChannels.includes(messengerId);

  // WhatsApp 전용 모달
  const WhatsAppModal = () => {
    const [status, setStatus] = useState<'init' | 'waiting' | 'connected' | 'error'>('init');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [riskAccepted, setRiskAccepted] = useState(false);
    const abortRef = useRef(false);

    const startConnection = async () => {
      if (status === 'waiting' || !riskAccepted) return; // 이미 진행 중 또는 동의 안함
      
      setStatus('waiting');
      setErrorMsg(null);
      abortRef.current = false;
      isWorkingRef.current = true;
      
      try {
        const result = await invoke<string>('login_whatsapp');
        
        // 모달이 닫혔으면 무시
        if (abortRef.current) return;
        
        console.log('WhatsApp 결과:', result);
        setStatus('connected');
        
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'whatsapp' as Messenger,
            token: '',
            dmPolicy: 'pairing' as const,
          }
        };
        commitConfig(newConfig);
        
        // 1.5초 후 모달 자동 닫기
        setTimeout(() => {
          if (!abortRef.current) {
            closeModal();
          }
        }, 1500);
        
      } catch (err) {
        if (abortRef.current) return;
        console.error('WhatsApp QR 실패:', err);
        setErrorMsg(String(err));
        setStatus('error');
      } finally {
        isWorkingRef.current = false;
      }
    };

    const handleCancel = () => {
      abortRef.current = true;
      isWorkingRef.current = false;
      closeModal();
    };

    return (
      <div className="space-y-4">
        {/* ⚠️ WhatsApp ToS 경고 */}
        <div className="bg-forge-error/10 border border-forge-error/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="text-forge-error font-bold text-sm">중요 경고: 이용약관 위반</h4>
              <p className="text-xs text-forge-muted mt-2 leading-relaxed">
                WhatsApp 연동은 <strong className="text-forge-text">비공식 API</strong>를 사용합니다.
                이는 Meta(WhatsApp)의 이용약관을 위반하며, 
                <strong className="text-forge-error"> 계정이 영구 차단</strong>될 수 있습니다.
              </p>
              <p className="text-xs text-forge-muted mt-2">
                moldClaw/OpenClaw 개발자는 WhatsApp 사용으로 인한 계정 제재에 대해 
                <strong className="text-forge-text"> 어떠한 책임도 지지 않습니다</strong>.
              </p>
            </div>
          </div>
          
          <label className="flex items-center gap-3 mt-4 pt-3 border-t border-forge-error/20 cursor-pointer">
            <input 
              type="checkbox" 
              checked={riskAccepted}
              onChange={(e) => setRiskAccepted(e.target.checked)}
              className="w-4 h-4 rounded border-forge-error/50 bg-forge-night text-forge-error focus:ring-forge-error/50"
            />
            <span className="text-sm text-forge-error font-medium">
              위험을 이해했으며, 본인 책임하에 사용합니다.
            </span>
          </label>
        </div>

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
            disabled={!riskAccepted}
            className={`w-full py-3 rounded-xl mt-4 transition-all ${
              riskAccepted 
                ? 'btn-primary' 
                : 'bg-forge-surface/50 text-forge-muted cursor-not-allowed'
            }`}
          >
            {riskAccepted ? '📷 QR 코드 생성' : '🔒 위 경고에 동의해주세요'}
          </button>
        )}

        {status === 'waiting' && (
          <div className="text-center py-6">
            <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto" />
            <p className="text-sm text-forge-amber mt-4 font-medium">
              터미널 창이 열렸습니다!
            </p>
            <p className="text-xs text-forge-muted mt-2">
              터미널에서 QR 코드를 휴대폰으로 스캔하세요.
            </p>
            <button
              onClick={handleCancel}
              className="mt-4 px-4 py-2 rounded-lg bg-[#252836] text-forge-muted hover:text-forge-text hover:bg-[#2d303f] transition-colors text-sm"
            >
              취소
            </button>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-forge-success/20 mx-auto flex items-center justify-center mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-forge-success font-medium">WhatsApp 연결 완료!</p>
            <p className="text-xs text-forge-muted mt-2">잠시 후 자동으로 닫힙니다...</p>
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

  // allowFrom 계산 함수 (dmPolicy에 따라)
  const computeAllowFrom = (policy: 'pairing' | 'allowlist' | 'open', allowListInput: string): string[] => {
    if (policy === 'open') return ['*'];
    if (policy === 'allowlist') {
      return allowListInput.split('\n').map(s => s.trim()).filter(Boolean);
    }
    return []; // pairing은 빈 배열
  };

  // Slack 전용 모달 (2개 토큰)
  const SlackModal = () => {
    const [botToken, setBotToken] = useState('');
    const [appToken, setAppToken] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');
    const [groupPolicy, setGroupPolicy] = useState<'open' | 'allowlist' | 'disabled'>('allowlist');
    const [allowListInput, setAllowListInput] = useState('');
    const [groupAllowListInput, setGroupAllowListInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSlackConnect = async () => {
      if (saving) return; // 연타 방지
      if (!botToken || !appToken) {
        setError('Bot Token과 App Token 모두 필요합니다.');
        return;
      }
      if (dmPolicy === 'allowlist' && !allowListInput.trim()) {
        setError('DM 허용 목록에 최소 1명의 사용자를 입력해주세요.');
        return;
      }
      if (groupPolicy === 'allowlist' && !groupAllowListInput.trim()) {
        setError('그룹 허용 목록에 최소 1개의 채널을 입력해주세요.');
        return;
      }

      setSaving(true);
      setError(null);
      isWorkingRef.current = true;

      try {
        const allowFrom = computeAllowFrom(dmPolicy, allowListInput);
        const groupAllowFrom = groupPolicy === 'allowlist' 
          ? groupAllowListInput.split('\n').map(s => s.trim()).filter(Boolean)
          : [];
        
        // 두 invoke를 동시에 실행하지 않고 순차적으로, 하나라도 실패하면 중단
        await invoke('update_messenger_config', {
          channel: 'slack',
          token: botToken,
          dmPolicy: dmPolicy,
          allowFrom: allowFrom,
          groupPolicy: groupPolicy,
          groupAllowFrom: groupAllowFrom,
          requireMention: true,
        });
        
        await invoke('set_slack_app_token', { appToken: appToken });
        
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
        closeModal(); // 성공 시 모달 닫기
        
      } catch (err) {
        console.error('Slack 연결 실패:', err);
        setError(String(err));
      } finally {
        setSaving(false);
        isWorkingRef.current = false;
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

        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Bot Token (xoxb-)
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="xoxb-..."
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            App Token (xapp-)
          </label>
          <input
            type="password"
            value={appToken}
            onChange={(e) => setAppToken(e.target.value)}
            placeholder="xapp-..."
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            DM 접근 정책 <DmPolicyHelp />
          </label>
          <select
            value={dmPolicy}
            onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="pairing" className="bg-forge-night text-forge-text">페어링 (코드 승인 필요)</option>
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
          </select>
        </div>

        {dmPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 사용자 (한 줄에 하나씩)
            </label>
            <textarea
              value={allowListInput}
              onChange={(e) => setAllowListInput(e.target.value)}
              placeholder="U1234567890&#10;U0987654321"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">Slack 사용자 ID (U로 시작)</p>
          </div>
        )}

        {dmPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ DM 보안 경고</p>
            <p className="text-forge-muted">
              인터넷의 <strong className="text-forge-text">모든 사람</strong>이 이 봇에게 DM을 보낼 수 있습니다.
              악의적 사용자가 대량 메시지를 보내면 <strong className="text-forge-amber">AI API 비용이 급증</strong>할 수 있습니다.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            그룹/채널 정책 <GroupPolicyHelp />
          </label>
          <select
            value={groupPolicy}
            onChange={(e) => setGroupPolicy(e.target.value as 'open' | 'allowlist' | 'disabled')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만 (안전)</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
            <option value="disabled" className="bg-forge-night text-forge-text">비활성화</option>
          </select>
        </div>

        {groupPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 채널 (한 줄에 하나씩)
            </label>
            <textarea
              value={groupAllowListInput}
              onChange={(e) => setGroupAllowListInput(e.target.value)}
              placeholder="C1234567890&#10;C0987654321"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">Slack 채널 ID (C로 시작)</p>
          </div>
        )}

        {groupPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ 그룹 보안 경고</p>
            <p className="text-forge-muted">
              <strong className="text-forge-text">모든 그룹/채널</strong>의 메시지가 AI에게 전달됩니다.
              제3자 메시지도 처리되므로 <strong className="text-forge-amber">비용 및 개인정보</strong>에 주의하세요.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleSlackConnect}
          disabled={!botToken || !appToken || saving || (dmPolicy === 'allowlist' && !allowListInput.trim()) || (groupPolicy === 'allowlist' && !groupAllowListInput.trim())}
          className="w-full py-3 rounded-xl btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              연결 중...
            </>
          ) : (
            '연결'
          )}
        </button>
      </div>
    );
  };

  // Google Chat 전용 모달
  const GoogleChatModal = () => {
    const [serviceAccountPath, setServiceAccountPath] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');
    const [groupPolicy, setGroupPolicy] = useState<'open' | 'allowlist' | 'disabled'>('allowlist');
    const [allowListInput, setAllowListInput] = useState('');
    const [groupAllowListInput, setGroupAllowListInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectFile = async () => {
      if (saving) return;
      try {
        const selected = await open({
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }],
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
      if (saving) return;
      if (!serviceAccountPath) {
        setError('Service Account JSON 파일을 선택해주세요.');
        return;
      }
      if (dmPolicy === 'allowlist' && !allowListInput.trim()) {
        setError('DM 허용 목록에 최소 1명의 사용자를 입력해주세요.');
        return;
      }
      if (groupPolicy === 'allowlist' && !groupAllowListInput.trim()) {
        setError('Space 허용 목록에 최소 1개를 입력해주세요.');
        return;
      }

      setSaving(true);
      setError(null);
      isWorkingRef.current = true;

      try {
        const allowFrom = computeAllowFrom(dmPolicy, allowListInput);
        const groupAllowFrom = groupPolicy === 'allowlist' 
          ? groupAllowListInput.split('\n').map(s => s.trim()).filter(Boolean)
          : [];
        
        await invoke('set_googlechat_service_account', { filePath: serviceAccountPath });
        
        await invoke('update_messenger_config', {
          channel: 'googlechat',
          token: '',
          dmPolicy: dmPolicy,
          allowFrom: allowFrom,
          groupPolicy: groupPolicy,
          groupAllowFrom: groupAllowFrom,
          requireMention: true,
        });
        
        const newConfig = {
          ...config,
          messenger: {
            ...config.messenger,
            type: 'googlechat' as Messenger,
            dmPolicy,
          }
        };
        commitConfig(newConfig);
        closeModal();
        
      } catch (err) {
        console.error('Google Chat 연결 실패:', err);
        setError(String(err));
      } finally {
        setSaving(false);
        isWorkingRef.current = false;
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
              className="flex-1 px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none text-sm font-mono text-forge-muted cursor-default"
            />
            <button
              onClick={handleSelectFile}
              disabled={saving}
              className="px-4 py-3 bg-[#252836] border-2 border-[#2a2d3e] rounded-xl hover:bg-[#2d303f] transition-colors text-sm font-medium disabled:opacity-50"
            >
              📁 선택
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            DM 접근 정책 <DmPolicyHelp />
          </label>
          <select
            value={dmPolicy}
            onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="pairing" className="bg-forge-night text-forge-text">페어링 (코드 승인 필요)</option>
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
          </select>
        </div>

        {dmPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 사용자 (한 줄에 하나씩)
            </label>
            <textarea
              value={allowListInput}
              onChange={(e) => setAllowListInput(e.target.value)}
              placeholder="user@company.com&#10;users/123456789"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">이메일 또는 Google Chat 사용자 ID</p>
          </div>
        )}

        {dmPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ DM 보안 경고</p>
            <p className="text-forge-muted">
              인터넷의 <strong className="text-forge-text">모든 사람</strong>이 이 봇에게 DM을 보낼 수 있습니다.
              악의적 사용자가 대량 메시지를 보내면 <strong className="text-forge-amber">AI API 비용이 급증</strong>할 수 있습니다.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            Space 정책 <GroupPolicyHelp />
          </label>
          <select
            value={groupPolicy}
            onChange={(e) => setGroupPolicy(e.target.value as 'open' | 'allowlist' | 'disabled')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만 (안전)</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
            <option value="disabled" className="bg-forge-night text-forge-text">비활성화</option>
          </select>
        </div>

        {groupPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              Space 허용 발신자 (한 줄에 하나씩)
            </label>
            <textarea
              value={groupAllowListInput}
              onChange={(e) => setGroupAllowListInput(e.target.value)}
              placeholder="user@company.com&#10;users/123456789"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">이메일 또는 Google Chat 사용자 ID (Space 내에서 메시지를 허용할 발신자)</p>
          </div>
        )}

        {groupPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ Space 보안 경고</p>
            <p className="text-forge-muted">
              <strong className="text-forge-text">모든 Space</strong>의 메시지가 AI에게 전달됩니다.
              제3자 메시지도 처리되므로 <strong className="text-forge-amber">비용 및 개인정보</strong>에 주의하세요.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleGoogleChatConnect}
          disabled={!serviceAccountPath || saving || (dmPolicy === 'allowlist' && !allowListInput.trim()) || (groupPolicy === 'allowlist' && !groupAllowListInput.trim())}
          className="w-full py-3 rounded-xl btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              연결 중...
            </>
          ) : (
            '연결'
          )}
        </button>
      </div>
    );
  };

  // Mattermost 전용 모달
  const MattermostModal = () => {
    const [botToken, setBotToken] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');
    const [groupPolicy, setGroupPolicy] = useState<'open' | 'allowlist' | 'disabled'>('allowlist');
    const [allowListInput, setAllowListInput] = useState('');
    const [groupAllowListInput, setGroupAllowListInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMattermostConnect = async () => {
      if (saving) return;
      if (!botToken || !serverUrl) {
        setError('Bot Token과 서버 URL 모두 필요합니다.');
        return;
      }
      if (dmPolicy === 'allowlist' && !allowListInput.trim()) {
        setError('DM 허용 목록에 최소 1명의 사용자를 입력해주세요.');
        return;
      }
      if (groupPolicy === 'allowlist' && !groupAllowListInput.trim()) {
        setError('채널 허용 목록에 최소 1개를 입력해주세요.');
        return;
      }

      setSaving(true);
      setError(null);
      isWorkingRef.current = true;

      try {
        const allowFrom = computeAllowFrom(dmPolicy, allowListInput);
        const groupAllowFrom = groupPolicy === 'allowlist' 
          ? groupAllowListInput.split('\n').map(s => s.trim()).filter(Boolean)
          : [];
        
        await invoke('set_mattermost_url', { url: serverUrl });
        
        await invoke('update_messenger_config', {
          channel: 'mattermost',
          token: botToken,
          dmPolicy: dmPolicy,
          allowFrom: allowFrom,
          groupPolicy: groupPolicy,
          groupAllowFrom: groupAllowFrom,
          requireMention: true,
        });
        
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
        closeModal();
        
      } catch (err) {
        console.error('Mattermost 연결 실패:', err);
        setError(String(err));
      } finally {
        setSaving(false);
        isWorkingRef.current = false;
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

        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Mattermost 서버 URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mattermost.example.com"
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            Bot Token
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="..."
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            DM 접근 정책 <DmPolicyHelp />
          </label>
          <select
            value={dmPolicy}
            onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="pairing" className="bg-forge-night text-forge-text">페어링 (코드 승인 필요)</option>
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
          </select>
        </div>

        {dmPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 사용자 (한 줄에 하나씩)
            </label>
            <textarea
              value={allowListInput}
              onChange={(e) => setAllowListInput(e.target.value)}
              placeholder="username1&#10;username2"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">Mattermost 사용자명</p>
          </div>
        )}

        {dmPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ DM 보안 경고</p>
            <p className="text-forge-muted">
              인터넷의 <strong className="text-forge-text">모든 사람</strong>이 이 봇에게 DM을 보낼 수 있습니다.
              악의적 사용자가 대량 메시지를 보내면 <strong className="text-forge-amber">AI API 비용이 급증</strong>할 수 있습니다.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            채널 정책 <GroupPolicyHelp />
          </label>
          <select
            value={groupPolicy}
            onChange={(e) => setGroupPolicy(e.target.value as 'open' | 'allowlist' | 'disabled')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만 (안전)</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
            <option value="disabled" className="bg-forge-night text-forge-text">비활성화</option>
          </select>
        </div>

        {groupPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              채널 허용 발신자 (한 줄에 하나씩)
            </label>
            <textarea
              value={groupAllowListInput}
              onChange={(e) => setGroupAllowListInput(e.target.value)}
              placeholder="username1&#10;username2"
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">Mattermost 사용자명 (채널에서 메시지를 허용할 발신자)</p>
          </div>
        )}

        {groupPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ 채널 보안 경고</p>
            <p className="text-forge-muted">
              <strong className="text-forge-text">모든 채널</strong>의 메시지가 AI에게 전달됩니다.
              제3자 메시지도 처리되므로 <strong className="text-forge-amber">비용 및 개인정보</strong>에 주의하세요.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleMattermostConnect}
          disabled={!botToken || !serverUrl || saving || (dmPolicy === 'allowlist' && !allowListInput.trim()) || (groupPolicy === 'allowlist' && !groupAllowListInput.trim())}
          className="w-full py-3 rounded-xl btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              연결 중...
            </>
          ) : (
            '연결'
          )}
        </button>
      </div>
    );
  };

  // 메신저별 허용 목록 플레이스홀더
  const getAllowListPlaceholder = (messengerId: Messenger) => {
    switch (messengerId) {
      case 'telegram': return '123456789\nusername';
      case 'discord': return 'user:123456789\nuser:987654321';
      case 'whatsapp': return '+821012345678\n+821087654321';
      case 'slack': return 'U1234567890\nU0987654321';
      case 'mattermost': return 'username1\nusername2';
      case 'googlechat': return 'user@company.com\nusers/123456789';
      default: return 'user_id_1\nuser_id_2';
    }
  };

  const getAllowListHint = (messengerId: Messenger) => {
    switch (messengerId) {
      case 'telegram': return '숫자 ID 또는 유저네임 (@없이)';
      case 'discord': return 'user:숫자ID 형식';
      case 'whatsapp': return '전화번호 (+국가코드 포함)';
      case 'slack': return 'Slack 사용자 ID (U로 시작)';
      case 'mattermost': return 'Mattermost 사용자명';
      case 'googlechat': return '이메일 또는 Google Chat 사용자 ID';
      default: return '사용자 ID';
    }
  };

  // 그룹 허용 목록 플레이스홀더
  // 주의: Slack은 "채널 ID", 나머지는 "그룹 내 허용 발신자(사용자 ID)"
  const getGroupAllowListPlaceholder = (messengerId: Messenger) => {
    switch (messengerId) {
      // 발신자(사용자) 허용 목록
      case 'telegram': return '123456789\nusername';
      case 'discord': return 'user:123456789012345678\nuser:987654321098765432';
      case 'whatsapp': return '+821012345678\n+821087654321';
      case 'googlechat': return 'user@company.com\nusers/123456789';
      case 'mattermost': return 'username1\nusername2';
      // 채널 허용 목록 (Slack만 해당)
      case 'slack': return 'C1234567890\nC0987654321';
      default: return 'user_id_1\nuser_id_2';
    }
  };

  const getGroupAllowListHint = (messengerId: Messenger) => {
    switch (messengerId) {
      // 발신자(사용자) 허용 목록
      case 'telegram': return '숫자 ID 또는 유저네임 (@없이)';
      case 'discord': return 'user:숫자ID 형식 (Discord 사용자 ID)';
      case 'whatsapp': return '전화번호 (+국가코드 포함)';
      case 'googlechat': return '이메일 또는 Google Chat 사용자 ID';
      case 'mattermost': return 'Mattermost 사용자명';
      // 채널 허용 목록 (Slack만 해당)
      case 'slack': return 'Slack 채널 ID (C로 시작)';
      default: return '사용자 ID';
    }
  };

  // 그룹 허용 목록 라벨 반환 (Slack만 "채널", 나머지는 "발신자")
  const getGroupAllowListLabel = (messengerId: Messenger) => {
    if (messengerId === 'slack') {
      return '허용 채널 (한 줄에 하나씩)';
    }
    return '그룹 허용 발신자 (한 줄에 하나씩)';
  };

  // 기본 메신저 모달
  const DefaultMessengerModal = ({ messenger }: { messenger: typeof ALL_MESSENGERS[0] }) => {
    const [token, setToken] = useState('');
    const [dmPolicy, setDmPolicy] = useState<'pairing' | 'allowlist' | 'open'>('pairing');
    const [groupPolicy, setGroupPolicy] = useState<'open' | 'allowlist' | 'disabled'>('allowlist');
    const [allowListInput, setAllowListInput] = useState('');
    const [groupAllowListInput, setGroupAllowListInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
      if (saving) return;
      if (messenger.needsToken && !token) {
        setError('토큰을 입력해주세요.');
        return;
      }
      if (dmPolicy === 'allowlist' && !allowListInput.trim()) {
        setError('DM 허용 목록에 최소 1명의 사용자를 입력해주세요.');
        return;
      }
      if (groupPolicy === 'allowlist' && !groupAllowListInput.trim()) {
        setError('그룹 허용 목록에 최소 1개를 입력해주세요.');
        return;
      }

      setSaving(true);
      setError(null);
      isWorkingRef.current = true;

      try {
        const allowFrom = computeAllowFrom(dmPolicy, allowListInput);
        const groupAllowFrom = groupPolicy === 'allowlist' 
          ? groupAllowListInput.split('\n').map(s => s.trim()).filter(Boolean)
          : [];
        
        await invoke('update_messenger_config', {
          channel: messenger.id,
          token: token || '',
          dmPolicy: dmPolicy,
          allowFrom: allowFrom,
          groupPolicy: groupPolicy,
          groupAllowFrom: groupAllowFrom,
          requireMention: true,
        });
        
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
        closeModal();
        
      } catch (err) {
        console.error('메신저 연결 실패:', err);
        setError(String(err));
      } finally {
        setSaving(false);
        isWorkingRef.current = false;
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">{messenger.desc}</p>
        
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
              disabled={saving}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            DM 접근 정책 <DmPolicyHelp />
          </label>
          <select
            value={dmPolicy}
            onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="pairing" className="bg-forge-night text-forge-text">페어링 (코드 승인 필요)</option>
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
          </select>
        </div>

        {dmPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 사용자 (한 줄에 하나씩)
            </label>
            <textarea
              value={allowListInput}
              onChange={(e) => setAllowListInput(e.target.value)}
              placeholder={getAllowListPlaceholder(messenger.id)}
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">{getAllowListHint(messenger.id)}</p>
          </div>
        )}

        {dmPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ DM 보안 경고</p>
            <p className="text-forge-muted">
              인터넷의 <strong className="text-forge-text">모든 사람</strong>이 이 봇에게 DM을 보낼 수 있습니다.
              악의적 사용자가 대량 메시지를 보내면 <strong className="text-forge-amber">AI API 비용이 급증</strong>할 수 있습니다.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-forge-muted mb-2 flex items-center">
            그룹 정책 <GroupPolicyHelp />
          </label>
          <select
            value={groupPolicy}
            onChange={(e) => setGroupPolicy(e.target.value as 'open' | 'allowlist' | 'disabled')}
            disabled={saving}
            className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm text-forge-text disabled:opacity-50"
          >
            <option value="allowlist" className="bg-forge-night text-forge-text">허용 목록만 (안전)</option>
            <option value="open" className="bg-forge-night text-forge-text">모두 허용 ⚠️</option>
            <option value="disabled" className="bg-forge-night text-forge-text">비활성화</option>
          </select>
        </div>

        {groupPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              {getGroupAllowListLabel(messenger.id)}
            </label>
            <textarea
              value={groupAllowListInput}
              onChange={(e) => setGroupAllowListInput(e.target.value)}
              placeholder={getGroupAllowListPlaceholder(messenger.id)}
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-forge-night border-2 border-forge-surface rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono text-forge-text disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-forge-muted mt-1">{getGroupAllowListHint(messenger.id)}</p>
          </div>
        )}

        {groupPolicy === 'open' && (
          <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-forge-amber font-medium mb-1">⚠️ 그룹 보안 경고</p>
            <p className="text-forge-muted">
              <strong className="text-forge-text">모든 그룹</strong>의 메시지가 AI에게 전달됩니다.
              제3자 메시지도 처리되므로 <strong className="text-forge-amber">비용 및 개인정보</strong>에 주의하세요.
            </p>
          </div>
        )}

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

        {error && (
          <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleConnect}
          disabled={(messenger.needsToken && !token) || saving || (dmPolicy === 'allowlist' && !allowListInput.trim()) || (groupPolicy === 'allowlist' && !groupAllowListInput.trim())}
          className="w-full py-3 rounded-xl btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              연결 중...
            </>
          ) : (
            '연결'
          )}
        </button>
      </div>
    );
  };

  const handleConnect = (messenger: typeof ALL_MESSENGERS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 작업 중이면 무시
    if (isWorkingRef.current || isDisconnecting) return;
    
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
    
    // 작업 중이면 무시
    if (isWorkingRef.current || isDisconnecting) return;
    
    setDisconnectTarget(messenger);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget || isDisconnecting || !confirmChecked) return;
    
    setIsDisconnecting(true);
    isWorkingRef.current = true;
    
    try {
      await invoke('update_messenger_config', {
        channel: disconnectTarget.id,
        token: '',
        dmPolicy: 'pairing',
        allowFrom: [],
        groupPolicy: 'disabled',
        groupAllowFrom: [],
        requireMention: true,
      });
      
      // 채널 목록 새로고침
      await loadEnabledChannels();
      
      // 로컬 config 업데이트 (호환성 유지)
      const newConfig = {
        ...config,
        messenger: {
          ...config.messenger,
          // 여러 채널 지원이므로 type을 비우지 않음
          dmPolicy: 'pairing' as const,
        }
      };
      commitConfig(newConfig);
      setDisconnectTarget(null);
      setConfirmChecked(false);
      
    } catch (err) {
      console.error('연결 해제 실패:', err);
      alert(`연결 해제 실패: ${err}`);
    } finally {
      setIsDisconnecting(false);
      isWorkingRef.current = false;
    }
  };

  const cancelDisconnect = () => {
    if (isDisconnecting) return; // 해제 중에는 취소 불가
    setDisconnectTarget(null);
    setConfirmChecked(false);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">메신저</h2>
        <p className="text-forge-muted text-sm">AI와 대화할 메신저를 설정합니다</p>
      </div>

      {/* 메신저 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {ALL_MESSENGERS.map((messenger) => {
          const configured = isConfigured(messenger.id);
          const isWorking = isWorkingRef.current || isDisconnecting;
          
          return (
            <div
              key={messenger.id}
              className={`
                bg-[#1e2030] border-2 rounded-xl p-4 transition-all relative
                ${configured 
                  ? 'border-forge-success/40 hover:border-forge-success/60' 
                  : 'border-[#2a2d3e] hover:border-[#3a3f52]'}
                ${isWorking ? 'opacity-60 pointer-events-none' : ''}
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
                  disabled={isWorking}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-forge-error/10 text-forge-error border border-forge-error/30 hover:bg-forge-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  연결 해제
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnect(messenger, e)}
                  disabled={isWorking}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white text-[#1a1c24] font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`absolute inset-0 bg-[#0a0b0f]/70 backdrop-blur-md ${isDisconnecting ? '' : 'cursor-pointer'}`}
            onClick={cancelDisconnect}
          />
          <div className="relative z-10 bg-forge-night border-2 border-forge-surface rounded-2xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-2">연결 해제 확인</h3>
            <p className="text-sm text-forge-muted mb-4">
              <span className="text-forge-copper">{disconnectTarget.name}</span> 연동을 해제하시겠습니까?
              <br />
              저장된 토큰과 설정이 삭제됩니다.
            </p>
            
            {/* 확인 체크박스 */}
            <div className="bg-forge-error/10 border border-forge-error/30 rounded-lg p-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  disabled={isDisconnecting}
                  className="w-4 h-4 rounded border-forge-error/50 bg-forge-night text-forge-error focus:ring-forge-error/50"
                />
                <span className="text-sm text-forge-error font-medium">연결을 해제하겠습니다</span>
              </label>
            </div>
            
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
                disabled={!confirmChecked || isDisconnecting}
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
