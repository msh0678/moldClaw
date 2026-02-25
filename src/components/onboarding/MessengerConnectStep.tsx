// MessengerConnectStep - 메신저 연결 단계
// 토큰 입력 또는 QR 코드 스캔

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { MessengerConfig, ModelConfig } from '../../types/config';
import { ALL_MESSENGERS } from '../../data/messengers';

interface MessengerConnectStepProps {
  messengerConfig: MessengerConfig;
  modelConfig: ModelConfig | null;
  onComplete: (config: MessengerConfig) => void;
  onBack: () => void;
}

const DM_POLICIES = [
  { value: 'pairing', label: '페어링', desc: '처음 연락하는 사람은 코드 승인 필요 (권장)' },
  { value: 'allowlist', label: '허용 목록만', desc: 'allowFrom에 등록된 사용자만' },
  { value: 'open', label: '모두 허용', desc: '⚠️ 누구나 봇과 대화 가능' },
];

export default function MessengerConnectStep({ 
  messengerConfig, 
  modelConfig: _modelConfig,
  onComplete, 
  onBack 
}: MessengerConnectStepProps) {
  const [token, setToken] = useState(messengerConfig.token);
  const [dmPolicy, setDmPolicy] = useState(messengerConfig.dmPolicy);
  const [allowFrom, setAllowFrom] = useState(messengerConfig.allowFrom.join('\n'));
  const [showToken, setShowToken] = useState(false);

  // WhatsApp 전용 상태
  const [whatsappLinked, setWhatsappLinked] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  
  // 폴링 ref (클로저 문제 해결 + 언마운트 정리)
  const pollIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Slack 전용 상태
  const [slackAppToken, setSlackAppToken] = useState('');
  const [showAppToken, setShowAppToken] = useState(false);

  // Google Chat 전용 상태
  const [serviceAccountPath, setServiceAccountPath] = useState('');

  // Mattermost 전용 상태
  const [mattermostUrl, setMattermostUrl] = useState('');

  const messengerInfo = ALL_MESSENGERS.find(m => m.id === messengerConfig.type);

  // WhatsApp 선택 시 연결 상태 확인
  useEffect(() => {
    if (messengerConfig.type === 'whatsapp') {
      checkWhatsappStatus();
    }
  }, [messengerConfig.type]);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const checkWhatsappStatus = async () => {
    try {
      const linked = await invoke<boolean>('check_whatsapp_linked');
      setWhatsappLinked(linked);
    } catch {
      setWhatsappLinked(false);
    }
  };

  // WhatsApp QR 로그인 (비동기 + 폴링)
  const handleWhatsappQr = async () => {
    // 기존 폴링 정리 (중복 클릭 방지)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setQrLoading(true);
    setQrError(null);

    try {
      // 1. 터미널 열기 (즉시 리턴, 대기 안 함)
      await invoke('open_whatsapp_login_terminal');

      // 2. 폴링 시작 (500ms 간격으로 creds.json 확인)
      pollIntervalRef.current = setInterval(async () => {
        try {
          const linked = await invoke<boolean>('check_whatsapp_linked');
          if (linked) {
            // 성공 시 둘 다 정리
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            pollIntervalRef.current = null;
            timeoutRef.current = null;
            setWhatsappLinked(true);
            setQrLoading(false);
          }
        } catch {
          // 폴링 중 에러는 무시
        }
      }, 500);

      // 3. 타임아웃 (5분 후 폴링 중지)
      timeoutRef.current = setTimeout(() => {
        // pollIntervalRef가 null이면 이미 성공한 것
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          timeoutRef.current = null;
          setQrLoading(false);
          setQrError('QR 스캔 시간이 초과되었습니다. 다시 시도해주세요.');
        }
      }, 300000);

    } catch (err) {
      setQrError(String(err));
      setQrLoading(false);
    }
  };

  const handleNext = async () => {
    if (!messengerConfig.type) return;
    if (messengerInfo?.needsToken && !token) return;
    if (messengerConfig.type === 'whatsapp' && !whatsappLinked) return;
    if (messengerConfig.type === 'slack' && !slackAppToken) return;
    if (messengerConfig.type === 'googlechat' && !serviceAccountPath) return;
    if (messengerConfig.type === 'mattermost' && !mattermostUrl) return;

    try {
      // Slack App Token 저장
      if (messengerConfig.type === 'slack' && slackAppToken) {
        await invoke('set_slack_app_token', { appToken: slackAppToken });
      }

      // Google Chat Service Account 저장
      if (messengerConfig.type === 'googlechat' && serviceAccountPath) {
        await invoke('set_googlechat_service_account', { filePath: serviceAccountPath });
      }

      // Mattermost URL 저장
      if (messengerConfig.type === 'mattermost' && mattermostUrl) {
        await invoke('set_mattermost_url', { url: mattermostUrl });
      }
    } catch (err) {
      console.error('특수 설정 저장 실패:', err);
    }

    onComplete({
      ...messengerConfig,
      token,
      dmPolicy: dmPolicy as 'pairing' | 'allowlist' | 'open',
      allowFrom: allowFrom.split('\n').map(s => s.trim()).filter(s => s),
    });
  };

  const isValid = (() => {
    if (!messengerConfig.type) return false;
    if (messengerInfo?.needsToken && !token) return false;
    if (messengerConfig.type === 'whatsapp' && !whatsappLinked) return false;
    if (messengerConfig.type === 'slack' && (!token || !slackAppToken)) return false;
    if (messengerConfig.type === 'googlechat' && !serviceAccountPath) return false;
    if (messengerConfig.type === 'mattermost' && (!token || !mattermostUrl)) return false;
    return true;
  })();

  if (!messengerInfo) return null;

  return (
    <div className="min-h-screen flex flex-col p-8 overflow-auto">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        className="text-forge-muted hover:text-forge-text mb-6 flex items-center gap-2 self-start"
      >
        ← 뒤로
      </button>

      <div className="max-w-xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">{messengerInfo.icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">{messengerInfo.name} 연결</h2>
          <p className="text-forge-muted">
            {messengerInfo.needsToken ? '봇 토큰을 입력하세요' : 'QR 코드를 스캔하세요'}
          </p>
        </div>

        {/* 가이드 */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-forge-text">연결 방법</h3>
            {messengerInfo.guideUrl && (
              <a
                href={messengerInfo.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-forge-copper hover:text-forge-amber"
              >
                가이드 열기 →
              </a>
            )}
          </div>
          <ol className="space-y-2">
            {messengerInfo.guideSteps.map((step, i) => (
              <li key={i} className={`text-sm ${step.includes('⚠️') ? 'text-forge-amber' : 'text-forge-muted'}`}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* 토큰 입력 (Telegram, Discord, Slack 등) */}
        {messengerInfo.needsToken && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-2">
              {messengerInfo.tokenLabel || 'Bot Token'}
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={messengerInfo.tokenPlaceholder}
                className="
                  w-full px-4 py-3 bg-forge-night border border-forge-surface rounded-xl text-forge-text
                  focus:outline-none focus:border-forge-copper transition-colors
                  text-sm font-mono pr-12
                "
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted hover:text-forge-text"
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="mt-2 text-xs text-forge-muted">
              🔒 토큰은 이 기기에만 저장됩니다
            </p>
          </div>
        )}

        {/* WhatsApp QR 인증 */}
        {messengerConfig.type === 'whatsapp' && (
          <div className="mb-6 animate-fadeIn space-y-4">
            {whatsappLinked ? (
              <div className="p-4 bg-forge-success/10 border border-forge-success/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-forge-success">WhatsApp 연결 완료!</p>
                    <p className="text-sm text-forge-success/70">다음 단계로 진행할 수 있습니다</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-forge-amber/10 border border-forge-amber/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="font-medium text-forge-amber">QR 인증이 필요합니다</p>
                    <p className="text-sm text-forge-amber/70">아래 버튼을 클릭하여 QR 코드를 열어주세요</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleWhatsappQr}
              disabled={qrLoading}
              className={`
                w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3
                ${whatsappLinked
                  ? 'bg-forge-surface hover:bg-white/10 text-forge-muted'
                  : 'bg-forge-success hover:bg-forge-success/90 text-white'
                }
                ${qrLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {qrLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  QR 코드 창 열림 - 스캔 대기 중...
                </>
              ) : whatsappLinked ? (
                <>🔄 다시 인증하기 (선택)</>
              ) : (
                <>📷 QR 코드 열기</>
              )}
            </button>

            {qrError && (
              <div className="p-3 bg-forge-error/10 border border-forge-error/30 rounded-lg">
                <p className="text-sm text-forge-error mb-2">{qrError}</p>
                <button
                  onClick={handleWhatsappQr}
                  className="px-4 py-2 bg-forge-copper text-white rounded-lg text-sm font-medium hover:bg-forge-copper/80"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        )}

        {/* Slack App Token (Socket Mode용) */}
        {messengerConfig.type === 'slack' && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-2">
              App Token (Socket Mode용)
            </label>
            <div className="relative">
              <input
                type={showAppToken ? 'text' : 'password'}
                value={slackAppToken}
                onChange={(e) => setSlackAppToken(e.target.value)}
                placeholder="xapp-..."
                className="
                  w-full px-4 py-3 bg-forge-night border border-forge-surface rounded-xl text-forge-text
                  focus:outline-none focus:border-forge-copper transition-colors
                  text-sm font-mono pr-12
                "
              />
              <button
                onClick={() => setShowAppToken(!showAppToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted hover:text-forge-text"
              >
                {showAppToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="mt-2 text-xs text-forge-muted">
              Slack App → Basic Information → App-Level Tokens에서 생성 (connections:write 스코프 필요)
            </p>
          </div>
        )}

        {/* Google Chat Service Account */}
        {messengerConfig.type === 'googlechat' && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-2">
              Service Account JSON 파일 경로
            </label>
            <input
              type="text"
              value={serviceAccountPath}
              onChange={(e) => setServiceAccountPath(e.target.value)}
              placeholder="C:\Users\...\service-account.json"
              className="
                w-full px-4 py-3 bg-forge-night border border-forge-surface rounded-xl text-forge-text
                focus:outline-none focus:border-forge-copper transition-colors
                text-sm font-mono
              "
            />
            <div className="mt-3 p-3 bg-forge-amber/10 border border-forge-amber/30 rounded-lg">
              <p className="text-xs text-forge-amber">
                💡 Google Cloud Console → API 자격증명 → Service Account → JSON 키 다운로드 후 경로 입력
              </p>
            </div>
          </div>
        )}

        {/* Mattermost URL */}
        {messengerConfig.type === 'mattermost' && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-2">
              Mattermost 서버 URL
            </label>
            <input
              type="text"
              value={mattermostUrl}
              onChange={(e) => setMattermostUrl(e.target.value)}
              placeholder="https://mattermost.example.com"
              className="
                w-full px-4 py-3 bg-forge-night border border-forge-surface rounded-xl text-forge-text
                focus:outline-none focus:border-forge-copper transition-colors
                text-sm font-mono
              "
            />
            <p className="mt-2 text-xs text-forge-muted">
              Mattermost 서버 주소를 입력하세요 (예: https://chat.company.com)
            </p>
          </div>
        )}

        {/* DM 정책 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-forge-muted mb-3">
            DM 접근 정책
          </label>
          <select
            value={dmPolicy}
            onChange={(e) => setDmPolicy(e.target.value as 'pairing' | 'allowlist' | 'open')}
            className="
              w-full px-4 py-3 bg-forge-night border border-white/10 rounded-xl
              focus:outline-none focus:border-forge-copper transition-colors text-sm text-forge-text
            "
          >
            {DM_POLICIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-forge-night text-forge-text">
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-forge-muted">
            {DM_POLICIES.find(p => p.value === dmPolicy)?.desc}
          </p>
        </div>

        {/* allowFrom (pairing, allowlist 일 때) */}
        {(dmPolicy === 'pairing' || dmPolicy === 'allowlist') && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-forge-muted mb-2">
              허용 사용자
              <span className="text-forge-muted/70 ml-2">
                {dmPolicy === 'pairing' ? '(선택)' : '(필수)'}
              </span>
            </label>
            <textarea
              value={allowFrom}
              onChange={(e) => setAllowFrom(e.target.value)}
              placeholder={messengerInfo.allowFromPlaceholder}
              rows={3}
              className="
                w-full px-4 py-3 bg-forge-night border border-forge-surface rounded-xl text-forge-text
                focus:outline-none focus:border-forge-copper transition-colors
                text-sm font-mono resize-none
              "
            />
            <p className="mt-2 text-xs text-forge-muted">
              {messengerInfo.allowFromHelp}
            </p>
          </div>
        )}

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
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
