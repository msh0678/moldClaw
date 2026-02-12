interface WelcomeProps {
  onComplete: () => void
  onGoToDashboard?: () => void
}

export default function Welcome({ onComplete, onGoToDashboard }: WelcomeProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
        {/* 로고 - Real Claw Icon */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/app-icon.jpg" 
            alt="moldClaw" 
            className="w-20 h-20 object-contain"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(43, 45, 48, 0.8))',
              imageRendering: 'crisp-edges'
            }}
          />
        </div>
        
        {/* 타이틀 - Steel Theme */}
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-steel-light to-steel-primary bg-clip-text text-transparent" style={{textShadow: '0 2px 4px rgba(43, 45, 48, 0.8)'}}>
          moldClaw
        </h1>
        
        {/* 설명 - Steel Theme */}
        <p className="text-steel-light mb-8 text-sm leading-relaxed">
          강력한 AI를 메신저에 연결하세요.<br />
          <span className="text-steel-rust font-medium">단 3단계면 충분합니다.</span>
        </p>

        {/* 특징 - Industrial Theme */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-center gap-3 text-sm p-2 rounded-lg glass">
            <span className="text-2xl">🔧</span>
            <span className="text-steel-bright">WhatsApp, Telegram, Discord 지원</span>
          </div>
          <div className="flex items-center gap-3 text-sm p-2 rounded-lg glass">
            <span className="text-2xl">⚡</span>
            <span className="text-steel-bright">Claude AI가 즉시 응답</span>
          </div>
          <div className="flex items-center gap-3 text-sm p-2 rounded-lg glass">
            <span className="text-2xl">🛠️</span>
            <span className="text-steel-bright">설정 1분, <span className="text-steel-rust font-medium">영원한 편리함</span></span>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="space-y-3">
          {onGoToDashboard && (
            <button
              onClick={onGoToDashboard}
              className="w-full py-3 glass hover:bg-white/10 rounded-xl font-medium transition-colors text-steel-bright"
            >
              ← 관리센터로 돌아가기
            </button>
          )}
          
          <button
            onClick={onComplete}
            className="w-full py-4 bg-gradient-to-r from-steel-primary to-steel-light rounded-xl font-semibold text-lg hover:opacity-90 transition-all shadow-steel hover:shadow-steel-inset text-steel-dark"
            style={{
              background: 'linear-gradient(135deg, #A8B0B8 0%, #C8CDD0 100%)',
              boxShadow: '0 4px 12px rgba(43, 45, 48, 0.6), inset 0 1px 0 rgba(200, 205, 208, 0.3)'
            }}
          >
            ⚙️ 시작하기 →
          </button>
        </div>
      </div>
      
      {/* 버전 */}
      <p className="mt-6 text-xs text-gray-500">v0.1.0 • Powered by OpenClaw</p>
    </div>
  )
}
