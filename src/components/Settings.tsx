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

const defaultConfig: FullConfig = {
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

// 설정 비교 함수들
function isModelChanged(original: ModelConfig | null, current: ModelConfig | null): boolean {
  if (!original && !current) return false
  if (!original || !current) return true
  return original.provider !== current.provider || 
         original.model !== current.model || 
         original.apiKey !== current.apiKey
}

function isMessengerChanged(original: MessengerConfig, current: MessengerConfig): boolean {
  return original.type !== current.type ||
         original.token !== current.token ||
         original.dmPolicy !== current.dmPolicy ||
         original.groupPolicy !== current.groupPolicy ||
         original.requireMention !== current.requireMention ||
         JSON.stringify(original.allowFrom) !== JSON.stringify(current.allowFrom)
}

function isIntegrationsChanged(original: IntegrationConfig, current: IntegrationConfig): boolean {
  return JSON.stringify(original) !== JSON.stringify(current)
}

export default function Settings({ isOnboarding, initialConfig: propConfig, onComplete, onCancel }: SettingsProps) {
  const [step, setStep] = useState<SettingsStep>(isOnboarding ? 'ai' : 'menu')
  const [config, setConfig] = useState<FullConfig>(propConfig || defaultConfig)
  
  // 원본 config (변경 비교용) - 재설정 시에만 사용
  const [originalConfig] = useState<FullConfig>(propConfig || defaultConfig)
  
  // Summary에서 수정 시 true, 메뉴에서 직접 접근도 재설정이면 true
  const [editMode, setEditMode] = useState(false)

  // 재설정 모드인지 (첫 실행이 아닐 때)
  const isReconfigureMode = !isOnboarding

  // 메뉴에서 설정 페이지로 이동할 때 editMode 활성화 (재설정 모드)
  const handleGoToStep = (targetStep: SettingsStep) => {
    if (isReconfigureMode) {
      setEditMode(true)
    }
    setStep(targetStep)
  }

  // Summary에서 수정 버튼 클릭 시
  const handleEditFromSummary = (targetStep: SettingsStep) => {
    setEditMode(true)
    setStep(targetStep)
  }

  // 설정 완료 후 Summary로 돌아가기 (editMode일 때)
  const handleConfirmAndReturn = () => {
    setEditMode(false)
    setStep('summary')
  }

  // 취소하고 Summary로 돌아가기 (변경 취소)
  const handleCancelEdit = () => {
    // 현재 편집 중인 항목만 원본으로 복원할 수도 있지만,
    // 여기서는 단순히 Summary로 돌아감 (이미 config는 변경됨)
    // 완전한 취소를 원하면 originalConfig에서 복원 필요
    setEditMode(false)
    setStep('summary')
  }

  // 설정 업데이트 핸들러들 - editMode일 때 바로 Summary로
  const handleModelUpdate = (modelConfig: ModelConfig) => {
    setConfig(prev => ({ ...prev, model: modelConfig }))
    if (editMode) {
      handleConfirmAndReturn()
    } else {
      setStep('messenger')
    }
  }

  const handleMessengerComplete = (messengerConfig: MessengerConfig) => {
    setConfig(prev => ({ ...prev, messenger: messengerConfig }))
    if (editMode) {
      handleConfirmAndReturn()
    } else {
      setStep('features')
    }
  }

  const handleIntegrationsComplete = () => {
    if (editMode) {
      handleConfirmAndReturn()
    } else {
      setStep('browser')
    }
  }

  const handleBrowserComplete = () => {
    if (editMode) {
      handleConfirmAndReturn()
    } else {
      setStep('summary')
    }
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

  // 뒤로가기 - editMode일 때는 Summary로
  const handleBack = () => {
    if (editMode) {
      handleCancelEdit()
      return
    }

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
        if (isOnboarding) {
          setStep('browser')
        } else {
          setStep('menu')
        }
        break
      case 'connect':
        setStep('summary')
        break
    }
  }

  // 변경 여부 계산
  const modelChanged = isModelChanged(originalConfig.model, config.model)
  const messengerChanged = isMessengerChanged(originalConfig.messenger, config.messenger)
  const integrationsChanged = isIntegrationsChanged(originalConfig.integrations, config.integrations)
  const hasAnyChanges = modelChanged || messengerChanged || integrationsChanged

  // 필수 설정 완료 여부 (첫 실행 시)
  const hasRequiredSettings = config.model && config.messenger.type

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
            onClick={() => handleGoToStep('ai')}
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
            onClick={() => handleGoToStep('messenger')}
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
            onClick={() => handleGoToStep('features')}
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
            onClick={() => handleGoToStep('browser')}
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
              <h3 className="text-forge-text font-semibold">설정 한눈에 보기</h3>
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
        isOnboarding={isOnboarding}
        editMode={editMode}
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
        editMode={editMode}
      />
    )
  }

  // 기능 설정 (Integrations)
  if (step === 'features') {
    return (
      <Integrations
        initialValues={config.integrations}
        onUpdate={handleIntegrationsUpdate}
        onComplete={handleIntegrationsComplete}
        onSkip={handleIntegrationsComplete}
        onBack={handleBack}
        editMode={editMode}
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
            ← {editMode ? '취소' : '뒤로'}
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
                <p className="text-forge-text font-medium mb-1">Chromium 기반 브라우저 필요</p>
                <p className="text-forge-muted text-sm">
                  브라우저 릴레이는 <strong>Chrome 또는 Edge</strong> 브라우저에서 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <BrowserControl
          onNext={handleBrowserComplete}
          onBack={handleBack}
          editMode={editMode}
        />
      </div>
    )
  }

  // Summary - 설정 한눈에 보기
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
              <p className="text-forge-muted">
                {isOnboarding ? '아래 설정으로 진행합니다' : '변경할 항목을 선택하세요'}
              </p>
            </div>

            {/* 설정 요약 */}
            <div className="space-y-4 mb-8">
              {/* AI 모델 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">AI 모델</span>
                  <button onClick={() => handleEditFromSummary('ai')} className="text-xs text-forge-copper hover:underline">수정</button>
                </div>
                {config.model ? (
                  <div>
                    <p className="text-forge-text font-medium">{config.model.model}</p>
                    <p className="text-sm text-forge-muted">
                      {config.model.provider} · API 키 설정됨
                      {isReconfigureMode && !modelChanged && (
                        <span className="ml-2 text-forge-success">✓ 변경 없음</span>
                      )}
                      {isReconfigureMode && modelChanged && (
                        <span className="ml-2 text-forge-copper">● 변경됨</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-forge-error">
                    {isOnboarding ? '⚠️ 설정 필요' : '⚠️ 설정되지 않음'}
                  </p>
                )}
              </div>

              {/* 메신저 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">메신저</span>
                  <button onClick={() => handleEditFromSummary('messenger')} className="text-xs text-forge-copper hover:underline">수정</button>
                </div>
                {config.messenger.type ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {config.messenger.type === 'telegram' ? '✈️' : 
                       config.messenger.type === 'discord' ? '🎮' : '💚'}
                    </span>
                    <div>
                      <p className="text-forge-text font-medium capitalize">{config.messenger.type}</p>
                      <p className="text-sm text-forge-muted">
                        DM: {config.messenger.dmPolicy}
                        {isReconfigureMode && !messengerChanged && (
                          <span className="ml-2 text-forge-success">✓ 변경 없음</span>
                        )}
                        {isReconfigureMode && messengerChanged && (
                          <span className="ml-2 text-forge-copper">● 변경됨</span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-forge-error">
                    {isOnboarding ? '⚠️ 선택 필요' : '⚠️ 설정되지 않음'}
                  </p>
                )}
              </div>

              {/* 외부 서비스 */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-forge-muted">외부 서비스</span>
                  <button onClick={() => handleEditFromSummary('features')} className="text-xs text-forge-copper hover:underline">수정</button>
                </div>
                {Object.keys(config.integrations).filter(k => config.integrations[k]?.length > 0).length > 0 ? (
                  <p className="text-forge-text">
                    {Object.keys(config.integrations).filter(k => config.integrations[k]?.length > 0).length}개 서비스 설정됨
                    {isReconfigureMode && !integrationsChanged && (
                      <span className="ml-2 text-forge-success">✓ 변경 없음</span>
                    )}
                    {isReconfigureMode && integrationsChanged && (
                      <span className="ml-2 text-forge-copper">● 변경됨</span>
                    )}
                  </p>
                ) : (
                  <p className="text-forge-muted">
                    설정된 서비스 없음 (선택사항)
                    {isReconfigureMode && !integrationsChanged && (
                      <span className="ml-2 text-forge-success">✓ 변경 없음</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* 변경 요약 (재설정 모드) */}
            {isReconfigureMode && (
              <div className="mb-6 text-center">
                {hasAnyChanges ? (
                  <p className="text-forge-copper text-sm">
                    ● 변경된 항목이 있습니다. 저장하면 Gateway가 재시작됩니다.
                  </p>
                ) : (
                  <p className="text-forge-success text-sm">
                    ✓ 변경된 항목이 없습니다.
                  </p>
                )}
              </div>
            )}

            {/* 다음 버튼 */}
            <button
              onClick={() => setStep('connect')}
              disabled={isOnboarding && !hasRequiredSettings}
              className="w-full py-4 btn-primary rounded-xl disabled:opacity-50"
            >
              {isOnboarding ? (
                '다음: 연결 설정 →'
              ) : hasAnyChanges ? (
                '저장 및 Gateway 재시작 →'
              ) : (
                '연결 상태 확인 →'
              )}
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
        originalConfig={isReconfigureMode ? originalConfig : undefined}
        hasChanges={hasAnyChanges}
        onMessengerConfigUpdate={handleMessengerConfigUpdate}
        onGatewayConfigUpdate={handleGatewayConfigUpdate}
        onComplete={onComplete}
        onBack={handleBack}
      />
    )
  }

  return null
}
