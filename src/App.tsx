import { useState } from 'react'
import Welcome from './components/Welcome'
import ModelSetup from './components/ModelSetup'
import MessengerSelect from './components/MessengerSelect'
import Integrations from './components/Integrations'
import Connect from './components/Connect'
import Summary from './components/Summary'
import Loading from './components/Loading'
import Dashboard from './components/Dashboard'
import ExpiredScreen from './components/ExpiredScreen'
import { BrowserControl } from './pages/BrowserControl'
import { useAppStatus } from './hooks/useAppStatus'

type Step = 'loading' | 'dashboard' | 'welcome' | 'model' | 'messenger' | 'integrations' | 'browsercontrol' | 'summary' | 'connect'
type Messenger = 'telegram' | 'discord' | 'whatsapp' | null

export interface ModelConfig {
  provider: string
  model: string
  apiKey: string
}

export interface MessengerConfig {
  type: Messenger
  token: string
  dmPolicy: string
  allowFrom: string[]           // 허용 사용자 목록
  groupPolicy: string           // 그룹 정책: open | allowlist | disabled
  groupAllowFrom: string[]      // 그룹 허용 사용자 목록
  requireMention: boolean       // 그룹에서 멘션 필요 여부
}

export interface GatewayConfig {
  port: number
  bind: string                  // loopback | lan | tailnet | auto | custom
  authMode: string              // token | password
  token: string
  password: string
}

export interface IntegrationConfig {
  [key: string]: string  // envVar -> value
}

export interface FullConfig {
  model: ModelConfig | null
  messenger: MessengerConfig
  gateway: GatewayConfig
  integrations: IntegrationConfig
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

function App() {
  const [step, setStep] = useState<Step>('loading')
  const [config, setConfig] = useState<FullConfig>(initialConfig)
  const { appStatus, loading: statusLoading } = useAppStatus()

  // 앱 상태 체크 (테스트 종료 여부)
  if (statusLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-white">상태 확인 중...</div>
      </div>
    )
  }

  if (appStatus?.status === 'expired') {
    return <ExpiredScreen message={appStatus.message} />
  }

  // 모델 설정 업데이트 (메모리만)
  const handleModelUpdate = (modelConfig: ModelConfig) => {
    setConfig(prev => ({ ...prev, model: modelConfig }))
    setStep('messenger')
  }

  // 메신저 설정 업데이트 (타입 + 토큰 포함)
  const handleMessengerComplete = (messengerConfig: MessengerConfig) => {
    setConfig(prev => ({
      ...prev,
      messenger: messengerConfig,
    }))
    setStep('integrations')
  }

  // 메신저 상세 설정 업데이트 (메모리만)
  const handleMessengerConfigUpdate = (messengerConfig: Partial<MessengerConfig>) => {
    setConfig(prev => ({
      ...prev,
      messenger: { ...prev.messenger, ...messengerConfig },
    }))
  }

  // Gateway 설정 업데이트 (메모리만)
  const handleGatewayConfigUpdate = (gatewayConfig: Partial<GatewayConfig>) => {
    setConfig(prev => ({
      ...prev,
      gateway: { ...prev.gateway, ...gatewayConfig },
    }))
  }

  // 통합 설정 일괄 업데이트 (메모리만)
  const handleIntegrationsUpdate = (integrations: IntegrationConfig) => {
    setConfig(prev => ({
      ...prev,
      integrations: { ...prev.integrations, ...integrations },
    }))
  }

  // 뒤로가기 핸들러
  const handleBack = () => {
    switch (step) {
      case 'model':
        setStep('welcome')
        break
      case 'messenger':
        setStep('model')
        break
      case 'integrations':
        setStep('messenger')
        break
      case 'browsercontrol':
        setStep('integrations')
        break
      case 'summary':
        setStep('browsercontrol')
        break
      case 'connect':
        setStep('summary')
        break
    }
  }

  // 관리센터로 돌아가기 핸들러
  const handleGoToDashboard = () => {
    setStep('dashboard')
  }

  return (
    <div className="gradient-bg min-h-screen">
      {step === 'loading' && (
        <Loading 
          onReady={() => setStep('welcome')} 
          onDashboard={() => setStep('dashboard')}
        />
      )}
      
      {step === 'dashboard' && (
        <Dashboard onStartOnboarding={() => setStep('welcome')} />
      )}
      
      {step === 'welcome' && (
        <Welcome 
          onComplete={() => setStep('model')}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
      
      {step === 'model' && (
        <ModelSetup 
          initialConfig={config.model}
          onComplete={handleModelUpdate}
          onBack={handleBack}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
      
      {step === 'messenger' && (
        <MessengerSelect 
          initialConfig={config.messenger}
          onComplete={handleMessengerComplete}
          onBack={handleBack}
        />
      )}
      
      {step === 'integrations' && (
        <Integrations
          initialValues={config.integrations}
          onUpdate={handleIntegrationsUpdate}
          onComplete={() => setStep('browsercontrol')}
          onSkip={() => setStep('browsercontrol')}
          onBack={handleBack}
        />
      )}
      
      {step === 'browsercontrol' && (
        <BrowserControl
          onNext={() => setStep('summary')}
          onBack={handleBack}
        />
      )}
      
      {step === 'summary' && (
        <Summary
          config={config}
          onConfirm={() => setStep('connect')}
          onEdit={(target) => setStep(target as Step)}
          onBack={handleBack}
        />
      )}
      
      {step === 'connect' && config.messenger.type && (
        <Connect 
          config={config}
          onMessengerConfigUpdate={handleMessengerConfigUpdate}
          onGatewayConfigUpdate={handleGatewayConfigUpdate}
          onComplete={() => setStep('dashboard')}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
