import { useState } from 'react'
import ModelSetup from './ModelSetup'
import MessengerSelect from './MessengerSelect'
import Integrations from './Integrations'
import { BrowserControl } from '../pages/BrowserControl'
import Connect from './Connect'
import type { FullConfig, ModelConfig, MessengerConfig, GatewayConfig, IntegrationConfig } from '../App'

type SettingsStep = 'menu' | 'ai' | 'messenger' | 'features' | 'browser' | 'summary' | 'connect'

interface SettingsProps {
  isOnboarding: boolean  // 첫 실행 (onboard) 모드인지
  initialConfig: FullConfig
  onComplete: () => void
  onCancel?: () => void  // 대시보드로 돌아가기 (onboard 모드에서는 undefined)
}

const initialConfig: FullConfig = {
  model: null,
  messenger: {
    type: null,
    token: '',
    dmPolicy: 'pairing',
    allowFrom: [],
    groupPolicy: 'allowlist',
    groupAllowFrom: [],
    requireMention: true,
  },
  gateway: {
    port: 18789,
    bind: 'loopback',
    authMode: 'token',
    token: '',
    password: '',
  },
  integrations: {},
}

export default function Settings({ isOnboarding, initialConfig: propConfig, onComplete, onCancel }: SettingsProps) {
  const [step, setStep] = useState<SettingsStep>(isOnboarding ? 'ai' : 'menu')
  const [config, setConfig] = useState<FullConfig>(propConfig || initialConfig)

  // 설정 업데이트 핸들러들
  const handleModelUpdate = (modelConfig: ModelConfig) => {
    setConfig(prev => ({ ...prev, model: modelConfig }))
    setStep('messenger')
  }

  const handleMessengerComplete = (messengerConfig: MessengerConfig) => {
    setConfig(prev => ({ ...prev, messenger: messengerConfig }))
    setStep('features')
  }

  const handleIntegrationsUpdate = (integrations: IntegrationConfig) => {
    setConfig(prev => ({ ...prev, integrations: { ...prev.integrations, ...integrations } }))
  }

  const handleMessengerConfigUpdate = (messengerConfig: Partial<MessengerConfig>) => {
    setConfig(prev => ({ ...prev, messenger: { ...prev.messenger, ...messengerConfig } }))
  }

  const handleGatewayConfigUpdate = (gatewayConfig: Partial<GatewayConfig>) => {
    setConfig(prev => ({ ...prev, gateway: { ...prev.gateway, ...gatewayConfig } }))
  }

  // 뒤로가기
  const handleBack = () => {
    switch (step) {
      case 'ai':
        if (!isOnboarding) setStep('menu')
        break
      case 'messenger':
        setStep('ai')
        break
      case 'features':
        setStep('messenger')
        break
      case 'browser':
        setStep('features')
        break
      case 'summary':
        setStep('browser')
        break
      case 'connect':
        setStep('summary')
        break
    }
  }

  // 메뉴 화면 (일반 설정 모드)
  if (step === 'menu') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-forge-text mb-1">⚙️ 설정</h1>
            <p className="text-forge-muted">OpenClaw 설정을 변경합니다.</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="btn-secondary px-4 py-2 rounded-lg"
            >
              ← 대시보드
            </button>
          )}
        </div>

        {/* 설정 메뉴 */}
        <div className="space-y-3">
          <button
            onClick={() => setStep('ai')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🤖</span>
            <div>
              <h3 className="text-forge-text font-semibold">AI 서비스</h3>
              <p className="text-sm text-forge-muted">API 키, 기본 모델 설정</p>
            </div>
            <span className="ml-auto text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('messenger')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">💬</span>
            <div>
              <h3 className="text-forge-text font-semibold">메신저</h3>
              <p className="text-sm text-forge-muted">채널 연결, 그룹 설정</p>
            </div>
            <span className="ml-auto text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('features')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🔧</span>
            <div>
              <h3 className="text-forge-text font-semibold">기능</h3>
              <p className="text-sm text-forge-muted">웹검색, 이미지, 음성 등</p>
            </div>
            <span className="ml-auto text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('browser')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🌐</span>
            <div>
              <h3 className="text-forge-text font-semibold">브라우저 릴레이</h3>
              <p className="text-sm text-forge-muted">Chrome 브라우저 제어 연결</p>
            </div>
            <span className="ml-auto text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('summary')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">📋</span>
            <div>
              <h3 className="text-forge-text font-semibold">설정 Summary</h3>
              <p className="text-sm text-forge-muted">현재 설정 확인 및 적용</p>
            </div>
            <span className="ml-auto text-forge-muted">→</span>
          </button>
        </div>
      </div>
    )
  }

  // AI 서비스 설정
  if (step === 'ai') {
    return (
      <ModelSetup
        initialConfig={config.model}
        onComplete={handleModelUpdate}
        onBack={handleBack}
        onGoToDashboard={!isOnboarding ? onCancel : undefined}
      />
    )
  }

  // 메신저 설정
  if (step === 'messenger') {
    return (
      <MessengerSelect
        initialConfig={config.messenger}
        onComplete={handleMessengerComplete}
        onBack={handleBack}
      />
    )
  }

  // 기능 설정 (Integrations)
  if (step === 'features') {
    return (
      <Integrations
        initialValues={config.integrations}
        onUpdate={handleIntegrationsUpdate}
        onComplete={() => setStep('browser')}
        onSkip={() => setStep('browser')}
        onBack={handleBack}
      />
    )
  }

  // 브라우저 릴레이
  if (step === 'browser') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* 뒤로가기 + 대시보드 버튼 */}
        <div className="p-6 flex items-center justify-between">
          <button onClick={handleBack} className="text-forge-muted hover:text-forge-text">
            ← 뒤로
          </button>
          {!isOnboarding && onCancel && (
            <button onClick={onCancel} className="text-forge-muted hover:text-forge-text text-sm">
              🏠 대시보드
            </button>
          )}
        </div>
        
        {/* 크롬 안내 추가 */}
        <div className="px-6 mb-4">
          <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-forge-text font-medium mb-1">Chrome 브라우저가 필요합니다</p>
                <p className="text-forge-muted text-sm">
                  브라우저 릴레이는 <strong>Chrome 브라우저</strong>를 기본으로 사용합니다. 
                  Chrome이 설치되어 있지 않다면 먼저 설치해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <BrowserControl
          onNext={() => setStep('summary')}
          onBack={handleBack}
        />
      </div>
    )
  }

  // Summary
  if (step === 'summary') {
    return (
      <div className="min-h-screen flex flex-col p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleBack} className="text-forge-muted hover:text-forge-text">
            ← 뒤로
          </button>
          {!isOnboarding && onCancel && (
            <button onClick={onCancel} className="text-forge-muted hover:text-forge-text text-sm">
              🏠 대시보드
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-2xl font-bold text-forge-text mb-2">설정 확인</h2>
              <p className="text-forge-muted">아래 설정으로 진행합니다</p>
            </div>

            {/* 설정 요약 */}
            <div className="space-y-4 mb-8">
              {/* AI 모델 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">AI 모델</span>
                  <button onClick={() => setStep('ai')} className="text-xs text-forge-copper">수정</button>
                </div>
                {config.model ? (
                  <div>
                    <p className="text-forge-text font-medium">{config.model.model}</p>
                    <p className="text-sm text-forge-muted">{config.model.provider} · API 키 설정됨</p>
                  </div>
                ) : (
                  <p className="text-forge-error">⚠️ 설정 필요</p>
                )}
              </div>

              {/* 메신저 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">메신저</span>
                  <button onClick={() => setStep('messenger')} className="text-xs text-forge-copper">수정</button>
                </div>
                {config.messenger.type ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {config.messenger.type === 'telegram' ? '✈️' : 
                       config.messenger.type === 'discord' ? '🎮' : '💚'}
                    </span>
                    <div>
                      <p className="text-forge-text font-medium capitalize">{config.messenger.type}</p>
                      <p className="text-sm text-forge-muted">DM: {config.messenger.dmPolicy}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-forge-error">⚠️ 선택 필요</p>
                )}
              </div>

              {/* 외부 서비스 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">외부 서비스</span>
                  <button onClick={() => setStep('features')} className="text-xs text-forge-copper">수정</button>
                </div>
                {Object.keys(config.integrations).filter(k => config.integrations[k]?.length > 0).length > 0 ? (
                  <p className="text-forge-text">
                    {Object.keys(config.integrations).filter(k => config.integrations[k]?.length > 0).length}개 서비스 설정됨
                  </p>
                ) : (
                  <p className="text-forge-muted">설정된 서비스 없음 (선택사항)</p>
                )}
              </div>
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={() => setStep('connect')}
              disabled={!config.model || !config.messenger.type}
              className="w-full py-4 btn-primary rounded-xl disabled:opacity-50"
            >
              다음: 연결 설정 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Connect (최종 설정 적용)
  if (step === 'connect' && config.messenger.type) {
    return (
      <Connect
        config={config}
        onMessengerConfigUpdate={handleMessengerConfigUpdate}
        onGatewayConfigUpdate={handleGatewayConfigUpdate}
        onComplete={onComplete}
        onBack={handleBack}
      />
    )
  }

  return null
}
