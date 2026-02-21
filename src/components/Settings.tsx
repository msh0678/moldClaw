import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
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

// Summary에서 표시할 현재 설정 정보
interface CurrentConfig {
  model: { provider: string; model: string; hasApiKey: boolean } | null
  messenger: { type: string; hasToken: boolean; isLinked?: boolean; dmPolicy: string } | null
  integrations: Record<string, string>
}

const defaultFullConfig: FullConfig = {
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

export default function Settings({ isOnboarding, initialConfig, onComplete, onCancel }: SettingsProps) {
  const [step, setStep] = useState<SettingsStep>(isOnboarding ? 'ai' : 'menu')
  
  // 온보딩용 임시 config (첫 실행 시에만 사용)
  const [onboardConfig, setOnboardConfig] = useState<FullConfig>(initialConfig || defaultFullConfig)
  
  // Summary 표시용 현재 설정 (재설정 시 config에서 직접 로드)
  const [currentConfig, setCurrentConfig] = useState<CurrentConfig>({
    model: null,
    messenger: null,
    integrations: {},
  })
  const [configLoading, setConfigLoading] = useState(false)

  // Summary로 이동할 때 현재 config 로드
  useEffect(() => {
    if (step === 'summary' || step === 'menu') {
      loadCurrentConfig()
    }
  }, [step])

  const loadCurrentConfig = async () => {
    setConfigLoading(true)
    try {
      const [model, messenger, integrations] = await Promise.all([
        invoke<CurrentConfig['model']>('get_model_config'),
        invoke<CurrentConfig['messenger']>('get_messenger_config'),
        invoke<CurrentConfig['integrations']>('get_integrations_config'),
      ])
      setCurrentConfig({ model, messenger, integrations })
    } catch (err) {
      console.error('Config 로드 실패:', err)
    } finally {
      setConfigLoading(false)
    }
  }

  // === 온보딩 (첫 실행) 핸들러들 ===
  
  const handleOnboardModelComplete = (modelConfig: ModelConfig) => {
    setOnboardConfig(prev => ({ ...prev, model: modelConfig }))
    setStep('messenger')
  }

  const handleOnboardMessengerComplete = (messengerConfig: MessengerConfig) => {
    setOnboardConfig(prev => ({ ...prev, messenger: messengerConfig }))
    setStep('features')
  }

  const handleOnboardIntegrationsComplete = () => {
    setStep('browser')
  }

  const handleOnboardBrowserComplete = () => {
    setStep('summary')
  }

  const handleOnboardIntegrationsUpdate = (integrations: IntegrationConfig) => {
    setOnboardConfig(prev => ({ ...prev, integrations: { ...prev.integrations, ...integrations } }))
  }

  // === 재설정 핸들러들 ===
  
  // 각 설정 페이지에서 [확인] 클릭 시 → Summary로 복귀
  const handleEditComplete = () => {
    setStep('summary')
  }

  // 뒤로가기
  const handleBack = () => {
    if (isOnboarding) {
      // 온보딩 플로우
      switch (step) {
        case 'messenger': setStep('ai'); break
        case 'features': setStep('messenger'); break
        case 'browser': setStep('features'); break
        case 'summary': setStep('browser'); break
        case 'connect': setStep('summary'); break
      }
    } else {
      // 재설정 모드 - 항상 menu 또는 summary로
      if (step === 'connect') {
        setStep('summary')
      } else {
        setStep('menu')
      }
    }
  }

  // Connect용 config 업데이트 핸들러
  const handleMessengerConfigUpdate = (messengerConfig: Partial<MessengerConfig>) => {
    setOnboardConfig(prev => ({ ...prev, messenger: { ...prev.messenger, ...messengerConfig } }))
  }

  const handleGatewayConfigUpdate = (gatewayConfig: Partial<GatewayConfig>) => {
    setOnboardConfig(prev => ({ ...prev, gateway: { ...prev.gateway, ...gatewayConfig } }))
  }

  // 메뉴 화면 (재설정 모드)
  if (step === 'menu') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-forge-text mb-1">⚙️ 설정</h1>
            <p className="text-forge-muted">OpenClaw 설정을 변경합니다.</p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg">
              ← 대시보드
            </button>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setStep('ai')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🤖</span>
            <div className="flex-1">
              <h3 className="text-forge-text font-semibold">AI 서비스</h3>
              <p className="text-sm text-forge-muted">
                {currentConfig.model 
                  ? `${currentConfig.model.provider}/${currentConfig.model.model}`
                  : '설정되지 않음'}
              </p>
            </div>
            <span className="text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('messenger')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">💬</span>
            <div className="flex-1">
              <h3 className="text-forge-text font-semibold">메신저</h3>
              <p className="text-sm text-forge-muted">
                {currentConfig.messenger 
                  ? `${currentConfig.messenger.type} · DM: ${currentConfig.messenger.dmPolicy}`
                  : '설정되지 않음'}
              </p>
            </div>
            <span className="text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('features')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🔧</span>
            <div className="flex-1">
              <h3 className="text-forge-text font-semibold">기능</h3>
              <p className="text-sm text-forge-muted">
                {Object.keys(currentConfig.integrations).filter(k => currentConfig.integrations[k]).length > 0
                  ? `${Object.keys(currentConfig.integrations).filter(k => currentConfig.integrations[k]).length}개 서비스`
                  : '설정된 서비스 없음'}
              </p>
            </div>
            <span className="text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('browser')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">🌐</span>
            <div className="flex-1">
              <h3 className="text-forge-text font-semibold">브라우저 릴레이</h3>
              <p className="text-sm text-forge-muted">Chrome 브라우저 제어 연결</p>
            </div>
            <span className="text-forge-muted">→</span>
          </button>

          <button
            onClick={() => setStep('summary')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-3xl">📋</span>
            <div className="flex-1">
              <h3 className="text-forge-text font-semibold">설정 한눈에 보기</h3>
              <p className="text-sm text-forge-muted">현재 설정 확인 및 Gateway 재시작</p>
            </div>
            <span className="text-forge-muted">→</span>
          </button>
        </div>
      </div>
    )
  }

  // AI 서비스 설정
  if (step === 'ai') {
    return (
      <ModelSetup
        initialConfig={isOnboarding ? onboardConfig.model : null}  // 재설정 시 null → 컴포넌트에서 직접 로드
        onComplete={isOnboarding ? handleOnboardModelComplete : handleEditComplete}
        onBack={handleBack}
        onGoToDashboard={!isOnboarding ? onCancel : undefined}
        isOnboarding={isOnboarding}
        editMode={!isOnboarding}
      />
    )
  }

  // 메신저 설정
  if (step === 'messenger') {
    return (
      <MessengerSelect
        initialConfig={isOnboarding ? onboardConfig.messenger : null}  // 재설정 시 null → 컴포넌트에서 직접 로드
        onComplete={isOnboarding ? handleOnboardMessengerComplete : handleEditComplete}
        onBack={handleBack}
        editMode={!isOnboarding}
      />
    )
  }

  // 기능 설정 (Integrations)
  if (step === 'features') {
    return (
      <Integrations
        initialValues={isOnboarding ? onboardConfig.integrations : null}  // 재설정 시 null → 컴포넌트에서 직접 로드
        onUpdate={isOnboarding ? handleOnboardIntegrationsUpdate : undefined}
        onComplete={isOnboarding ? handleOnboardIntegrationsComplete : handleEditComplete}
        onSkip={isOnboarding ? handleOnboardIntegrationsComplete : handleEditComplete}
        onBack={handleBack}
        editMode={!isOnboarding}
      />
    )
  }

  // 브라우저 릴레이
  if (step === 'browser') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <button onClick={handleBack} className="text-forge-muted hover:text-forge-text">
            ← {isOnboarding ? '뒤로' : '취소'}
          </button>
          {!isOnboarding && onCancel && (
            <button onClick={onCancel} className="text-forge-muted hover:text-forge-text text-sm">
              🏠 대시보드
            </button>
          )}
        </div>
        
        <div className="px-6 mb-4">
          <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-forge-text font-medium mb-1">Chromium 기반 브라우저 필요</p>
                <p className="text-forge-muted text-sm">
                  브라우저 릴레이는 <strong>Chrome 또는 Edge</strong> 브라우저에서 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <BrowserControl
          onNext={isOnboarding ? handleOnboardBrowserComplete : handleEditComplete}
          onBack={handleBack}
          editMode={!isOnboarding}
        />
      </div>
    )
  }

  // Summary - 설정 한눈에 보기
  if (step === 'summary') {
    const hasRequiredSettings = currentConfig.model && currentConfig.messenger

    return (
      <div className="min-h-screen flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleBack} className="text-forge-muted hover:text-forge-text">
            ← {isOnboarding ? '뒤로' : '메뉴'}
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
              <p className="text-forge-muted">
                {isOnboarding ? '아래 설정으로 진행합니다' : '현재 설정 상태입니다'}
              </p>
            </div>

            {configLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
                <p className="text-forge-muted">설정 로드 중...</p>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {/* AI 모델 */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-forge-muted">AI 모델</span>
                    <button onClick={() => setStep('ai')} className="text-xs text-forge-copper hover:underline">
                      수정
                    </button>
                  </div>
                  {currentConfig.model ? (
                    <div>
                      <p className="text-forge-text font-medium">{currentConfig.model.model}</p>
                      <p className="text-sm text-forge-muted">
                        {currentConfig.model.provider} · API 키 {currentConfig.model.hasApiKey ? '설정됨' : '없음'}
                      </p>
                    </div>
                  ) : isOnboarding && onboardConfig.model ? (
                    <div>
                      <p className="text-forge-text font-medium">{onboardConfig.model.model}</p>
                      <p className="text-sm text-forge-muted">{onboardConfig.model.provider}</p>
                    </div>
                  ) : (
                    <p className="text-forge-error">⚠️ 설정 필요</p>
                  )}
                </div>

                {/* 메신저 */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-forge-muted">메신저</span>
                    <button onClick={() => setStep('messenger')} className="text-xs text-forge-copper hover:underline">
                      수정
                    </button>
                  </div>
                  {currentConfig.messenger ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {currentConfig.messenger.type === 'telegram' ? '✈️' : 
                         currentConfig.messenger.type === 'discord' ? '🎮' : '💚'}
                      </span>
                      <div>
                        <p className="text-forge-text font-medium capitalize">{currentConfig.messenger.type}</p>
                        <p className="text-sm text-forge-muted">DM: {currentConfig.messenger.dmPolicy}</p>
                      </div>
                    </div>
                  ) : isOnboarding && onboardConfig.messenger.type ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {onboardConfig.messenger.type === 'telegram' ? '✈️' : 
                         onboardConfig.messenger.type === 'discord' ? '🎮' : '💚'}
                      </span>
                      <div>
                        <p className="text-forge-text font-medium capitalize">{onboardConfig.messenger.type}</p>
                        <p className="text-sm text-forge-muted">DM: {onboardConfig.messenger.dmPolicy}</p>
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
                    <button onClick={() => setStep('features')} className="text-xs text-forge-copper hover:underline">
                      수정
                    </button>
                  </div>
                  {Object.keys(currentConfig.integrations).filter(k => currentConfig.integrations[k]).length > 0 ? (
                    <p className="text-forge-text">
                      {Object.keys(currentConfig.integrations).filter(k => currentConfig.integrations[k]).length}개 서비스 설정됨
                    </p>
                  ) : isOnboarding && Object.keys(onboardConfig.integrations).filter(k => onboardConfig.integrations[k]).length > 0 ? (
                    <p className="text-forge-text">
                      {Object.keys(onboardConfig.integrations).filter(k => onboardConfig.integrations[k]).length}개 서비스 설정됨
                    </p>
                  ) : (
                    <p className="text-forge-muted">설정된 서비스 없음 (선택사항)</p>
                  )}
                </div>
              </div>
            )}

            {/* 다음 버튼 */}
            <button
              onClick={() => setStep('connect')}
              disabled={isOnboarding && !hasRequiredSettings && !onboardConfig.model}
              className="w-full py-4 btn-primary rounded-xl disabled:opacity-50"
            >
              {isOnboarding ? '다음: 연결 설정 →' : 'Gateway 재시작 →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Connect (최종 설정 적용)
  if (step === 'connect') {
    // 온보딩 모드일 때만 config 전달
    const configForConnect = isOnboarding ? onboardConfig : {
      ...defaultFullConfig,
      messenger: currentConfig.messenger ? {
        ...defaultFullConfig.messenger,
        type: currentConfig.messenger.type as 'telegram' | 'discord' | 'whatsapp',
        dmPolicy: currentConfig.messenger.dmPolicy,
      } : defaultFullConfig.messenger,
    }

    if (!configForConnect.messenger.type && !currentConfig.messenger) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-forge-text mb-2">메신저가 설정되지 않았습니다</h2>
            <p className="text-forge-muted mb-6">연결하려면 먼저 메신저를 설정해주세요.</p>
            <button onClick={handleBack} className="px-6 py-3 btn-primary rounded-xl">
              ← 돌아가기
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <Connect
        config={configForConnect}
        originalConfig={undefined}
        hasChanges={true}  // 재설정 모드에서는 항상 변경으로 처리
        onMessengerConfigUpdate={handleMessengerConfigUpdate}
        onGatewayConfigUpdate={handleGatewayConfigUpdate}
        onComplete={onComplete}
        onBack={handleBack}
      />
    )
  }

  return null
}
