import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { IntegrationConfig } from '../App'

interface IntegrationsProps {
  initialValues: IntegrationConfig | null  // null이면 editMode에서 직접 로드
  onUpdate?: (integrations: IntegrationConfig) => void  // 온보딩용
  onComplete: () => void
  onBack: () => void
  onSkip: () => void
  editMode?: boolean
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
    icon: '🤖',
    envVar: 'MINIMAX_API_KEY',
    description: '중국 AI 모델 (abab 시리즈)',
    guideUrl: 'https://api.minimax.chat/',
    guideSteps: [
      'MiniMax 계정 생성',
      'API Management → Create Key',
      '키 복사',
    ],
    placeholder: 'eyJ...',
  },
  // 외부 도구
  {
    id: 'brave',
    name: 'Brave Search',
    category: '외부 도구',
    icon: '🔍',
    envVar: 'BRAVE_SEARCH_API_KEY',
    description: '웹 검색 기능 (구글 대안)',
    guideUrl: 'https://brave.com/search/api/',
    guideSteps: [
      'Brave Search API 가입',
      'Dashboard → API Keys',
      '키 복사 (무료 2,000회/월)',
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
  const [values, setValues] = useState<IntegrationConfig>(initialValues || {})
  const [loading, setLoading] = useState(false)

  // editMode일 때 현재 설정 로드
  useEffect(() => {
    if (editMode && !initialValues) {
      loadCurrentConfig()
    }
  }, [editMode, initialValues])

  // initialValues가 있으면 상태 업데이트
  useEffect(() => {
    if (initialValues) {
      setValues(initialValues)
    }
  }, [initialValues])

  const loadCurrentConfig = async () => {
    setLoading(true)
    try {
      const config = await invoke<IntegrationConfig>('get_integrations_config')
      if (config) {
        setValues(config)
      }
    } catch (err) {
      console.error('부가기능 설정 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredIntegrations = INTEGRATIONS.filter(i => i.category === selectedCategory)

  const handleValueChange = (envVar: string, value: string) => {
    const newValues = { ...values, [envVar]: value }
    setValues(newValues)
  }

  const handleContinue = async () => {
    // editMode일 때는 직접 저장
    if (editMode) {
      setLoading(true)
      try {
        await invoke('update_integrations_config', { integrations: values })
        onComplete()
      } catch (err) {
        console.error('부가기능 설정 저장 실패:', err)
        alert(`저장 실패: ${err}`)
      } finally {
        setLoading(false)
      }
    } else {
      // 온보딩 모드 - 상위 컴포넌트에서 처리
      if (onUpdate) {
        onUpdate(values)
      }
      onComplete()
    }
  }

  const configuredCount = Object.values(values).filter(v => v && v.length > 0).length

  if (loading && editMode && Object.keys(values).length === 0) {
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
              {editMode ? '외부 서비스 설정을 변경합니다' : '추가 기능을 위한 API 키를 설정하세요 (선택)'}
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
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '저장 중...' : editMode 
              ? (configuredCount > 0 ? `✓ ${configuredCount}개 설정 확인` : '✓ 확인')
              : (configuredCount > 0 ? `${configuredCount}개 설정 완료 →` : '건너뛰고 계속 →')}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            {editMode ? '변경사항이 즉시 저장됩니다' : '설정은 최종 확인 후 저장됩니다'}
          </p>
        </div>
      </div>
    </div>
  )
}
