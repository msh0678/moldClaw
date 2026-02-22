// LogsPage - 로그 페이지
// 대시보드로만 이동 가능

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppView } from '../../types/config';

interface LogsPageProps {
  onNavigate: (view: AppView) => void;
}

type LogLevel = 'all' | 'error' | 'warn' | 'info';

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source?: string;
}

export default function LogsPage({ onNavigate }: LogsPageProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadLogs();
    
    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      interval = setInterval(loadLogs, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadLogs = async () => {
    try {
      const result = await invoke<string>('get_gateway_logs');
      const parsed = JSON.parse(result);
      setLogs(parsed.logs || []);
    } catch (err) {
      console.error('로그 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('모든 로그를 삭제하시겠습니까?')) return;
    
    try {
      await invoke('clear_gateway_logs');
      setLogs([]);
    } catch (err) {
      console.error('로그 삭제 실패:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-forge-error';
      case 'warn': return 'text-forge-amber';
      case 'info': return 'text-forge-success';
      default: return 'text-forge-muted';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-forge-error/10';
      case 'warn': return 'bg-forge-amber/10';
      case 'info': return 'bg-forge-success/10';
      default: return 'bg-forge-surface';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
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
            <h1 className="text-xl font-bold text-forge-text">📋 로그</h1>
            <p className="text-sm text-forge-muted">Gateway 활동 기록</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`
              px-3 py-2 rounded-lg text-sm transition-colors
              ${autoRefresh 
                ? 'bg-forge-success/20 text-forge-success' 
                : 'bg-forge-surface text-forge-muted'}
            `}
          >
            {autoRefresh ? '🔄 자동 새로고침' : '⏸️ 일시정지'}
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-2 rounded-lg text-sm bg-forge-error/20 text-forge-error hover:bg-forge-error/30"
          >
            🗑️ 삭제
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* 필터 */}
        <div className="flex gap-2 mb-6">
          {(['all', 'error', 'warn', 'info'] as LogLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter === level
                  ? 'bg-forge-copper text-white'
                  : 'bg-forge-surface text-forge-muted hover:text-forge-text'}
              `}
            >
              {level === 'all' ? '전체' :
               level === 'error' ? '❌ 에러' :
               level === 'warn' ? '⚠️ 경고' : 'ℹ️ 정보'}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
            <p className="text-forge-muted">로그 로딩 중...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📭</div>
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
              <div key={index} className={`p-4 ${getLevelBg(log.level)} hover:bg-white/5`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getLevelIcon(log.level)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium uppercase ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-forge-muted">{log.timestamp}</span>
                      {log.source && (
                        <span className="text-xs text-forge-muted px-2 py-0.5 bg-forge-night rounded">
                          {log.source}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-forge-text break-words font-mono">
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 수동 새로고침 */}
        <div className="mt-6 text-center">
          <button
            onClick={loadLogs}
            className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text text-sm"
          >
            🔄 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
