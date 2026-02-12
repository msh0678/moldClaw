import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

type Messenger = 'telegram' | 'discord' | 'whatsapp'

interface SuccessProps {
  messenger: Messenger
}

export default function Success({ messenger }: SuccessProps) {
  const [status, setStatus] = useState<'checking' | 'running' | 'stopped'>('checking')
  const [configSummary, setConfigSummary] = useState<string>('')

  useEffect(() => {
    checkStatus()
    loadConfigSummary()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const result = await invoke<string>('get_gateway_status')
      setStatus(result === 'running' ? 'running' : 'stopped')
    } catch {
      setStatus('stopped')
    }
  }

  const loadConfigSummary = async () => {
    try {
      const summary = await invoke<string>('get_config_summary')
      setConfigSummary(summary)
    } catch {
      setConfigSummary('')
    }
  }

  const messengerInfo: Record<Messenger, { name: string; icon: string; nextSteps: string[] }> = {
    telegram: {
      name: 'Telegram',
      icon: '✈️',
      nextSteps: [
        '봇과 DM으로 대화를 시작하세요',
        '첫 메시지를 보내면 페어링 코드가 전송됩니다',
        '"openclaw pairing approve telegram <코드>" 로 승인',
        '이후부터 자유롭게 대화할 수 있습니다!',
      ],
    },
    discord: {
      name: 'Discord',
      icon: '🎮',
      nextSteps: [
        '봇을 서버에 초대하세요 (OAuth2 URL 사용)',
        'DM 또는 서버 채널에서 봇에게 말을 걸어보세요',
        '서버에서는 @봇이름 으로 멘션해야 응답합니다',
        '페어링 승인: "openclaw pairing approve discord <코드>"',
      ],
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: '💚',
      nextSteps: [
        '터미널에서 QR 코드를 스캔하세요',
        'WhatsApp 앱 → 설정 → 연결된 기기 → 기기 연결',
        '연결 후 자신에게 메시지를 보내보세요',
        '봇이 응답하면 성공!',
      ],
    },
  }

  const info = messengerInfo[messenger]

  const handleRestart = async () => {
    try {
      setStatus('checking')
      await invoke('start_gateway')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await checkStatus()
    } catch (err) {
      alert('Gateway 재시작 실패: ' + err)
      setStatus('stopped')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* 성공 아이콘 */}
        <div className="relative inline-block mb-6">
          <div className="text-6xl mb-2">🎉</div>
          <div className="absolute -right-2 -bottom-2 text-3xl">{info.icon}</div>
        </div>

        <h1 className="text-2xl font-bold mb-2">설정 완료!</h1>
        <p className="text-gray-400 mb-6">
          {info.name}이 연결되었습니다
        </p>

        {/* Gateway 상태 */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Gateway 상태</span>
            <span className={`flex items-center gap-2 text-sm font-medium ${
              status === 'running' ? 'text-green-400' : 
              status === 'stopped' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'running' ? 'bg-green-400' : 
                status === 'stopped' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
              }`} />
              {status === 'running' ? '실행 중' : 
               status === 'stopped' ? '중지됨' : '확인 중...'}
            </span>
          </div>
          
          {status === 'stopped' && (
            <button
              onClick={handleRestart}
              className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-sm text-indigo-300 transition-colors"
            >
              Gateway 재시작
            </button>
          )}
        </div>

        {/* 설정 요약 */}
        {configSummary && (
          <div className="glass rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-300 mb-2">현재 설정</h3>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
              {configSummary}
            </pre>
          </div>
        )}

        {/* 다음 단계 */}
        <div className="glass rounded-xl p-4 text-left mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">다음 단계</h3>
          <ol className="space-y-2">
            {info.nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-400">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 유용한 명령어 */}
        <div className="glass rounded-xl p-4 text-left">
          <h3 className="text-sm font-medium text-gray-300 mb-3">유용한 명령어</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">상태 확인:</span>
              <code className="text-indigo-400">openclaw status</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">로그 확인:</span>
              <code className="text-indigo-400">openclaw logs -f</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">페어링 목록:</span>
              <code className="text-indigo-400">openclaw pairing list</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">설정 파일:</span>
              <code className="text-indigo-400">~/.openclaw/openclaw.json</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
