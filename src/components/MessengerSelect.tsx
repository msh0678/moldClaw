import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { MessengerConfig, Messenger } from '../App'

interface MessengerSelectProps {
  initialConfig: MessengerConfig | null  // null이면 editMode에서 직접 로드
  onComplete: (config: MessengerConfig) => void
  onBack: () => void
  editMode?: boolean
}

interface LoadedMessengerConfig {
  type: string
  hasToken: boolean
  isLinked?: boolean
  dmPolicy: string
  allowFrom: string[]
  groupPolicy: string
  requireMention: boolean
}

import { defaultMessengerConfig } from '../App'

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
    needsQr: false,
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
    needsQr: true,
    tokenLabel: '',
    tokenPlaceholder: '',
    guideUrl: '',
    guideSteps: [
      '1. 아래 "QR 코드 열기" 버튼을 클릭합니다',
      '2. 터미널 창에 QR 코드가 표시됩니다',
      '3. WhatsApp 앱 → 설정 → 연결된 기기',
      '4. "기기 연결" → 터미널의 QR 코드 스캔',
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
    needsQr: false,
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

export default function MessengerSelect({ initialConfig, onComplete, onBack, editMode = false }: MessengerSelectProps) {
  const [selectedMessenger, setSelectedMessenger] = useState<Messenger | null>(initialConfig?.type || null)
  const [token, setToken] = useState(initialConfig?.token || '')
  const [dmPolicy, setDmPolicy] = useState(initialConfig?.dmPolicy || 'pairing')
  const [showGuide, setShowGuide] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // WhatsApp QR 인증 상태
  const [whatsappLinked, setWhatsappLinked] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  
  // 기존 토큰 존재 여부 (editMode)
  const [hasExistingToken, setHasExistingToken] = useState(false)

  // editMode일 때 현재 설정 로드
  useEffect(() => {
    if (editMode && !initialConfig) {
      loadCurrentConfig()
    }
  }, [editMode, initialConfig])

  // initialConfig가 있으면 상태 업데이트
  useEffect(() => {
    if (initialConfig) {
      setSelectedMessenger(initialConfig.type)
      setToken(initialConfig.token)
      setDmPolicy(initialConfig.dmPolicy)
    }
  }, [initialConfig])

  // WhatsApp 선택 시 인증 상태 확인
  useEffect(() => {
    if (selectedMessenger === 'whatsapp') {
      checkWhatsappStatus()
    }
  }, [selectedMessenger])

  const loadCurrentConfig = async () => {
    setLoading(true)
    try {
      const config = await invoke<LoadedMessengerConfig | null>('get_messenger_config')
      if (config && config.type) {
        setSelectedMessenger(config.type as Messenger)
        setDmPolicy(config.dmPolicy as 'pairing' | 'allowlist' | 'open')
        setHasExistingToken(config.hasToken)
        setShowGuide(true)
        
        if (config.type === 'whatsapp' && config.isLinked) {
          setWhatsappLinked(true)
        }
      }
    } catch (err) {
      console.error('메신저 설정 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkWhatsappStatus = async () => {
    try {
      const linked = await invoke<boolean>('check_whatsapp_linked')
      setWhatsappLinked(linked)
    } catch {
      setWhatsappLinked(false)
    }
  }

  const handleQrLogin = async () => {
    setQrLoading(true)
    setQrError(null)
    
    try {
      await invoke<string>('login_whatsapp')
      setWhatsappLinked(true)
      setQrError(null)
    } catch (err) {
      setQrError(String(err))
      await checkWhatsappStatus()
    } finally {
      setQrLoading(false)
    }
  }

  const selectedInfo = messengers.find(m => m.id === selectedMessenger)

  const handleComplete = async () => {
    if (!selectedMessenger) return
    if (selectedInfo?.needsToken && !token && !hasExistingToken) return
    if (selectedMessenger === 'whatsapp' && !whatsappLinked) return

    // editMode일 때는 직접 저장
    if (editMode) {
      setLoading(true)
      try {
        await invoke('update_messenger_config', {
          channel: selectedMessenger,
          token: token,  // 빈 문자열이면 기존 토큰 유지
          dm_policy: dmPolicy,
          allow_from: [],
          group_policy: 'allowlist',
          require_mention: true,
        })
        onComplete({
          ...defaultMessengerConfig,
          type: selectedMessenger,
          token: token,
          dmPolicy: dmPolicy,
        })
      } catch (err) {
        console.error('메신저 설정 저장 실패:', err)
        alert(`저장 실패: ${err}`)
      } finally {
        setLoading(false)
      }
    } else {
      // 온보딩 모드
      onComplete({
        ...defaultMessengerConfig,
        type: selectedMessenger,
        token: token,
        dmPolicy: dmPolicy,
      })
    }
  }

  // 유효성 검사
  const isValid = (() => {
    if (!selectedMessenger) return false
    if (selectedInfo?.needsToken && !token && !hasExistingToken) return false
    if (selectedMessenger === 'whatsapp' && !whatsappLinked) return false
    return true
  })()

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (loading) return '저장 중...'
    if (!selectedMessenger) return '메신저를 선택하세요'
    if (selectedInfo?.needsToken && !token && !hasExistingToken) return '토큰을 입력하세요'
    if (selectedMessenger === 'whatsapp' && !whatsappLinked) return 'QR 인증이 필요합니다'
    return editMode ? '✓ 확인' : '다음 →'
  }

  if (loading && editMode && !selectedMessenger) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
          <p className="text-forge-muted">설정 로드 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-6 overflow-auto">
      {/* 뒤로가기/취소 */}
      <button 
        onClick={onBack}
        className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
      >
        ← {editMode ? '취소' : '뒤로'}
      </button>

      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-md w-full">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">💬</div>
            <h2 className="text-2xl font-bold mb-2">메신저 연결</h2>
            <p className="text-gray-400 text-sm">
              {editMode ? '메신저 설정을 변경합니다' : 'AI와 대화할 메신저를 선택하고 연결하세요'}
            </p>
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
                  if (m.id !== 'whatsapp') {
                    setWhatsappLinked(false)
                    setQrError(null)
                  }
                  // 다른 메신저로 변경 시 기존 토큰 무효화
                  if (editMode && m.id !== selectedMessenger) {
                    setHasExistingToken(false)
                    setToken('')
                  }
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
                    
                    <div className="flex flex-wrap gap-1 mb-1">
                      {m.pros.slice(0, 2).map((pro, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ✓ {pro}
                        </span>
                      ))}
                    </div>
                    
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

              <ol className="space-y-2 mb-4">
                {selectedInfo.guideSteps.map((step, i) => (
                  <li key={i} className={`text-sm ${step.includes('⚠️') ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {step}
                  </li>
                ))}
              </ol>

              {/* 토큰 입력 (Telegram, Discord) */}
              {selectedInfo.needsToken && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    {selectedInfo.tokenLabel}
                    {editMode && hasExistingToken && (
                      <span className="ml-2 text-green-400 text-xs">✓ 기존 토큰 있음</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={editMode && hasExistingToken ? '(변경하려면 새 토큰 입력)' : selectedInfo.tokenPlaceholder}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    🔒 토큰은 이 기기에만 저장되며 외부로 전송되지 않습니다
                  </p>
                </div>
              )}

              {/* WhatsApp QR 인증 */}
              {selectedMessenger === 'whatsapp' && (
                <div className="space-y-4">
                  {whatsappLinked ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="font-medium text-green-400">WhatsApp 인증 완료!</p>
                          <p className="text-sm text-green-400/70">다음 단계로 진행할 수 있습니다</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div>
                          <p className="font-medium text-yellow-400">QR 인증이 필요합니다</p>
                          <p className="text-sm text-yellow-400/70">아래 버튼을 클릭하여 QR 코드를 열어주세요</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleQrLogin}
                    disabled={qrLoading}
                    className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 ${
                      whatsappLinked 
                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    } ${qrLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {qrLoading ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        QR 코드 창 열림 - 스캔 대기 중...
                      </>
                    ) : whatsappLinked ? (
                      <>🔄 다시 인증하기 (선택)</>
                    ) : (
                      <>📷 QR 코드 열기</>
                    )}
                  </button>

                  {qrError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{qrError}</p>
                      <p className="text-xs text-red-400/70 mt-1">
                        터미널 창이 닫혔다면 다시 시도해주세요
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    💡 QR 버튼 클릭 시 터미널 창이 열립니다.<br />
                    휴대폰 WhatsApp에서 QR을 스캔하면 자동으로 완료됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 다음/확인 버튼 */}
          <button
            onClick={handleComplete}
            disabled={!isValid || loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {getButtonText()}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            나중에 설정 파일에서 다른 메신저를 추가할 수 있습니다<br />
            <code className="text-indigo-400">~/.openclaw/openclaw.json</code>
          </p>
        </div>
      </div>
    </div>
  )
}
