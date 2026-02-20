import { useState } from 'react'
import Loading from './components/Loading'
import ExpiredScreen from './components/ExpiredScreen'
import Sidebar, { type Page } from './components/Sidebar'
import DashboardNew from './components/DashboardNew'
import Notifications from './components/Notifications'
import Files from './components/Files'
import Logs from './components/Logs'
import Settings from './components/Settings'
import { useAppStatus } from './hooks/useAppStatus'

type AppState = 'loading' | 'onboarding' | 'main' | 'settings'
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
  allowFrom: string[]
  groupPolicy: string
  groupAllowFrom: string[]
  requireMention: boolean
}

export interface GatewayConfig {
  port: number
  bind: string
  authMode: string
  token: string
  password: string
}

export interface IntegrationConfig {
  [key: string]: string
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
  const [appState, setAppState] = useState<AppState>('loading')
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [config] = useState<FullConfig>(initialConfig)
  const { appStatus, loading: statusLoading } = useAppStatus()

  // 앱 상태 체크 (테스트 종료 여부)
  if (statusLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-forge-text">상태 확인 중...</div>
      </div>
    )
  }

  if (appStatus?.status === 'expired') {
    return <ExpiredScreen message={appStatus.message} />
  }

  // 로딩 화면
  if (appState === 'loading') {
    return (
      <Loading
        onReady={() => setAppState('onboarding')}
        onDashboard={() => setAppState('main')}
      />
    )
  }

  // 온보딩 (첫 실행 설정)
  if (appState === 'onboarding') {
    return (
      <div className="gradient-bg min-h-screen">
        <Settings
          isOnboarding={true}
          initialConfig={config}
          onComplete={() => setAppState('main')}
          // onCancel 없음 - 온보딩 중에는 대시보드로 이동 불가
        />
      </div>
    )
  }

  // 설정 화면 (메인에서 진입)
  if (appState === 'settings') {
    return (
      <div className="gradient-bg min-h-screen">
        <Settings
          isOnboarding={false}
          initialConfig={config}
          onComplete={() => setAppState('main')}
          onCancel={() => setAppState('main')}
        />
      </div>
    )
  }

  // 메인 레이아웃 (사이드바 + 컨텐츠)
  return (
    <div className="gradient-bg min-h-screen flex">
      {/* 사이드바 */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onSettings={() => setAppState('settings')}
      />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && (
          <DashboardNew onSettings={() => setAppState('settings')} />
        )}
        {currentPage === 'notifications' && <Notifications />}
        {currentPage === 'files' && <Files />}
        {currentPage === 'logs' && <Logs />}
      </main>
    </div>
  )
}

export default App
