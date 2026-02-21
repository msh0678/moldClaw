import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface FileItem {
  name: string
  path: string
  size: number
  modified: string
  isDirectory: boolean
}

export default function Files() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [workspacePath, setWorkspacePath] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWorkspaceFiles()
  }, [])

  const loadWorkspaceFiles = async () => {
    setLoading(true)
    try {
      const result = await invoke<string>('get_workspace_files')
      const parsed = JSON.parse(result)
      setFiles(parsed.files || [])
      setWorkspacePath(parsed.path || '~/.openclaw/workspace')
      setError(null)
    } catch (err) {
      console.error('워크스페이스 파일 로드 실패:', err)
      setFiles([])
      setError('워크스페이스 파일을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const openFile = async (path: string) => {
    try {
      await invoke('open_file', { path })
    } catch (err) {
      setError(`파일 열기 실패: ${err}`)
    }
  }

  const openFolder = async () => {
    try {
      await invoke('open_workspace_folder')
    } catch (err) {
      setError(`폴더 열기 실패: ${err}`)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return '📁'
    if (name.endsWith('.md')) return '📝'
    if (name.endsWith('.json')) return '📋'
    if (name.endsWith('.txt')) return '📄'
    return '📄'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forge-text mb-2">📁 워크스페이스</h1>
        <p className="text-forge-muted">AI의 워크스페이스 파일을 확인합니다.</p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
          <p className="text-forge-error text-sm">{error}</p>
        </div>
      )}

      {/* 경로 표시 및 폴더 열기 */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-forge-muted">워크스페이스 경로</p>
          <p className="text-forge-text font-mono text-sm">{workspacePath}</p>
        </div>
        <button
          onClick={openFolder}
          className="btn-secondary px-4 py-2 rounded-lg text-sm"
        >
          📂 폴더 열기
        </button>
      </div>

      {/* 파일 설명 */}
      <div className="card p-4 mb-4 bg-forge-amber/10 border-forge-amber/30">
        <p className="text-sm text-forge-text">
          <strong>워크스페이스</strong>는 AI의 "집"입니다. AGENTS.md, SOUL.md, MEMORY.md 등 AI의 성격과 기억이 저장됩니다.
        </p>
      </div>

      {/* 파일 목록 */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="animate-pulse text-forge-muted">파일 목록 로딩 중...</div>
        </div>
      ) : files.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-forge-text mb-2">파일이 없습니다</h3>
          <p className="text-forge-muted text-sm">워크스페이스가 아직 초기화되지 않았을 수 있습니다.</p>
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

      {/* 새로고침 버튼 */}
      <div className="mt-6 text-center">
        <button
          onClick={loadWorkspaceFiles}
          className="btn-secondary px-4 py-2 rounded-lg text-sm"
        >
          🔄 새로고침
        </button>
      </div>
    </div>
  )
}
