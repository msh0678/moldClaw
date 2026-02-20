import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface CronJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

export default function Notifications() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCronJobs()
  }, [])

  const loadCronJobs = async () => {
    setLoading(true)
    try {
      // OpenClaw cron jobs 목록 조회
      const result = await invoke<string>('get_cron_jobs')
      const parsed = JSON.parse(result)
      setJobs(parsed.jobs || [])
      setError(null)
    } catch (err) {
      console.error('Cron jobs 로드 실패:', err)
      setJobs([])
      // 에러는 조용히 처리 (아직 설정 안 됐을 수 있음)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) return

    try {
      await invoke('delete_cron_job', { jobId })
      setJobs(jobs.filter(j => j.id !== jobId))
    } catch (err) {
      setError(String(err))
    }
  }

  const handleToggle = async (jobId: string, enabled: boolean) => {
    try {
      await invoke('toggle_cron_job', { jobId, enabled })
      setJobs(jobs.map(j => j.id === jobId ? { ...j, enabled } : j))
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forge-text mb-2">🔔 알림 관리</h1>
        <p className="text-forge-muted">예약된 알림과 리마인더를 관리합니다.</p>
      </div>

      {/* 안내 카드 */}
      <div className="card p-4 mb-6 bg-forge-copper/10 border-forge-copper/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-forge-text font-medium mb-1">AI가 알림을 설정해줍니다!</p>
            <p className="text-forge-muted text-sm">
              수동 설정 없이도 AI에게 "내일 아침 9시에 알려줘"와 같이 요청하면 자동으로 알림이 설정됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
          <p className="text-forge-error text-sm">{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="animate-pulse text-forge-muted">알림 목록 로딩 중...</div>
        </div>
      ) : jobs.length === 0 ? (
        /* 빈 상태 */
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-forge-text mb-2">설정된 알림이 없습니다</h3>
          <p className="text-forge-muted text-sm">
            AI에게 "매일 아침 9시에 날씨 알려줘"와 같이 요청해 보세요.
          </p>
        </div>
      ) : (
        /* 알림 목록 */
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 토글 */}
                <button
                  onClick={() => handleToggle(job.id, !job.enabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    job.enabled ? 'bg-forge-copper' : 'bg-forge-dark'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      job.enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>

                {/* 정보 */}
                <div>
                  <h4 className={`font-medium ${job.enabled ? 'text-forge-text' : 'text-forge-muted'}`}>
                    {job.name || '이름 없는 알림'}
                  </h4>
                  <p className="text-sm text-forge-muted">{job.schedule}</p>
                  {job.nextRun && (
                    <p className="text-xs text-forge-amber">다음 실행: {job.nextRun}</p>
                  )}
                </div>
              </div>

              {/* 삭제 버튼 */}
              <button
                onClick={() => handleDelete(job.id)}
                className="p-2 text-forge-muted hover:text-forge-error transition-colors"
                title="삭제"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="mt-6 text-center">
        <button
          onClick={loadCronJobs}
          className="btn-secondary px-4 py-2 rounded-lg text-sm"
        >
          🔄 새로고침
        </button>
      </div>
    </div>
  )
}
