import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

type LogLevel = 'all' | 'error' | 'warn' | 'info'

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  source?: string
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel>('all')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLogs()
    
    // 자동 새로고침 (5초마다)
    let interval: ReturnType<typeof setInterval> | null = null
    if (autoRefresh) {
      interval = setInterval(loadLogs, 5000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const loadLogs = async () => {
    try {
      const result = await invoke<string>('get_gateway_logs')
      const parsed = JSON.parse(result)
      setLogs(parsed.logs || [])
    } catch (err) {
      console.error('로그 로드 실패:', err)
      // 에러는 조용히 처리
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm('모든 로그를 삭제하시겠습니까?')) return
    
    try {
      await invoke('clear_gateway_logs')
      setLogs([])
    } catch (err) {
      console.error('로그 삭제 실패:', err)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    return log.level === filter
  })

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-forge-error'
      case 'warn': return 'text-forge-amber'
      case 'info': return 'text-forge-success'
      default: return 'text-forge-muted'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-forge-error/20'
      case 'warn': return 'bg-forge-amber/20'
      case 'info': return 'bg-forge-success/20'
      default: return 'bg-forge-surface'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forge-text mb-2">📋 로그</h1>
        <p className="text-forge-muted">Gateway 에러 및 활동 로그를 확인합니다.</p>
      </div>

      {/* 필터 및 컨트롤 */}
      <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* 필터 버튼들 */}
        <div className="flex gap-2">
          {(['all', 'error', 'warn', 'info'] as LogLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === level
                  ? 'bg-forge-copper text-white'
                  : 'bg-forge-surface text-forge-muted hover:text-forge-text'
              }`}
            >
              {level === 'all' ? '전체' :
               level === 'error' ? '❌ 에러' :
               level === 'warn' ? '⚠️ 경고' : 'ℹ️ 정보'}
            </button>
          ))}
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="flex items-center gap-3">
          {/* 자동 새로고침 토글 */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
              autoRefresh 
                ? 'bg-forge-success/20 text-forge-success' 
                : 'bg-forge-surface text-forge-muted'
            }`}
          >
            {autoRefresh ? '🔄 자동 새로고침 켜짐' : '⏸️ 자동 새로고침 꺼짐'}
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={clearLogs}
            className="px-3 py-1 rounded-lg text-sm bg-forge-error/20 text-forge-error hover:bg-forge-error/30 transition-colors"
          >
            🗑️ 로그 삭제
          </button>
        </div>
      </div>

      {/* 로그 목록 */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="animate-pulse text-forge-muted">로그 로딩 중...</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-forge-text mb-2">
            {filter === 'all' ? '로그가 없습니다' : `${filter} 로그가 없습니다`}
          </h3>
          <p className="text-forge-muted text-sm">
            Gateway가 실행 중이면 로그가 기록됩니다.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
          {filteredLogs.map((log, index) => (
            <div 
              key={index} 
              className={`p-4 ${getLevelBg(log.level)} hover:bg-white/5 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{getLevelIcon(log.level)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium uppercase ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-forge-muted">
                      {log.timestamp}
                    </span>
                    {log.source && (
                      <span className="text-xs text-forge-muted px-2 py-0.5 bg-forge-night rounded">
                        {log.source}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-forge-text break-words whitespace-pre-wrap font-mono">
                    {log.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* 수동 새로고침 버튼 */}
      <div className="mt-6 text-center">
        <button
          onClick={loadLogs}
          className="btn-secondary px-4 py-2 rounded-lg text-sm"
        >
          🔄 새로고침
        </button>
      </div>
    </div>
  )
}
