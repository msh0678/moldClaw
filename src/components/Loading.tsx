import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'

interface LoadingProps {
  onReady: () => void
  onDashboard: () => void
}

type SetupStep = 'checking' | 'node-missing' | 'installing-prerequisites' | 'restart-required' | 'installing-openclaw' | 'ready' | 'error'

export default function Loading({ onReady, onDashboard }: LoadingProps) {
  const [step, setStep] = useState<SetupStep>('checking')
  const [status, setStatus] = useState('환경 확인 중...')
  const [error, setError] = useState<string | null>(null)
  const [nodeUrl, setNodeUrl] = useState('')

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    try {
      // 0. OS 확인
      const osType = await invoke<string>('get_os_type')
      const isWindows = osType === 'windows'

      // 1. Node.js 확인
      setStatus('Node.js 확인 중...')
      const nodeInstalled = await invoke<boolean>('check_node_installed')
      
      if (!nodeInstalled) {
        if (isWindows) {
          // Windows: winget으로 자동 설치 시도
          setStep('installing-prerequisites')
          setStatus('필수 프로그램 설치 중...')
          
          try {
            const result = await invoke<{ needs_restart: boolean; message: string }>('install_prerequisites')
            
            if (result.needs_restart) {
              setStep('restart-required')
              return
            }
          } catch (installErr) {
            // winget 실패 시 수동 설치 안내
            console.error('자동 설치 실패:', installErr)
            const url = await invoke<string>('get_node_install_url')
            setNodeUrl(url)
            setStep('node-missing')
            return
          }
        } else {
          // Linux/Mac: 수동 설치 안내
          const url = await invoke<string>('get_node_install_url')
          setNodeUrl(url)
          setStep('node-missing')
          return
        }
      }

      const nodeVersion = await invoke<string>('get_node_version')
      setStatus(`Node.js ${nodeVersion} 확인됨`)

      // 2. OpenClaw 확인
      await new Promise(resolve => setTimeout(resolve, 500))
      setStatus('OpenClaw 확인 중...')
      const openclawInstalled = await invoke<boolean>('check_openclaw_installed')

      if (!openclawInstalled) {
        setStep('installing-openclaw')
        setStatus('OpenClaw 설치 중... (최초 1회)')
        
        const result = await invoke<string>('install_openclaw')
        setStatus(result)
      } else {
        const version = await invoke<string>('get_openclaw_version')
        setStatus(`OpenClaw ${version} 확인됨`)
      }

      // 3. 온보딩 완료 여부 확인
      await new Promise(resolve => setTimeout(resolve, 500))
      setStatus('설정 확인 중...')
      const isCompleted = await invoke<boolean>('is_onboarding_completed')
      
      await new Promise(resolve => setTimeout(resolve, 300))
      setStep('ready')
      setStatus('준비 완료!')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (isCompleted) {
        onDashboard()
      } else {
        onReady()
      }

    } catch (err) {
      setStep('error')
      setError(String(err))
    }
  }

  const handleInstallNode = async () => {
    if (nodeUrl) {
      await open(nodeUrl)
    }
  }

  const handleRetry = () => {
    setStep('checking')
    setError(null)
    checkEnvironment()
  }

  // 재시작 필요 화면 (Windows winget 설치 후)
  if (step === 'restart-required') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">설치 완료!</h2>
          <p className="text-steel-light text-sm mb-6">
            Node.js가 설치되었습니다.<br />
            <strong className="text-white">moldClaw를 재시작</strong>해주세요.
          </p>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ 새로 설치된 프로그램을 인식하려면<br />
              앱을 다시 시작해야 합니다.
            </p>
          </div>
          
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:opacity-90"
          >
            🔄 다시 확인
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            버튼을 눌러도 안 되면 앱을 완전히 종료 후 다시 실행하세요
          </p>
        </div>
      </div>
    )
  }

  // 필수 프로그램 설치 중 화면
  if (step === 'installing-prerequisites') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <h2 className="text-xl font-bold mb-2">설치 중...</h2>
          <p className="text-steel-light text-sm mb-6">
            필수 프로그램을 설치하고 있습니다.<br />
            <strong className="text-white">관리자 권한 창이 뜨면 승인</strong>해주세요.
          </p>
          
          <div className="flex justify-center gap-1 mb-4">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
            <p className="text-xs text-blue-400">
              설치 중인 항목:<br />
              • Git (버전 관리)<br />
              • Node.js (런타임)
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Node.js 미설치 화면
  if (step === 'node-missing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold mb-2">Node.js 필요</h2>
          <p className="text-steel-light text-sm mb-6">
            moldClaw를 사용하려면 Node.js가 필요해요.<br />
            설치 후 이 앱을 다시 실행해주세요.
          </p>
          
          <button
            onClick={handleInstallNode}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold mb-3 hover:opacity-90"
          >
            Node.js 다운로드 →
          </button>
          
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-white/10 rounded-xl text-steel-bright hover:bg-white/20"
          >
            설치 완료됨, 다시 확인
          </button>

          <div className="mt-6 p-3 bg-black/20 rounded-lg text-left">
            <p className="text-xs text-gray-400 mb-1">또는 터미널에서:</p>
            <code className="text-xs text-green-400">
              # Ubuntu/Debian<br />
              sudo apt install nodejs npm
            </code>
          </div>
        </div>
      </div>
    )
  }

  // 에러 화면
  if (step === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">설치 실패</h2>
          <p className="text-gray-400 text-sm mb-4 whitespace-pre-wrap">{error}</p>
          
          <div className="p-3 bg-black/20 rounded-lg text-left mb-4">
            <p className="text-xs text-gray-400 mb-1">수동 설치:</p>
            <code className="text-xs text-blue-400">
              npm install -g openclaw
            </code>
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-3 bg-indigo-500 rounded-xl font-semibold hover:bg-indigo-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 로딩 화면
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-6 flex justify-center animate-bounce">
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
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-steel-light to-steel-primary bg-clip-text text-transparent">moldClaw</h1>
      <p className="text-steel-light mb-4">{status}</p>
      
      {step === 'installing-openclaw' && (
        <div className="glass rounded-xl p-4 max-w-xs text-center mb-4">
          <p className="text-sm text-gray-300">
            OpenClaw를 설치하고 있어요.<br />
            잠시만 기다려주세요...
          </p>
        </div>
      )}
      
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  )
}
