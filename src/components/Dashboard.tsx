import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface DashboardProps {
  onStartOnboarding: () => void
}

type GatewayStatus = 'checking' | 'running' | 'stopped' | 'error'

export default function Dashboard({ onStartOnboarding }: DashboardProps) {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('checking')
  const [configSummary, setConfigSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkGatewayStatus()
    loadConfigSummary()
    
    // 5초마다 상태 확인
    const interval = setInterval(checkGatewayStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkGatewayStatus = async () => {
    try {
      const status = await invoke<string>('get_gateway_status')
      setGatewayStatus(status === 'running' ? 'running' : 'stopped')
      setError(null)
    } catch (err) {
      setGatewayStatus('error')
      setError(String(err))
    }
  }

  const loadConfigSummary = async () => {
    try {
      const summary = await invoke<string>('get_config_summary')
      setConfigSummary(summary)
    } catch {
      setConfigSummary('설정 정보를 불러올 수 없습니다')
    }
  }

  const handleStartGateway = async () => {
    setLoading(true)
    setStatusMessage('Gateway 시작 중...')
    setError(null)

    try {
      const result = await invoke<string>('install_and_start_service')
      setStatusMessage(result)
      await checkGatewayStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleStopGateway = async () => {
    setLoading(true)
    setStatusMessage('Gateway 중지 중...')
    setError(null)

    try {
      await invoke('stop_gateway')
      setStatusMessage('Gateway가 중지되었습니다')
      await checkGatewayStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleRestartGateway = async () => {
    setLoading(true)
    setStatusMessage('Gateway 재시작 중...')
    setError(null)

    try {
      const result = await invoke<string>('restart_gateway')
      setStatusMessage(result)
      await checkGatewayStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const getStatusIcon = () => {
    switch (gatewayStatus) {
      case 'running': return '🟢'
      case 'stopped': return '🔴'
      case 'checking': return '🟡'
      case 'error': return '❌'
      default: return '🟡'
    }
  }

  const getStatusText = () => {
    switch (gatewayStatus) {
      case 'running': return 'Gateway 실행 중'
      case 'stopped': return 'Gateway 중지됨'
      case 'checking': return '상태 확인 중...'
      case 'error': return 'Gateway 오류'
      default: return '알 수 없음'
    }
  }

  const getStatusColor = () => {
    switch (gatewayStatus) {
      case 'running': return 'text-green-400'
      case 'stopped': return 'text-red-400'
      case 'checking': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* 헤더 - Steel Theme */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img 
              src="/app-icon.jpg" 
              alt="moldClaw" 
              className="w-16 h-16 object-contain"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(43, 45, 48, 0.8))',
                imageRendering: 'crisp-edges'
              }}
            />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-steel-light to-steel-primary bg-clip-text text-transparent">moldClaw 관리센터</h1>
          <p className="text-steel-light text-sm">
            <span className="text-steel-rust font-medium">OpenClaw Gateway</span> 관리 및 제어
          </p>
        </div>

        {/* Gateway 상태 카드 */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Gateway 상태</h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon()}</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* 상태 메시지 */}
          {statusMessage && (
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-300 text-center">
              {statusMessage}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-1">오류</p>
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {/* Gateway 제어 버튼 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {gatewayStatus === 'running' ? (
              <>
                <button
                  onClick={handleStopGateway}
                  disabled={loading}
                  className="py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                  style={{
                    background: loading ? '#6B6E73' : 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
                    color: '#C8CDD0',
                    boxShadow: '0 4px 12px rgba(43, 45, 48, 0.6), inset 0 1px 0 rgba(200, 205, 208, 0.1)'
                  }}
                >
                  {loading ? '⚙️ 중지 중...' : '🛑 중지'}
                </button>
                <button
                  onClick={handleRestartGateway}
                  disabled={loading}
                  className="py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                  style={{
                    background: loading ? '#6B6E73' : 'linear-gradient(135deg, #6B6E73 0%, #A8B0B8 100%)',
                    color: '#C8CDD0',
                    boxShadow: '0 4px 12px rgba(43, 45, 48, 0.6), inset 0 1px 0 rgba(200, 205, 208, 0.1)'
                  }}
                >
                  {loading ? '⚙️ 재시작 중...' : '🔄 재시작'}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartGateway}
                disabled={loading}
                className="col-span-2 py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                style={{
                  background: loading ? '#6B6E73' : 'linear-gradient(135deg, #A8B0B8 0%, #C8CDD0 100%)',
                  color: '#3A3D42',
                  boxShadow: '0 4px 12px rgba(43, 45, 48, 0.6), inset 0 1px 0 rgba(200, 205, 208, 0.3)'
                }}
              >
                {loading ? '⚙️ 시작 중...' : '⚡ 시작'}
              </button>
            )}
          </div>

          <p className="text-xs text-steel-warm text-center">
            Gateway가 실행되어야 메신저와 연결됩니다
          </p>
        </div>

        {/* 현재 설정 카드 */}
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-steel-bright">현재 설정</h2>
          {configSummary ? (
            <pre className="text-xs text-steel-light whitespace-pre-wrap font-mono leading-relaxed">
              {configSummary}
            </pre>
          ) : (
            <p className="text-steel-warm text-sm">설정 정보 없음</p>
          )}
        </div>

        {/* 설정 관리 버튼 */}
        <div className="space-y-3">
          <button
            onClick={onStartOnboarding}
            className="w-full py-4 glass hover:bg-white/10 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
          >
            <span className="text-2xl">⚙️</span>
            <div className="text-left">
              <div className="font-semibold text-steel-bright">설정 변경</div>
              <div className="text-xs text-steel-warm">모델, 메신저, 통합 서비스 재설정</div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.open('http://localhost:18789', '_blank')}
              className="py-3 glass hover:bg-white/10 rounded-xl text-sm transition-colors text-steel-bright"
            >
              🌐 웹 인터페이스
            </button>
            <button
              onClick={() => window.open('~/.openclaw/openclaw.json', '_blank')}
              className="py-3 glass hover:bg-white/10 rounded-xl text-sm transition-colors text-steel-bright"
            >
              📝 설정 파일
            </button>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-steel-warm">
            moldClaw를 종료하면 Gateway도 자동 중지됩니다
          </p>
        </div>
      </div>
    </div>
  )
}