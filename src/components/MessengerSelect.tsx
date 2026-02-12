import { useState, useEffect } from 'react'
import type { MessengerConfig } from '../App'

type Messenger = 'telegram' | 'discord' | 'whatsapp'

interface MessengerSelectProps {
  initialConfig: MessengerConfig
  onComplete: (config: MessengerConfig) => void
  onBack: () => void
}

const messengers = [
  {
    id: 'telegram' as Messenger,
    name: 'Telegram',
    icon: '✈️',
    desc: '가장 쉬운 설정',
    difficulty: 1,
    pros: ['5분 만에 설정 완료', 'BotFather로 간단히 봇 생성'],
    cons: ['Telegram 계정 필요'],
    recommended: true,
    needsToken: true,
    tokenLabel: 'Bot Token',
    tokenPlaceholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    guideUrl: 'https://t.me/BotFather',
    guideSteps: [
      '1. Telegram에서 @BotFather 검색',
      '2. /newbot 명령으로 새 봇 생성',
      '3. 봇 이름과 username 입력 (예: MyAI_bot)',
      '4. 받은 토큰을 아래에 붙여넣기',
    ],
  },
  {
    id: 'whatsapp' as Messenger,
    name: 'WhatsApp',
    icon: '💚',
    desc: 'QR 코드 스캔만',
    difficulty: 1,
    pros: ['QR 코드만 스캔하면 끝', '기존 WhatsApp 사용'],
    cons: ['휴대폰 필요', '웹 세션 유지 필요'],
    recommended: false,
    needsToken: false,
    tokenLabel: '',
    tokenPlaceholder: '',
    guideUrl: '',
    guideSteps: [
      '1. 설치 시작 후 터미널에 QR 코드가 표시됩니다',
      '2. WhatsApp 앱 → 설정 → 연결된 기기',
      '3. 기기 연결 → QR 코드 스캔',
    ],
  },
  {
    id: 'discord' as Messenger,
    name: 'Discord',
    icon: '🎮',
    desc: '개발자 포털 설정 필요',
    difficulty: 3,
    pros: ['서버/채널별 분리 가능', '풍부한 기능'],
    cons: ['Developer Portal 설정 복잡', 'Intent 활성화 필수'],
    recommended: false,
    needsToken: true,
    tokenLabel: 'Bot Token',
    tokenPlaceholder: 'MTIzNDU2Nzg5MDEyMzQ1Njc4.Gg...',
    guideUrl: 'https://discord.com/developers/applications',
    guideSteps: [
      '1. Discord Developer Portal에서 New Application 생성',
      '2. Bot 탭 → Add Bot → Reset Token으로 토큰 복사',
      '3. ⚠️ MESSAGE CONTENT INTENT 활성화 필수!',
      '4. OAuth2 → URL Generator에서 봇 초대 링크 생성',
      '5. bot + applications.commands 권한 선택',
      '6. 생성된 URL로 서버에 봇 초대',
    ],
  },
]

export default function MessengerSelect({ initialConfig, onComplete, onBack }: MessengerSelectProps) {
  const [selectedMessenger, setSelectedMessenger] = useState<Messenger | null>(initialConfig.type)
  const [token, setToken] = useState(initialConfig.token)
  const [showGuide, setShowGuide] = useState(false)

  // 초기값 변경 시 상태 업데이트
  useEffect(() => {
    setSelectedMessenger(initialConfig.type)
    setToken(initialConfig.token)
  }, [initialConfig])

  const selectedInfo = messengers.find(m => m.id === selectedMessenger)

  const handleComplete = () => {
    if (!selectedMessenger) return
    if (selectedInfo?.needsToken && !token) return

    onComplete({
      ...initialConfig,
      type: selectedMessenger,
      token: token,
    })
  }

  const isValid = selectedMessenger && (!selectedInfo?.needsToken || token.length > 10)

  return (
    <div className="min-h-screen flex flex-col p-6 overflow-auto">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
      >
        ← 뒤로
      </button>

      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-md w-full">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">💬</div>
            <h2 className="text-2xl font-bold mb-2">메신저 연결</h2>
            <p className="text-gray-400 text-sm">AI와 대화할 메신저를 선택하고 연결하세요</p>
          </div>

          {/* forgeClaw 릴레이 방식 (준비 중) */}
          <div className="mb-6">
            <button
              disabled
              className="w-full p-4 glass rounded-xl text-left opacity-50 cursor-not-allowed relative"
            >
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gray-600 rounded-full text-xs">
                준비 중
              </span>
              <div className="flex items-center gap-4">
                <div className="text-3xl">🔗</div>
                <div>
                  <div className="font-semibold">Discord URL 방식 (forgeClaw 릴레이)</div>
                  <p className="text-sm text-gray-500">
                    토큰 없이 URL만으로 연결 · 가장 쉬운 방법
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#0f0f23] text-gray-500">또는 직접 연결 (OpenClaw 공식)</span>
            </div>
          </div>

          {/* 메신저 선택 목록 */}
          <div className="space-y-3 mb-6">
            {messengers.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMessenger(m.id)
                  setShowGuide(true)
                }}
                className={`w-full p-4 glass rounded-xl text-left transition-all hover:bg-white/10 relative ${
                  m.recommended ? 'ring-2 ring-indigo-500/50' : ''
                } ${selectedMessenger === m.id ? 'bg-indigo-500/20 ring-2 ring-indigo-500' : ''}`}
              >
                {m.recommended && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-indigo-500 rounded-full text-xs font-medium">
                    추천
                  </span>
                )}
                
                {selectedMessenger === m.id && (
                  <span className="absolute top-3 right-3 text-indigo-400">✓</span>
                )}
                
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-xs text-gray-500">
                        {'⭐'.repeat(m.difficulty)}{'☆'.repeat(3 - m.difficulty)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{m.desc}</p>
                    
                    {/* 장점 */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {m.pros.slice(0, 2).map((pro, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ✓ {pro}
                        </span>
                      ))}
                    </div>
                    
                    {/* 단점 */}
                    {m.cons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.cons.slice(0, 1).map((con, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded">
                            {con}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 선택된 메신저 설정 */}
          {selectedMessenger && selectedInfo && showGuide && (
            <div className="glass rounded-xl p-5 mb-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{selectedInfo.icon}</span>
                <h3 className="font-semibold">{selectedInfo.name} 연결 방법</h3>
                {selectedInfo.guideUrl && (
                  <a
                    href={selectedInfo.guideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    가이드 열기 →
                  </a>
                )}
              </div>

              {/* 가이드 단계 */}
              <ol className="space-y-2 mb-4">
                {selectedInfo.guideSteps.map((step, i) => (
                  <li key={i} className={`text-sm ${step.includes('⚠️') ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {step}
                  </li>
                ))}
              </ol>

              {/* 토큰 입력 (필요한 경우) */}
              {selectedInfo.needsToken && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    {selectedInfo.tokenLabel}
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={selectedInfo.tokenPlaceholder}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    🔒 토큰은 이 기기에만 저장되며 외부로 전송되지 않습니다
                  </p>
                </div>
              )}

              {/* WhatsApp 안내 */}
              {!selectedInfo.needsToken && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400">
                    ✓ {selectedInfo.name}은 토큰이 필요 없습니다.<br />
                    설치 완료 후 QR 코드를 스캔하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 다음 버튼 */}
          <button
            onClick={handleComplete}
            disabled={!isValid}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {selectedMessenger 
              ? (selectedInfo?.needsToken && !token 
                  ? '토큰을 입력하세요' 
                  : '다음 →')
              : '메신저를 선택하세요'}
          </button>

          {/* 안내 */}
          <p className="text-center text-xs text-gray-500 mt-4">
            나중에 설정 파일에서 다른 메신저를 추가할 수 있습니다<br />
            <code className="text-indigo-400">~/.openclaw/openclaw.json</code>
          </p>
        </div>
      </div>
    </div>
  )
}
