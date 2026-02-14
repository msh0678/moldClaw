import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { exit } from '@tauri-apps/plugin-process'

export default function ShuttingDown() {
  const [status, setStatus] = useState<string>('정리 중...')
  const [dots, setDots] = useState('')

  useEffect(() => {
    // 점 애니메이션
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // 종료 프로세스 실행
    const shutdown = async () => {
      try {
        setStatus('OpenClaw Gateway 종료 중')
        await invoke('cleanup_before_exit')
        
        setStatus('정리 완료')
        
        // 잠시 대기 후 앱 종료
        await new Promise(resolve => setTimeout(resolve, 500))
        await exit(0)
      } catch (error) {
        console.error('종료 중 에러:', error)
        // 에러가 나도 앱은 종료
        await new Promise(resolve => setTimeout(resolve, 500))
        await exit(0)
      }
    }

    shutdown()

    return () => {
      clearInterval(dotsInterval)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="text-center">
        {/* 스피너 */}
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>

        {/* 메인 메시지 */}
        <h1 className="text-2xl font-bold text-white mb-4">
          잠시만 기다려 주세요
        </h1>
        
        <p className="text-slate-400 text-lg">
          moldClaw 종료 중입니다{dots}
        </p>

        {/* 상태 */}
        <p className="text-slate-500 text-sm mt-4">
          {status}
        </p>

        {/* 경고 */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg max-w-sm mx-auto">
          <p className="text-yellow-400 text-sm">
            ⚠️ 창을 강제로 닫지 마세요. 설정이 손상될 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
