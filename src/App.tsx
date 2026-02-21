import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
type UninstallState = 'idle' | 'uninstalling' | 'waitingForClose' | 'error'
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
  const [config, setConfig] = useState<FullConfig>(initialConfig)
  const [expiredAcknowledged, setExpiredAcknowledged] = useState(false)
  const [uninstallState, setUninstallState] = useState<UninstallState>('idle')
  const [uninstallError, setUninstallError] = useState<string | null>(null)
  const { appStatus, loading: statusLoading } = useAppStatus()

  // 실제 config 로드
  const loadConfig = useCallback(async () => {
    try {
      const result = await invoke<FullConfig>('get_full_config')
      if (result) {
        // 기본값과 병합 (누락된 필드 대비)
        setConfig(prev => ({
          ...prev,
          model: result.model || prev.model,
          messenger: {
            ...prev.messenger,
            type: result.messenger?.type || prev.messenger.type,
            token: result.messenger?.token || prev.messenger.token,
            dmPolicy: result.messenger?.dmPolicy || prev.messenger.dmPolicy,
            allowFrom: result.messenger?.allowFrom || prev.messenger.allowFrom,
            groupPolicy: result.messenger?.groupPolicy || prev.messenger.groupPolicy,
            groupAllowFrom: result.messenger?.groupAllowFrom || prev.messenger.groupAllowFrom,
            requireMention: result.messenger?.requireMention ?? prev.messenger.requireMention,
          },
          gateway: {
            ...prev.gateway,
            port: result.gateway?.port || prev.gateway.port,
            bind: result.gateway?.bind || prev.gateway.bind,
            authMode: result.gateway?.authMode || prev.gateway.authMode,
          },
          integrations: result.integrations || prev.integrations,
        }))
      }
    } catch (err) {
      console.error('Config 로드 실패:', err)
    }
  }, [])

  // 앱 상태 변경 시 config 새로고침
  useEffect(() => {
    if (appState === 'settings' || appState === 'main') {
      loadConfig()
    }
  }, [appState, loadConfig])

  // 삭제 시작
  const handleStartUninstall = async () => {
    const confirmed = window.confirm(
      'moldClaw와 OpenClaw를 모두 삭제하시겠습니까?\n\n' +
      '• OpenClaw 프로그램 및 설정 파일이 삭제됩니다\n' +
      '• API 키가 포함된 설정도 삭제됩니다\n' +
      '• moldClaw 앱도 함께 삭제됩니다\n\n' +
      '이 작업은 되돌릴 수 없습니다.'
    )
    if (!confirmed) return

    setUninstallState('uninstalling')
    setUninstallError(null)

    try {
      // 1. OpenClaw 삭제
      await invoke<string>('uninstall_openclaw')
      
      // 2. moldClaw 삭제
      await invoke('uninstall_moldclaw')
      
      // uninstaller가 실행되면 앱이 종료됨
    } catch (err) {
      const errorMsg = String(err)
      
      // 파일 잠금 에러 감지
      if (errorMsg.includes('EBUSY') || errorMsg.includes('being used') || 
          errorMsg.includes('access') || errorMsg.includes('locked') ||
          errorMsg.includes('삭제') || errorMsg.includes('실패')) {
        setUninstallState('waitingForClose')
        setUninstallError(errorMsg)
      } else {
        setUninstallState('error')
        setUninstallError(errorMsg)
      }
    }
  }

  // 파일 닫기 완료 후 재시도
  const handleRetryUninstall = async () => {
    setUninstallState('uninstalling')
    setUninstallError(null)

    try {
      await invoke<string>('uninstall_openclaw')
      await invoke('uninstall_moldclaw')
    } catch (err) {
      setUninstallState('error')
      setUninstallError(String(err))
    }
  }

  // 삭제 취소
  const handleCancelUninstall = () => {
    setUninstallState('idle')
    setUninstallError(null)
  }

  // 앱 상태 체크 (테스트 종료 여부)
  if (statusLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-forge-text">상태 확인 중...</div>
      </div>
    )
  }

  if (appStatus?.status === 'expired' && !expiredAcknowledged) {
    return (
      <ExpiredScreen 
        message={appStatus.message} 
        onContinue={() => setExpiredAcknowledged(true)}
      />
    )
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

  // 삭제 진행 중 - 전체 화면 오버레이
  if (uninstallState !== 'idle') {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* 삭제 진행 중 */}
          {uninstallState === 'uninstalling' && (
            <>
              <div className="text-5xl mb-6 animate-spin">⚙️</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">삭제 진행 중</h2>
              <p className="text-forge-muted">
                OpenClaw 삭제 중... 잠시 기다리시면 moldClaw 삭제가 진행됩니다.
              </p>
            </>
          )}

          {/* 파일 닫기 요청 */}
          {uninstallState === 'waitingForClose' && (
            <>
              <div className="text-5xl mb-6">⚠️</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">파일 사용 중</h2>
              <div className="card p-4 mb-6 text-left bg-forge-amber/10 border-forge-amber/30">
                <p className="text-forge-text text-sm mb-3">
                  OpenClaw 관련 파일이 다른 프로그램에서 사용 중입니다.
                </p>
                <p className="text-forge-muted text-sm">
                  다음 항목을 모두 닫아 주세요:
                </p>
                <ul className="text-forge-muted text-sm mt-2 list-disc list-inside">
                  <li>브라우저의 OpenClaw 웹 UI (127.0.0.1:18789)</li>
                  <li>터미널에서 실행 중인 OpenClaw</li>
                  <li>OpenClaw 설정 파일을 열어둔 편집기</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelUninstall}
                  className="flex-1 py-3 rounded-xl bg-forge-surface text-forge-text hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  onClick={handleRetryUninstall}
                  className="flex-1 py-3 rounded-xl btn-primary"
                >
                  완료했습니다, 계속 삭제
                </button>
              </div>
            </>
          )}

          {/* 에러 */}
          {uninstallState === 'error' && (
            <>
              <div className="text-5xl mb-6">❌</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">삭제 실패</h2>
              <div className="card p-4 mb-6 text-left bg-forge-error/10 border-forge-error/30">
                <p className="text-forge-error text-sm">{uninstallError}</p>
              </div>
              <p className="text-forge-muted text-sm mb-6">
                제어판 &gt; 프로그램 제거에서 직접 삭제해 주세요.
              </p>
              <button
                onClick={handleCancelUninstall}
                className="w-full py-3 rounded-xl btn-primary"
              >
                확인
              </button>
            </>
          )}
        </div>
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
          <DashboardNew 
            onSettings={() => setAppState('settings')} 
            onStartUninstall={handleStartUninstall}
          />
        )}
        {currentPage === 'notifications' && <Notifications />}
        {currentPage === 'files' && <Files />}
        {currentPage === 'logs' && <Logs />}
      </main>
    </div>
  )
}

export default App
