import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'

interface LoadingProps {
  onReady: () => void
  onDashboard: () => void
}

type SetupStep = 'checking' | 'node-missing' | 'installing-openclaw' | 'ready' | 'error'

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
      // 1. Node.js 확인
      setStatus('Node.js 확인 중...')
      const nodeInstalled = await invoke<boolean>('check_node_installed')
      
      if (!nodeInstalled) {
        const url = await invoke<string>('get_node_install_url')
        setNodeUrl(url)
        setStep('node-missing')
        return
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
