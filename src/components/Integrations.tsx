import { useState, useEffect } from 'react'
import type { IntegrationConfig } from '../App'

interface IntegrationsProps {
  initialValues: IntegrationConfig
  onUpdate: (integrations: IntegrationConfig) => void
  onComplete: () => void
  onBack: () => void
  onSkip: () => void
  editMode?: boolean  // Summary에서 수정 모드로 진입했을 때
}

interface Integration {
  id: string
  name: string
  category: string
  icon: string
  envVar: string
  description: string
  guideUrl: string
  guideSteps: string[]
  placeholder: string
}

const INTEGRATIONS: Integration[] = [
  // AI Models (추가 프로바이더)
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'AI 모델',
    icon: '🌐',
    envVar: 'OPENROUTER_API_KEY',
    description: '다양한 모델을 하나의 API로 (Claude, GPT, Llama 등)',
    guideUrl: 'https://openrouter.ai/keys',
    guideSteps: [
      'OpenRouter 계정 생성/로그인',
      'Keys 페이지에서 Create Key',
      '생성된 키 복사',
    ],
    placeholder: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    name: 'Groq',
    category: 'AI 모델',
    icon: '⚡',
    envVar: 'GROQ_API_KEY',
    description: '초고속 LLM 추론 (Llama, Mixtral)',
    guideUrl: 'https://console.groq.com/keys',
    guideSteps: [
      'Groq Cloud 계정 생성',
      'API Keys → Create API Key',
      '생성된 키 복사',
    ],
    placeholder: 'gsk_...',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    category: 'AI 모델',
    icon: '🔷',
    envVar: 'MINIMAX_API_KEY',
    description: 'MiniMax M2.1 모델',
    guideUrl: 'https://www.minimax.ai/',
    guideSteps: [
      'MiniMax 계정 생성',
      'API 키 발급',
      '키 복사',
    ],
    placeholder: 'eyJ...',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    category: 'AI 모델',
    icon: '🌙',
    envVar: 'MOONSHOT_API_KEY',
    description: 'Moonshot AI의 Kimi 모델',
    guideUrl: 'https://platform.moonshot.cn/',
    guideSteps: [
      'Moonshot 계정 생성',
      'API 관리 → 키 생성',
      '키 복사',
    ],
    placeholder: 'sk-...',
  },
  {
    id: 'zai',
    name: 'Z.AI (GLM)',
    category: 'AI 모델',
    icon: '🇨🇳',
    envVar: 'ZAI_API_KEY',
    description: 'Z.AI GLM-4.7 모델',
    guideUrl: 'https://z.ai/',
    guideSteps: [
      'Z.AI 계정 생성',
      'API 키 발급',
      '키 복사',
    ],
    placeholder: '...',
  },
  {
    id: 'kimi',
    name: 'Kimi Coding',
    category: 'AI 모델',
    icon: '🌙',
    envVar: 'KIMI_API_KEY',
    description: 'Kimi Coding 전용 API',
    guideUrl: 'https://platform.moonshot.cn/',
    guideSteps: [
      'Moonshot 계정에서 Coding API 키 발급',
    ],
    placeholder: 'sk-...',
  },
  {
    id: 'opencode',
    name: 'OpenCode Zen',
    category: 'AI 모델',
    icon: '💜',
    envVar: 'OPENCODE_API_KEY',
    description: '멀티 모델 게이트웨이',
    guideUrl: 'https://opencode.ai/auth',
    guideSteps: [
      'OpenCode 계정 생성',
      'API 키 발급',
    ],
    placeholder: '...',
  },
  {
    id: 'synthetic',
    name: 'Synthetic',
    category: 'AI 모델',
    icon: '🧪',
    envVar: 'SYNTHETIC_API_KEY',
    description: 'Anthropic 호환 프록시',
    guideUrl: 'https://synthetic.new/',
    guideSteps: [
      'Synthetic 계정 생성',
      'API 키 발급',
    ],
    placeholder: 'sk-...',
  },
  {
    id: 'venice',
    name: 'Venice',
    category: 'AI 모델',
    icon: '🎭',
    envVar: 'VENICE_API_KEY',
    description: 'Venice AI 모델',
    guideUrl: 'https://venice.ai/',
    guideSteps: [
      'Venice 계정 생성',
      'API 키 발급',
    ],
    placeholder: '...',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    category: 'AI 모델',
    icon: '📱',
    envVar: 'XIAOMI_API_KEY',
    description: 'Xiaomi AI 모델',
    guideUrl: 'https://www.mi.com/',
    guideSteps: [
      'Xiaomi 개발자 계정 생성',
      'API 키 발급',
    ],
    placeholder: '...',
  },
  {
    id: 'vercel',
    name: 'Vercel AI Gateway',
    category: 'AI 모델',
    icon: '▲',
    envVar: 'VERCEL_GATEWAY_API_KEY',
    description: 'Vercel AI 게이트웨이',
    guideUrl: 'https://vercel.com/docs/ai',
    guideSteps: [
      'Vercel 계정 생성',
      'AI Gateway 설정',
      'API 키 발급',
    ],
    placeholder: '...',
  },
  
  // 외부 도구
  {
    id: 'brave',
    name: 'Brave Search',
    category: '외부 도구',
    icon: '🦁',
    envVar: 'BRAVE_API_KEY',
    description: '웹 검색 기능 활성화',
    guideUrl: 'https://brave.com/search/api/',
    guideSteps: [
      'Brave Search API 페이지 접속',
      'Get Started → API 키 발급',
      '무료 플랜: 월 2000회 검색',
    ],
    placeholder: 'BSA...',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    category: '외부 도구',
    icon: '🔥',
    envVar: 'FIRECRAWL_API_KEY',
    description: '웹페이지 스크래핑/파싱',
    guideUrl: 'https://firecrawl.dev/',
    guideSteps: [
      'Firecrawl 계정 생성',
      'API Keys → Create',
      '키 복사',
    ],
    placeholder: 'fc-...',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: '외부 도구',
    icon: '🔊',
    envVar: 'ELEVENLABS_API_KEY',
    description: 'AI 음성 합성 (TTS)',
    guideUrl: 'https://elevenlabs.io/',
    guideSteps: [
      'ElevenLabs 계정 생성',
      'Profile → API Keys',
      '키 복사',
    ],
    placeholder: 'sk_...',
  },

  // 추가 메신저
  {
    id: 'slack',
    name: 'Slack Bot Token',
    category: '메신저',
    icon: '💼',
    envVar: 'SLACK_BOT_TOKEN',
    description: 'Slack 워크스페이스 연동',
    guideUrl: 'https://api.slack.com/apps',
    guideSteps: [
      'Slack App 생성 (api.slack.com/apps)',
      'OAuth & Permissions → Bot Token 복사',
      'App Token도 필요 (아래에서 설정)',
      '워크스페이스에 앱 설치',
    ],
    placeholder: 'xoxb-...',
  },
  {
    id: 'slack_app',
    name: 'Slack App Token',
    category: '메신저',
    icon: '💼',
    envVar: 'SLACK_APP_TOKEN',
    description: 'Slack Socket Mode용 App Token',
    guideUrl: 'https://api.slack.com/apps',
    guideSteps: [
      'Slack App 설정 → Basic Information',
      'App-Level Tokens → Generate',
      'connections:write 스코프 추가',
    ],
    placeholder: 'xapp-...',
  },
  {
    id: 'mattermost',
    name: 'Mattermost Token',
    category: '메신저',
    icon: '💬',
    envVar: 'MATTERMOST_BOT_TOKEN',
    description: '오픈소스 팀 메신저',
    guideUrl: 'https://developers.mattermost.com/',
    guideSteps: [
      'Mattermost 서버 관리자 권한 필요',
      'Integrations → Bot Accounts → Add',
      '토큰 복사',
    ],
    placeholder: '...',
  },
  {
    id: 'mattermost_url',
    name: 'Mattermost URL',
    category: '메신저',
    icon: '💬',
    envVar: 'MATTERMOST_URL',
    description: 'Mattermost 서버 주소',
    guideUrl: '',
    guideSteps: ['서버 URL 입력 (예: https://chat.example.com)'],
    placeholder: 'https://mattermost.example.com',
  },
  {
    id: 'googlechat',
    name: 'Google Chat',
    category: '메신저',
    icon: '💚',
    envVar: 'GOOGLE_CHAT_SERVICE_ACCOUNT_FILE',
    description: 'Google Chat 봇 연동',
    guideUrl: 'https://developers.google.com/chat/api/guides/auth/service-accounts',
    guideSteps: [
      'Google Cloud Console에서 프로젝트 생성',
      'Chat API 활성화',
      'Service Account 생성 + JSON 키 다운로드',
      'JSON 파일 경로 입력',
    ],
    placeholder: '/path/to/service-account.json',
  },
]

const CATEGORIES = ['AI 모델', '외부 도구', '메신저']

export default function Integrations({ initialValues, onUpdate, onComplete, onBack, onSkip, editMode = false }: IntegrationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('AI 모델')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [values, setValues] = useState<IntegrationConfig>(initialValues)

  // 초기값이 변경되면 상태 업데이트
  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  const filteredIntegrations = INTEGRATIONS.filter(i => i.category === selectedCategory)

  const handleValueChange = (envVar: string, value: string) => {
    const newValues = { ...values, [envVar]: value }
    setValues(newValues)
  }

  const handleContinue = () => {
    // 현재까지의 모든 값을 부모에게 전달
    onUpdate(values)
    onComplete()
  }

  const configuredCount = Object.values(values).filter(v => v && v.length > 0).length

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← {editMode ? '취소' : '뒤로'}
        </button>
        {!editMode && (
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white text-sm"
          >
            건너뛰기 →
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto">
          {/* 타이틀 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔗</div>
            <h2 className="text-2xl font-bold mb-2">외부 서비스 연동</h2>
            <p className="text-gray-400 text-sm">
              추가 기능을 위한 API 키를 설정하세요 (선택)
            </p>
            {configuredCount > 0 && (
              <p className="text-green-400 text-sm mt-2">
                ✓ {configuredCount}개 서비스 입력됨
              </p>
            )}
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 서비스 목록 */}
          <div className="space-y-3 mb-6">
            {filteredIntegrations.map(integration => {
              const isExpanded = expandedId === integration.id
              const currentValue = values[integration.envVar] || ''
              const hasValue = currentValue.length > 0
              
              return (
                <div
                  key={integration.id}
                  className={`glass rounded-xl overflow-hidden transition-all ${
                    hasValue ? 'ring-2 ring-green-500/50' : ''
                  }`}
                >
                  {/* 헤더 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        {hasValue && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            입력됨
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {integration.description}
                      </p>
                    </div>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* 확장 영역 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 pt-4">
                      {/* 가이드 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">설정 방법</span>
                          {integration.guideUrl && (
                            <a
                              href={integration.guideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              공식 문서 →
                            </a>
                          )}
                        </div>
                        <ol className="space-y-1">
                          {integration.guideSteps.map((step, i) => (
                            <li key={i} className="flex gap-2 text-xs text-gray-400">
                              <span className="text-indigo-400">{i + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* 입력 */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">
                          환경변수: <code className="text-indigo-400">{integration.envVar}</code>
                        </label>
                        <input
                          type="password"
                          value={currentValue}
                          onChange={(e) => handleValueChange(integration.envVar, e.target.value)}
                          placeholder={integration.placeholder}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 계속/확인 버튼 */}
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            {editMode 
              ? (configuredCount > 0 ? `✓ ${configuredCount}개 설정 확인` : '✓ 확인')
              : (configuredCount > 0 ? `${configuredCount}개 설정 완료 →` : '건너뛰고 계속 →')}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            설정은 최종 확인 후 저장됩니다
          </p>
        </div>
      </div>
    </div>
  )
}
