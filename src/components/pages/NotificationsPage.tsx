// NotificationsPage - 알림 관리 페이지
// 대시보드로만 이동 가능

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppView } from '../../types/config';

interface NotificationsPageProps {
  onNavigate: (view: AppView) => void;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export default function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCronJobs();
  }, []);

  const loadCronJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string>('get_cron_jobs');
      const parsed = JSON.parse(result);
      setJobs(parsed.jobs || []);
    } catch (err) {
      setError('알림 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) return;

    try {
      await invoke('delete_cron_job', { job_id: jobId });
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggle = async (jobId: string, enabled: boolean) => {
    try {
      await invoke('toggle_cron_job', { job_id: jobId, enabled });
      setJobs(jobs.map(j => j.id === jobId ? { ...j, enabled } : j));
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* 헤더 */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="
              w-10 h-10 rounded-xl bg-forge-surface hover:bg-white/10
              flex items-center justify-center text-forge-muted hover:text-forge-text
              transition-colors
            "
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-forge-text">🔔 알림 관리</h1>
            <p className="text-sm text-forge-muted">예약된 알림과 리마인더</p>
          </div>
        </div>
        <button
          onClick={loadCronJobs}
          className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
        >
          🔄 새로고침
        </button>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* 안내 카드 */}
        <div className="card p-4 mb-6 bg-forge-copper/10 border-forge-copper/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-forge-text font-medium mb-1">AI가 알림을 설정해줍니다!</p>
              <p className="text-forge-muted text-sm">
                "내일 아침 9시에 알려줘"와 같이 요청하면 자동으로 설정됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
            <p className="text-forge-error text-sm">{error}</p>
          </div>
        )}

        {/* 로딩 */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
            <p className="text-forge-muted">알림 목록 로딩 중...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-forge-text mb-2">설정된 알림이 없습니다</h3>
            <p className="text-forge-muted text-sm">
              AI에게 "매일 아침 9시에 날씨 알려줘"와 같이 요청해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(job.id, !job.enabled)}
                    className={`
                      w-12 h-6 rounded-full transition-colors relative
                      ${job.enabled ? 'bg-forge-copper' : 'bg-forge-surface'}
                    `}
                  >
                    <div className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${job.enabled ? 'left-7' : 'left-1'}
                    `} />
                  </button>
                  <div>
                    <h4 className={`font-medium ${job.enabled ? 'text-forge-text' : 'text-forge-muted'}`}>
                      {job.name || '이름 없는 알림'}
                    </h4>
                    <p className="text-sm text-forge-muted">{job.schedule}</p>
                    {job.nextRun && (
                      <p className="text-xs text-forge-amber">다음: {job.nextRun}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="p-2 text-forge-muted hover:text-forge-error transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
