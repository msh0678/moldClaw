// SummaryStep - 설정 한눈에 보기 (온보딩 마지막 단계)
// '수정' 버튼 없음 (이전 단계로 돌아가서 수정)
// '설치 시작' 버튼으로 config 저장 + Gateway 시작

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ModelConfig, MessengerConfig } from '../../types/config';
import { ALL_PROVIDERS } from '../../data/providers';
import { ALL_MESSENGERS } from '../../data/messengers';

interface SummaryStepProps {
  modelConfig: ModelConfig | null;
  messengerConfig: MessengerConfig;
  browserInstalled: boolean;
  onInstall: () => void;
  onBack: () => void;
}

const POLICY_NAMES: Record<string, string> = {
  pairing: '페어링',
  allowlist: '허용 목록',
  open: '모두 허용',
  disabled: '비활성화',
};

export default function SummaryStep({
  modelConfig,
  messengerConfig,
  browserInstalled,
  onInstall,
  onBack,
}: SummaryStepProps) {
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const providerInfo = modelConfig ? ALL_PROVIDERS.find(p => p.id === modelConfig.provider) : null;
  const messengerInfo = messengerConfig.type ? ALL_MESSENGERS.find(m => m.id === messengerConfig.type) : null;

  const isValid = modelConfig && messengerConfig.type;

  const handleInstall = async () => {
    if (!modelConfig || !messengerConfig.type) return;

    setInstalling(true);
    setError(null);

    try {
      // Step 1: 공식 형식 Config 생성 (Device Identity 포함)
      setStatus('설정 초기화 중...');
      setProgress(15);
      await invoke<string>('create_official_config', {
        gatewayPort: 18789,
        gatewayBind: 'loopback',
      });

      // Step 2: 모델 설정 추가
      setStatus('AI 모델 설정 중...');
      setProgress(30);
      await invoke('add_model_to_config', {
        provider: modelConfig.provider,
        model: modelConfig.model,
        apiKey: modelConfig.apiKey,
      });

      // Step 3: 메신저 채널 설정 추가
      setStatus('메신저 연결 설정 중...');
      setProgress(50);
      await invoke('add_channel_to_config', {
        channel: messengerConfig.type,
        botToken: messengerConfig.token || '',
        dmPolicy: messengerConfig.dmPolicy,
        allowFrom: messengerConfig.allowFrom,
        groupPolicy: messengerConfig.groupPolicy,
        requireMention: messengerConfig.requireMention,
      });

      // Step 4: 보안 설정 적용
      setStatus('보안 설정 적용 중...');
      setProgress(65);
      await invoke('apply_default_security_settings');

      // Step 5: 설정 검증
      setStatus('설정 검증 중...');
      setProgress(80);
      await invoke<boolean>('validate_config');

      // Step 6: Gateway 시작
      setStatus('Gateway 시작 중...');
      setProgress(95);
      try {
        await invoke<string>('install_and_start_service');
      } catch {
        // 첫 시작 시 실패해도 일단 진행
        try {
          await invoke('start_gateway');
        } catch (startErr) {
          console.error('Gateway 시작 실패:', startErr);
        }
      }

      setProgress(100);
      setStatus('설치 완료!');

      // 잠시 대기 후 완료
      await new Promise(resolve => setTimeout(resolve, 1000));
      onInstall();

    } catch (err) {
      setError(String(err));
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-8">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        disabled={installing}
        className="text-forge-muted hover:text-forge-text mb-6 flex items-center gap-2 self-start disabled:opacity-50"
      >
        ← 뒤로
      </button>

      <div className="max-w-xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">설정 확인</h2>
          <p className="text-forge-muted">
            아래 설정으로 OpenClaw를 시작합니다
          </p>
        </div>

        {/* 진행률 바 (설치 중) */}
        {installing && (
          <div className="mb-6 animate-fadeIn">
            <div className="h-2 bg-forge-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-forge-copper transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-forge-amber text-center mt-2">{status}</p>
          </div>
        )}

        {/* 설정 요약 */}
        <div className="space-y-4 mb-8">
          {/* AI 모델 */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-forge-muted">AI 모델</span>
              {providerInfo && (
                <span className="text-sm">{providerInfo.icon}</span>
              )}
            </div>
            {modelConfig && providerInfo ? (
              <div>
                <p className="text-forge-text font-medium">
                  {providerInfo.models.find(m => m.id === modelConfig.model)?.name || modelConfig.model}
                </p>
                <p className="text-sm text-forge-muted">
                  {providerInfo.name} · API 키 설정됨
                </p>
              </div>
            ) : (
              <p className="text-forge-error">⚠️ 설정 필요</p>
            )}
          </div>

          {/* 메신저 */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-forge-muted">메신저</span>
              {messengerInfo && (
                <span className="text-sm">{messengerInfo.icon}</span>
              )}
            </div>
            {messengerInfo ? (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-forge-text font-medium">{messengerInfo.name}</p>
                  <p className="text-sm text-forge-muted">
                    DM: {POLICY_NAMES[messengerConfig.dmPolicy]}
                    {messengerConfig.allowFrom.length > 0 && (
                      <span> · {messengerConfig.allowFrom.length}명 허용</span>
                    )}
                  </p>
                  {messengerInfo.needsToken && (
                    <p className="text-xs text-forge-success mt-1">
                      ✓ 토큰 설정됨
                    </p>
                  )}
                  {messengerConfig.type === 'whatsapp' && (
                    <p className="text-xs text-forge-success mt-1">
                      ✓ QR 코드 연결됨
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-forge-error">⚠️ 선택 필요</p>
            )}
          </div>

          {/* 브라우저 릴레이 */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-forge-muted">브라우저 릴레이</span>
              <span className="text-sm">🌐</span>
            </div>
            <p className="text-forge-text font-medium">
              {browserInstalled ? '설치됨' : '설치 안 함'}
            </p>
            <p className="text-sm text-forge-muted">
              {browserInstalled 
                ? 'Chrome 브라우저 자동 제어 가능' 
                : '나중에 설정에서 활성화 가능'}
            </p>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
            <p className="text-forge-error text-sm font-medium mb-1">설치 오류</p>
            <p className="text-forge-error/80 text-xs">{error}</p>
          </div>
        )}

        {/* 안내 */}
        <div className="card p-4 mb-6 bg-forge-copper/10 border-forge-copper/30">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-sm text-forge-text">
              설치 후 설정을 변경하려면 대시보드의 <strong>설정</strong> 버튼을 사용하세요.
            </p>
          </div>
        </div>

        {/* 설치 시작 버튼 */}
        <button
          onClick={handleInstall}
          disabled={!isValid || installing}
          className="
            w-full py-4 rounded-xl font-semibold text-white
            bg-gradient-to-r from-forge-success to-emerald-500
            hover:opacity-90 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {installing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              설치 중...
            </span>
          ) : (
            '🚀 설치 시작'
          )}
        </button>

        <p className="text-center text-xs text-forge-muted mt-4">
          설정 파일이 저장되고 Gateway가 시작됩니다
        </p>
      </div>
    </div>
  );
}
