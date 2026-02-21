import { useState, useEffect } from 'react'
import type { ModelConfig } from '../App'

interface ModelSetupProps {
  initialConfig: ModelConfig | null
  onComplete: (config: ModelConfig) => void
  onBack: () => void
  onGoToDashboard?: () => void
  isOnboarding?: boolean  // 온보딩 모드일 때 첫 단계 강조
  editMode?: boolean  // Summary에서 수정 모드로 진입했을 때
}

const providers = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🟣',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: '추천 - 균형잡힌 성능' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: '빠르고 저렴' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', desc: '최고 성능' },
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: '최신 멀티모달' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: '빠르고 저렴' },
    ],
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🔵',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: '빠른 응답' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: '긴 컨텍스트' },
    ],
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
]

export default function ModelSetup({ initialConfig, onComplete, onBack, onGoToDashboard, isOnboarding = false, editMode = false }: ModelSetupProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    initialConfig?.provider || null
  )
  const [selectedModel, setSelectedModel] = useState<string | null>(
    initialConfig?.model || null
  )
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '')
  const [showKey, setShowKey] = useState(false)

  // 초기값이 변경되면 상태 업데이트
  useEffect(() => {
    if (initialConfig) {
      setSelectedProvider(initialConfig.provider)
      setSelectedModel(initialConfig.model)
      setApiKey(initialConfig.apiKey)
    }
  }, [initialConfig])

  const provider = providers.find(p => p.id === selectedProvider)

  const handleSubmit = () => {
    if (selectedProvider && selectedModel && apiKey) {
      onComplete({
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey,
      })
    }
  }

  const isValid = selectedProvider && selectedModel && apiKey.length > 10

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← {editMode ? '취소' : '뒤로'}
        </button>
        
        {onGoToDashboard && (
          <button 
            onClick={onGoToDashboard}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2"
          >
            🏠 관리센터
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🤖</div>
            <h2 className="text-2xl font-bold mb-2">AI 모델 설정</h2>
            <p className="text-gray-400 text-sm">사용할 AI와 API 키를 입력하세요</p>
          </div>

          {/* 프로바이더 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">
              AI 서비스
              {isOnboarding && !selectedProvider && (
                <span className="ml-2 text-forge-copper animate-pulse">← 여기서 시작!</span>
              )}
            </label>
            <div className={`grid grid-cols-3 gap-2 ${
              isOnboarding && !selectedProvider ? 'ring-2 ring-forge-copper ring-offset-2 ring-offset-forge-dark rounded-xl animate-pulse-border' : ''
            }`}>
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProvider(p.id)
                    setSelectedModel(null)
                  }}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedProvider === p.id
                      ? 'bg-indigo-500/30 border-2 border-indigo-500'
                      : 'glass hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="text-xs">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 모델 선택 */}
          {provider && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">모델</label>
              <div className="space-y-2">
                {provider.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedModel === m.id
                        ? 'bg-indigo-500/30 border-2 border-indigo-500'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API 키 입력 */}
          {selectedModel && provider && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">API 키</label>
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  키 발급받기 →
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider.keyPlaceholder}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono pr-12"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                🔒 키는 이 기기에만 저장되며 외부로 전송되지 않습니다
              </p>
            </div>
          )}

          {/* 다음/확인 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {editMode ? '✓ 확인' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  )
}
