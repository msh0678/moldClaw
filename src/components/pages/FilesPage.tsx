// FilesPage - 파일/기록 페이지
// 대시보드로만 이동 가능

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppView } from '../../types/config';

interface FilesPageProps {
  onNavigate: (view: AppView) => void;
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

export default function FilesPage({ onNavigate }: FilesPageProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspacePath, setWorkspacePath] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaceFiles();
  }, []);

  const loadWorkspaceFiles = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>('get_workspace_files');
      const parsed = JSON.parse(result);
      setFiles(parsed.files || []);
      setWorkspacePath(parsed.path || '~/.openclaw/workspace');
      setError(null);
    } catch (err) {
      setError('파일 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (path: string) => {
    try {
      await invoke('open_file', { path });
    } catch (err) {
      setError(`파일 열기 실패: ${err}`);
    }
  };

  const openFolder = async () => {
    try {
      await invoke('open_workspace_folder');
    } catch (err) {
      setError(`폴더 열기 실패: ${err}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return '📁';
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.txt')) return '📄';
    if (name.endsWith('.ts') || name.endsWith('.js')) return '📜';
    return '📄';
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
            <h1 className="text-xl font-bold text-forge-text">📁 워크스페이스</h1>
            <p className="text-sm text-forge-muted">AI의 파일과 기록</p>
          </div>
        </div>
        <button
          onClick={openFolder}
          className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
        >
          📂 폴더 열기
        </button>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* 경로 표시 */}
        <div className="card p-4 mb-4">
          <p className="text-sm text-forge-muted">경로</p>
          <p className="text-forge-text font-mono text-sm">{workspacePath}</p>
        </div>

        {/* 설명 */}
        <div className="card p-4 mb-6 bg-forge-amber/10 border-forge-amber/30">
          <p className="text-sm text-forge-text">
            <strong>워크스페이스</strong>는 AI의 "집"입니다. AGENTS.md, SOUL.md, MEMORY.md 등 AI의 성격과 기억이 저장됩니다.
          </p>
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
            <p className="text-forge-muted">파일 목록 로딩 중...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-forge-text mb-2">파일이 없습니다</h3>
            <p className="text-forge-muted text-sm">워크스페이스가 아직 초기화되지 않았습니다.</p>
          </div>
        ) : (
          <div className="card divide-y divide-white/5">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => openFile(file.path)}
                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-2xl">{getFileIcon(file.name, file.isDirectory)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-forge-text font-medium truncate">{file.name}</p>
                  <p className="text-xs text-forge-muted">
                    {file.isDirectory ? '폴더' : formatSize(file.size)} · {file.modified}
                  </p>
                </div>
                <span className="text-forge-muted">→</span>
              </button>
            ))}
          </div>
        )}

        {/* 새로고침 */}
        <div className="mt-6 text-center">
          <button
            onClick={loadWorkspaceFiles}
            className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text text-sm"
          >
            🔄 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
