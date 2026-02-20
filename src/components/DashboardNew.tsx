import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface DashboardNewProps {
  onSettings: () => void
}

type GatewayStatus = 'checking' | 'running' | 'stopped' | 'error'

interface ChannelStatus {
  name: string
  icon: string
  connected: boolean
  lastActivity?: string
}

interface UsageStats {
  tokensUsed: number
  messagesCount: number
  lastActive: string
}

export default function DashboardNew({ onSettings }: DashboardNewProps) {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('checking')
  const [channels, setChannels] = useState<ChannelStatus[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
    loadStats()
    
    // 5초마다 상태 확인
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const status = await invoke<string>('get_gateway_status')
      setGatewayStatus(status === 'running' ? 'running' : 'stopped')
      
      // 채널 상태 로드
      try {
        const channelResult = await invoke<string>('get_channel_status')
        const parsed = JSON.parse(channelResult)
        setChannels(parsed.channels || [])
      } catch {
        // 채널 상태는 선택적
      }
      
      setError(null)
    } catch (err) {
      setGatewayStatus('error')
      setError(String(err))
    }
  }

  const loadStats = async () => {
    try {
      const result = await invoke<string>('get_usage_stats')
      const parsed = JSON.parse(result)
      setUsage(parsed.usage || null)
      setRecentActivity(parsed.recentActivity || [])
    } catch {
      // 통계는 선택적
    }
  }

  const handleStartGateway = async () => {
    setLoading(true)
    setError(null)
    try {
      await invoke<string>('install_and_start_service')
      await checkStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleStopGateway = async () => {
    setLoading(true)
    setError(null)
    try {
      await invoke('stop_gateway')
      await checkStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRestartGateway = async () => {
    setLoading(true)
    setError(null)
    try {
      await invoke<string>('restart_gateway')
      await checkStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUninstall = async () => {
    const confirmed = window.confirm(
      'OpenClaw를 삭제하시겠습니까?\n\n' +
      '• OpenClaw 프로그램이 삭제됩니다\n' +
      '• API 키가 포함된 설정 파일도 삭제됩니다\n' +
      '• moldClaw는 유지됩니다\n\n' +
      '이 작업은 되돌릴 수 없습니다.'
    )
    if (!confirmed) return

    setLoading(true)
    try {
      await invoke<string>('uninstall_openclaw')
      alert('OpenClaw가 삭제되었습니다.\n다시 설치하려면 "설정"을 클릭하세요.')
      await checkStatus()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const openDashboard = async () => {
    try {
      const url = await invoke<string>('get_dashboard_url')
      window.open(url, '_blank')
    } catch {
      window.open('http://localhost:18789', '_blank')
    }
  }

  const getStatusIcon = () => {
    switch (gatewayStatus) {
      case 'running': return '🟢'
      case 'stopped': return '🔴'
      case 'checking': return '🟡'
      case 'error': return '❌'
    }
  }

  const getStatusText = () => {
    switch (gatewayStatus) {
      case 'running': return 'Gateway 실행 중'
      case 'stopped': return 'Gateway 중지됨'
      case 'checking': return '상태 확인 중...'
      case 'error': return 'Gateway 오류'
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-forge-text">🏠 대시보드</h1>
          <p className="text-forge-muted text-sm">OpenClaw Gateway 상태</p>
        </div>
        <button
          onClick={onSettings}
          className="btn-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm"
        >
          <span>⚙️</span>
          <span>설정</span>
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="card p-3 mb-4 bg-forge-error/10 border-forge-error/30">
          <p className="text-forge-error text-xs">{error}</p>
        </div>
      )}

      {/* 상태 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Gateway 상태 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-forge-text">Gateway</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{getStatusIcon()}</span>
              <span className={`text-sm font-medium ${
                gatewayStatus === 'running' ? 'text-forge-success' : 
                gatewayStatus === 'stopped' ? 'text-forge-error' : 
                'text-forge-amber'
              }`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          
          {/* Gateway 제어 버튼 */}
          <div className="flex gap-2">
            {gatewayStatus === 'running' ? (
              <>
                <button
                  onClick={handleStopGateway}
                  disabled={loading}
                  className="flex-1 py-1.5 text-sm rounded-lg bg-forge-error/20 text-forge-error hover:bg-forge-error/30 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? '...' : '🛑 중지'}
                </button>
                <button
                  onClick={handleRestartGateway}
                  disabled={loading}
                  className="flex-1 py-1.5 text-sm rounded-lg bg-forge-surface text-forge-text hover:bg-white/10 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? '...' : '🔄 재시작'}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartGateway}
                disabled={loading}
                className="w-full py-1.5 text-sm rounded-lg btn-primary disabled:opacity-50 transition-colors"
              >
                {loading ? '시작 중...' : '⚡ 시작'}
              </button>
            )}
          </div>
        </div>

        {/* 채널 상태 */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-forge-text mb-2">채널</h3>
          {channels.length === 0 ? (
            <p className="text-forge-muted text-xs">연결된 채널이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {channels.map((channel, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{channel.icon}</span>
                    <span className="text-forge-text text-sm">{channel.name}</span>
                  </div>
                  <span className={`text-xs ${channel.connected ? 'text-forge-success' : 'text-forge-muted'}`}>
                    {channel.connected ? '연결됨' : '연결 안 됨'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 사용량 요약 */}
      <div className="card p-4 mb-4">
        <h3 className="text-base font-semibold text-forge-text mb-3">📊 사용량</h3>
        {usage ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-forge-copper">{usage.tokensUsed.toLocaleString()}</p>
              <p className="text-xs text-forge-muted">토큰</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-forge-copper">{usage.messagesCount}</p>
              <p className="text-xs text-forge-muted">메시지</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-forge-copper">{usage.lastActive}</p>
              <p className="text-xs text-forge-muted">최근</p>
            </div>
          </div>
        ) : (
          <p className="text-forge-muted text-xs text-center py-2">사용량 데이터가 없습니다.</p>
        )}
      </div>

      {/* 최근 활동 + 빠른 작업 (가로 배치) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* 최근 활동 */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-forge-text mb-2">🕐 최근 활동</h3>
          {recentActivity.length === 0 ? (
            <p className="text-forge-muted text-xs text-center py-2">최근 활동이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {recentActivity.slice(0, 3).map((activity, idx) => (
                <li key={idx} className="flex items-center gap-2 py-1 text-xs text-forge-text">
                  <span className="text-forge-amber">•</span>
                  <span className="truncate">{activity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 빠른 작업 */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-forge-text mb-2">⚡ 빠른 작업</h3>
          <div className="space-y-2">
            <button
              onClick={openDashboard}
              className="w-full py-2 text-sm rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
            >
              🌐 웹 인터페이스
            </button>
            <button
              onClick={() => window.open('~/.openclaw/openclaw.json', '_blank')}
              className="w-full py-2 text-sm rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
            >
              📝 설정 파일
            </button>
          </div>
        </div>
      </div>

      {/* 하단 - 삭제 및 연락처 */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <button
            onClick={handleUninstall}
            disabled={loading}
            className="text-xs text-forge-muted hover:text-forge-error transition-colors disabled:opacity-50"
          >
            🗑️ OpenClaw 삭제
          </button>
          <p className="text-xs text-forge-muted">
            문의: <a href="mailto:hexagon0678@gmail.com" className="text-forge-copper hover:underline">hexagon0678@gmail.com</a>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
