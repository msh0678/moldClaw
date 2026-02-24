import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'

interface LoadingProps {
  onReady: () => void
  onDashboard: () => void
}

type SetupStep = 'checking' | 'antivirus-warning' | 'node-missing' | 'installing-prerequisites' | 'restart-required' | 'installing-openclaw' | 'ready' | 'error'

interface PrerequisiteStatus {
  node_installed: boolean
  node_version: string | null
  node_compatible: boolean
  node_too_new: boolean  // Node.js 24+ (네이티브 모듈 호환성 문제)
  npm_installed: boolean
  vc_redist_installed: boolean
  disk_space_gb: number
  disk_space_ok: boolean
  antivirus_detected: string | null
}

export default function Loading({ onReady, onDashboard }: LoadingProps) {
  const [step, setStep] = useState<SetupStep>('checking')
  const [status, setStatus] = useState('환경 확인 중...')
  const [error, setError] = useState<string | null>(null)
  const [nodeUrl, setNodeUrl] = useState('')
  const [antivirusName, setAntivirusName] = useState<string | null>(null)
  const [prereqStatus, setPrereqStatus] = useState<PrerequisiteStatus | null>(null)

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    try {
      // 0. OS 확인
      const osType = await invoke<string>('get_os_type')
      const isWindows = osType === 'windows'

      // 1. 환경 사전 검사 (백신 감지 포함)
      setStatus('환경 확인 중...')
      const status = await invoke<PrerequisiteStatus>('check_prerequisites')
      setPrereqStatus(status)
      
      // 2. 백신 감지 시 경고 (Windows만, 첫 실행 시에만)
      const antivirusWarningShown = localStorage.getItem('moldclaw_antivirus_warning_shown');
      if (isWindows && status.antivirus_detected && !antivirusWarningShown) {
        setAntivirusName(status.antivirus_detected)
        setStep('antivirus-warning')
        return  // 사용자가 "설치 계속하기" 누를 때까지 대기
      }
      
      // 3. 백신 없으면 바로 설치 진행
      await proceedWithInstallation(isWindows, status)

    } catch (err) {
      setStep('error')
      setError(String(err))
    }
  }

  // 설치 진행 (백신 경고 후 또는 백신 없을 때)
  const proceedWithInstallation = async (isWindows: boolean, status: PrerequisiteStatus) => {
    try {
      // Node.js 확인
      setStatus('Node.js 확인 중...')
      
      // Node.js 24+도 일단 설치 시도 (실패 시 에러 분석에서 안내)
      
      if (!status.node_compatible) {
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

      // 2. OpenClaw 확인 (불완전 설치 감지 포함)
      await new Promise(resolve => setTimeout(resolve, 500))
      setStatus('OpenClaw 확인 중...')
      
      interface OpenClawStatus {
        exists: boolean
        works: boolean
        version: string | null
        incomplete: boolean
      }
      
      const openclawStatus = await invoke<OpenClawStatus>('verify_openclaw_status')
      console.log('OpenClaw 상태:', openclawStatus)
      
      if (openclawStatus.incomplete) {
        // 불완전 설치 감지 - 정리 후 재설치
        setStep('installing-openclaw')
        setStatus('이전 설치 정리 중...')
        
        try {
          await invoke<string>('cleanup_incomplete_openclaw')
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (cleanupErr) {
          console.error('정리 실패:', cleanupErr)
          // 정리 실패해도 설치 시도
        }
        
        setStatus('OpenClaw 재설치 중...')
        const result = await invoke<string>('install_openclaw')
        setStatus(result)
      } else if (!openclawStatus.works) {
        // 설치 안 됨 - 신규 설치
        setStep('installing-openclaw')
        setStatus('OpenClaw 설치 중... (최초 1회)')
        
        const result = await invoke<string>('install_openclaw')
        setStatus(result)
      } else {
        // 정상 작동 중
        setStatus(`OpenClaw ${openclawStatus.version || '확인됨'}`)
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

  // 백신 경고 후 설치 계속하기
  const handleContinueWithAntivirus = async () => {
    // 다음부터 백신 경고 안 뜨게 저장
    localStorage.setItem('moldclaw_antivirus_warning_shown', 'true');
    
    const osType = await invoke<string>('get_os_type')
    const isWindows = osType === 'windows'
    
    if (prereqStatus) {
      setStep('checking')
      setStatus('설치 진행 중...')
      await proceedWithInstallation(isWindows, prereqStatus)
    }
  }

  // 백신 감지 경고 화면
  if (step === 'antivirus-warning') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h2 className="text-xl font-bold mb-2">백신 프로그램 감지됨</h2>
          <p className="text-forge-text text-sm mb-4">
            <strong className="text-yellow-400">{antivirusName}</strong>이(가) 실행 중입니다.
          </p>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6 text-left">
            <p className="text-yellow-400 text-sm mb-2">
              ⚠️ 백신의 실시간 감시가 설치를 차단할 수 있습니다.
            </p>
            <p className="text-gray-300 text-sm">
              설치 전 백신의 <strong>실시간 감시를 일시 중지</strong>해 주세요.<br />
              설치 완료 후 다시 활성화하시면 됩니다.
            </p>
          </div>
          
          <button
            onClick={handleContinueWithAntivirus}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 mb-3"
          >
            백신 비활성화 완료, 설치 계속하기 →
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            문제 발생 시: <span className="text-blue-400">hexagon0678@gmail.com</span>
          </p>
        </div>
      </div>
    )
  }

  // 재시작 필요 화면 (Windows winget 설치 후 PATH 인식 실패)
  if (step === 'restart-required') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">설치 완료!</h2>
          <p className="text-forge-text text-sm mb-6">
            Node.js가 설치되었습니다.<br />
            <strong className="text-white">moldClaw를 재시작</strong>해 주세요.
          </p>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ 새로 설치된 프로그램을 인식하려면<br />
              앱을 완전히 종료 후 다시 실행해야 합니다.
            </p>
          </div>
          
          <div className="p-3 bg-forge-dark/50 rounded-lg">
            <p className="text-xs text-forge-text">
              우측 상단 X 버튼으로 앱을 종료한 후<br />
              다시 moldClaw를 실행하세요.
            </p>
          </div>
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
          <p className="text-forge-text text-sm mb-6">
            필수 프로그램을 설치하고 있습니다.<br />
            <strong className="text-white">관리자 권한 창이 나타나면 승인</strong>해 주세요.
          </p>
          
          <div className="flex justify-center gap-1 mb-4">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
            <p className="text-xs text-blue-400">
              설치 중인 항목:<br />
              • Node.js (런타임)<br />
              • Visual C++ Redistributable (필수 라이브러리)
            </p>
          </div>
          
          <p className="text-sm text-forge-text mt-4">
            moldClaw는 아직 개발 중입니다. 피드백을 환영합니다.<br />
            <span className="text-xs text-gray-500">문의: <span className="text-blue-400">hexagon0678@gmail.com</span></span>
          </p>
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
          <p className="text-forge-text text-sm mb-6">
            moldClaw를 사용하려면 Node.js가 필요합니다.<br />
            설치 후 앱을 다시 실행해 주세요.
          </p>
          
          <button
            onClick={handleInstallNode}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold mb-3 hover:opacity-90"
          >
            Node.js 다운로드 →
          </button>
          
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-white/10 rounded-xl text-forge-bright hover:bg-white/20"
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
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">설치 실패</h2>
          <p className="text-gray-400 text-sm mb-4 whitespace-pre-wrap max-h-40 overflow-y-auto">{error}</p>
          
          <div className="p-3 bg-black/20 rounded-lg text-left mb-4">
            <p className="text-xs text-gray-400 mb-1">수동 설치:</p>
            <code className="text-xs text-blue-400">
              npm install -g openclaw
            </code>
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-3 bg-indigo-500 rounded-xl font-semibold hover:bg-indigo-600 mb-4"
          >
            다시 시도
          </button>
          
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
            <p className="text-red-400 text-sm font-semibold mb-2">
              ⚠️ 도움이 필요하신가요?
            </p>
            <p className="text-gray-300 text-xs">
              문제가 발생한 경우, 다음 이메일로 연락 주시면 도움을 드리겠습니다:
            </p>
            <p className="text-blue-400 text-sm font-semibold mt-1">
              hexagon0678@gmail.com
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 로딩 화면
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-6 flex justify-center animate-bounce">
        <img 
          src="/app-icon.png" 
          alt="moldClaw" 
          className="w-20 h-20 object-contain"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(232, 107, 42, 0.4))',
          }}
        />
      </div>
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-forge-copper to-forge-amber bg-clip-text text-transparent">moldClaw</h1>
      <p className="text-forge-text mb-4">{status}</p>
      
      {step === 'installing-openclaw' && (
        <div className="glass rounded-xl p-4 max-w-xs text-center mb-4">
          <p className="text-sm text-gray-300">
            OpenClaw를 설치하고 있습니다.<br />
            잠시만 기다려 주세요.
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
