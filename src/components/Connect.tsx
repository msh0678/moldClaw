import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { FullConfig, MessengerConfig, GatewayConfig } from '../App'

interface ConnectProps {
  config: FullConfig
  originalConfig?: FullConfig  // 재설정 모드에서 원본 config (변경 비교용)
  hasChanges?: boolean  // 변경점이 있는지 여부
  onMessengerConfigUpdate: (config: Partial<MessengerConfig>) => void
  onGatewayConfigUpdate: (config: Partial<GatewayConfig>) => void
  onComplete: () => void
  onBack: () => void
}

interface Guide {
  title: string
  icon: string
  steps: string[]
  needsToken: boolean
  tokenPlaceholder?: string
  tokenLabel?: string
  guideUrl?: string
  allowFromPlaceholder: string
  allowFromHelp: string
}

const DM_POLICIES = [
  { value: 'pairing', label: '페어링 (코드 승인 필요)', desc: '처음 연락하는 사람은 코드로 승인이 필요합니다 (권장)' },
  { value: 'allowlist', label: '허용 목록만', desc: 'allowFrom에 등록된 사용자만 대화 가능' },
  { value: 'open', label: '모두 허용', desc: '⚠️ 누구나 봇과 대화할 수 있습니다' },
]

const GROUP_POLICIES = [
  { value: 'allowlist', label: '허용 목록만', desc: 'groupAllowFrom에 등록된 사용자만 그룹에서 트리거 가능' },
  { value: 'open', label: '모두 허용', desc: '그룹 내 모든 사용자가 봇을 트리거 가능' },
  { value: 'disabled', label: '비활성화', desc: '그룹 메시지 무시' },
]

const GATEWAY_BINDS = [
  { value: 'loopback', label: 'Loopback (127.0.0.1)', desc: '이 기기에서만 접근 가능 (가장 안전)' },
  { value: 'lan', label: 'LAN', desc: '로컬 네트워크에서 접근 가능' },
  { value: 'tailnet', label: 'Tailscale', desc: 'Tailscale 네트워크에서 접근 가능' },
  { value: 'auto', label: '자동', desc: 'Tailscale이 있으면 tailnet, 없으면 loopback' },
]

export default function Connect({ config, originalConfig: _originalConfig, hasChanges: _hasChanges = true, onMessengerConfigUpdate, onGatewayConfigUpdate, onComplete, onBack }: ConnectProps) {
  const [token, setToken] = useState(config.messenger.token)
  const [dmPolicy, setDmPolicy] = useState(config.messenger.dmPolicy)
  const [allowFrom, setAllowFrom] = useState(config.messenger.allowFrom.join('\n'))
  const [groupPolicy, setGroupPolicy] = useState(config.messenger.groupPolicy)
  const [groupAllowFrom, setGroupAllowFrom] = useState(config.messenger.groupAllowFrom.join('\n'))
  const [requireMention, setRequireMention] = useState(config.messenger.requireMention)
  
  const [gatewayPort, setGatewayPort] = useState(config.gateway.port)
  const [gatewayBind, setGatewayBind] = useState(config.gateway.bind)
  const [gatewayAuthMode, setGatewayAuthMode] = useState(config.gateway.authMode)
  const [gatewayPassword, setGatewayPassword] = useState(config.gateway.password)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const messenger = config.messenger.type!

  // 텍스트를 배열로 변환 (빈 줄 제거)
  const textToArray = (text: string): string[] => {
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  }

  // 모든 설정을 일괄 저장 (공식 OpenClaw 형식 사용)
  const saveAllConfigs = async () => {
    setLoading(true)
    setError(null)
    setCurrentStep(1)

    try {
      // Step 1: 공식 형식 Config 생성 (Device Identity 포함)
      // 이 단계에서 device.json과 기본 openclaw.json이 생성됨
      setStatus('설정 초기화 중... (Device Identity 생성)')
      const finalToken = await invoke<string>('create_official_config', {
        gatewayPort: gatewayPort,
        gatewayBind: gatewayBind,
      })
      setCurrentStep(2)

      // Step 2: 모델 설정 추가
      setStatus('AI 모델 설정 중...')
      if (config.model) {
        await invoke('add_model_to_config', {
          provider: config.model.provider,
          model: config.model.model,
          apiKey: config.model.apiKey,
        })
      }
      setCurrentStep(3)

      // Step 3: 메신저 채널 설정 추가
      setStatus('메신저 연결 설정 중...')
      const allowFromArray = textToArray(allowFrom)
      
      if (messenger === 'telegram' || messenger === 'discord') {
        await invoke('add_channel_to_config', {
          channel: messenger,
          botToken: token,
          dmPolicy,
          allowFrom: allowFromArray,
          groupPolicy,
          requireMention,
        })
      } else if (messenger === 'whatsapp') {
        await invoke('add_channel_to_config', {
          channel: 'whatsapp',
          botToken: '',  // WhatsApp은 QR 코드 연동
          dmPolicy,
          allowFrom: allowFromArray,
          groupPolicy,
          requireMention,
        })
      }
      setCurrentStep(4)

      // Step 4: Gateway 비밀번호 설정 (비밀번호 모드일 때)
      if (gatewayAuthMode === 'password' && gatewayPassword) {
        setStatus('Gateway 인증 설정 중...')
        await invoke('configure_gateway', {
          port: gatewayPort,
          bind: gatewayBind,
          authToken: '',
          authPassword: gatewayPassword,
        })
      }
      setCurrentStep(5)

      // Step 5: 외부 서비스 설정 (Integrations)
      setStatus('외부 서비스 설정 중...')
      const integrations = config.integrations
      for (const [envVar, value] of Object.entries(integrations)) {
        if (value && value.length > 0) {
          await invoke('set_env_config', { key: envVar, value })
        }
      }
      
      // 보안 설정 적용 (tools.exec 자동 실행)
      await invoke('apply_default_security_settings')
      setCurrentStep(6)

      // Step 6: 설정 검증
      setStatus('설정 검증 중...')
      await invoke<boolean>('validate_config')
      setCurrentStep(7)

      // Step 7: Gateway 시작
      setStatus('Gateway 시작 중...')
      try {
        const serviceResult = await invoke<string>('install_and_start_service')
        setStatus(serviceResult)
      } catch {
        await invoke('start_gateway')
        setStatus('Gateway가 시작되었습니다')
      }

      // 완료 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 부모에게 최종 설정 전달
      const groupAllowFromArray = textToArray(groupAllowFrom)
      onMessengerConfigUpdate({
        token,
        dmPolicy,
        allowFrom: allowFromArray,
        groupPolicy,
        groupAllowFrom: groupAllowFromArray,
        requireMention,
      })
      onGatewayConfigUpdate({
        port: gatewayPort,
        bind: gatewayBind,
        authMode: gatewayAuthMode,
        token: finalToken,
        password: gatewayPassword,
      })
      onComplete()

    } catch (err) {
      setError(String(err))
      setCurrentStep(0)
    } finally {
      setLoading(false)
    }
  }

  const guides: Record<string, Guide> = {
    telegram: {
      title: 'Telegram 연결',
      icon: '✈️',
      steps: [
        'Telegram에서 @BotFather 검색',
        '/newbot 명령으로 새 봇 생성',
        '봇 이름과 username 입력 (예: MyAI_bot)',
        '받은 토큰을 아래에 붙여넣기',
      ],
      needsToken: true,
      tokenPlaceholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      tokenLabel: 'Bot Token',
      guideUrl: 'https://t.me/BotFather',
      allowFromPlaceholder: '123456789\n@username',
      allowFromHelp: 'Telegram 사용자 ID 또는 @username (한 줄에 하나씩)',
    },
    discord: {
      title: 'Discord 연결',
      icon: '🎮',
      steps: [
        'Discord Developer Portal에서 New Application 생성',
        'Bot 탭 → Add Bot → Reset Token',
        '⚠️ MESSAGE CONTENT INTENT 활성화 필수!',
        'OAuth2 → URL Generator에서 봇 초대 링크 생성',
      ],
      needsToken: true,
      tokenPlaceholder: 'MTIzNDU2Nzg5MDEyMzQ1Njc4.Gg...',
      tokenLabel: 'Bot Token',
      guideUrl: 'https://discord.com/developers/applications',
      allowFromPlaceholder: '123456789012345678\nusername',
      allowFromHelp: 'Discord 사용자 ID 또는 username (한 줄에 하나씩)',
    },
    whatsapp: {
      title: 'WhatsApp 연결',
      icon: '💚',
      steps: [
        '"설치 시작" 버튼을 클릭',
        '터미널에 표시되는 QR 코드 확인',
        'WhatsApp 앱 → 설정 → 연결된 기기',
        '기기 연결 → QR 코드 스캔',
      ],
      needsToken: false,
      allowFromPlaceholder: '+821012345678\n+14155551234',
      allowFromHelp: 'E.164 형식의 전화번호 (한 줄에 하나씩)',
    },
  }

  const guide = guides[messenger]
  const totalSteps = 7
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen flex flex-col p-6 overflow-auto">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        disabled={loading}
        className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 disabled:opacity-50"
      >
        ← 뒤로
      </button>

      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-lg w-full">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{guide.icon}</div>
            <h2 className="text-2xl font-bold">{guide.title}</h2>
          </div>

          {/* 진행률 바 */}
          {loading && (
            <div className="mb-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">
                {currentStep}/{totalSteps} 단계
              </p>
            </div>
          )}

          {/* 가이드 단계 */}
          <div className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-300">연결 방법</h3>
              {guide.guideUrl && (
                <a
                  href={guide.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  가이드 열기 →
                </a>
              )}
            </div>
            <ol className="space-y-2">
              {guide.steps.map((stepText, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className={`text-gray-300 ${stepText.startsWith('⚠️') ? 'text-yellow-400' : ''}`}>
                    {stepText}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* 기본 설정 */}
          <div className="space-y-4 mb-6">
            {/* 토큰 입력 */}
            {guide.needsToken && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  {guide.tokenLabel}
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={guide.tokenPlaceholder}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono disabled:opacity-50"
                />
              </div>
            )}

            {/* DM 정책 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                DM 접근 정책
              </label>
              <select
                value={dmPolicy}
                onChange={(e) => setDmPolicy(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
              >
                {DM_POLICIES.map((option) => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {DM_POLICIES.find(p => p.value === dmPolicy)?.desc}
              </p>
            </div>

            {/* allowFrom (DM용) */}
            {(dmPolicy === 'allowlist' || dmPolicy === 'pairing') && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  허용 사용자 (allowFrom)
                  <span className="text-gray-500 font-normal ml-2">
                    {dmPolicy === 'pairing' ? '(선택)' : '(필수)'}
                  </span>
                </label>
                <textarea
                  value={allowFrom}
                  onChange={(e) => setAllowFrom(e.target.value)}
                  placeholder={guide.allowFromPlaceholder}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono disabled:opacity-50 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {guide.allowFromHelp}
                </p>
              </div>
            )}
          </div>

          {/* 고급 설정 토글 */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={loading}
            className="w-full mb-4 py-2 text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2"
          >
            {showAdvanced ? '▲ 고급 설정 숨기기' : '▼ 고급 설정 보기'}
          </button>

          {/* 고급 설정 */}
          {showAdvanced && (
            <div className="space-y-4 mb-6 p-4 glass rounded-xl">
              <h4 className="text-sm font-medium text-gray-300 mb-3">그룹 채팅 설정</h4>
              
              {/* 그룹 정책 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  그룹 정책 (groupPolicy)
                </label>
                <select
                  value={groupPolicy}
                  onChange={(e) => setGroupPolicy(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                >
                  {GROUP_POLICIES.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {GROUP_POLICIES.find(p => p.value === groupPolicy)?.desc}
                </p>
              </div>

              {/* 그룹 allowFrom */}
              {groupPolicy === 'allowlist' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">
                    그룹 허용 사용자 (groupAllowFrom)
                  </label>
                  <textarea
                    value={groupAllowFrom}
                    onChange={(e) => setGroupAllowFrom(e.target.value)}
                    placeholder={guide.allowFromPlaceholder}
                    disabled={loading}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono disabled:opacity-50 resize-none"
                  />
                </div>
              )}

              {/* 멘션 필요 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    그룹에서 멘션 필요
                  </label>
                  <p className="text-xs text-gray-500">
                    @봇이름으로 호출해야 응답
                  </p>
                </div>
                <button
                  onClick={() => setRequireMention(!requireMention)}
                  disabled={loading}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    requireMention ? 'bg-indigo-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    requireMention ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <hr className="border-white/10 my-4" />
              
              <h4 className="text-sm font-medium text-gray-300 mb-3">Gateway 설정</h4>

              {/* Gateway 포트 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  포트
                </label>
                <input
                  type="number"
                  value={gatewayPort}
                  onChange={(e) => setGatewayPort(Number(e.target.value))}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                />
              </div>

              {/* Gateway 바인드 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  바인드 모드
                </label>
                <select
                  value={gatewayBind}
                  onChange={(e) => setGatewayBind(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                >
                  {GATEWAY_BINDS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {GATEWAY_BINDS.find(b => b.value === gatewayBind)?.desc}
                </p>
              </div>

              {/* Gateway 인증 모드 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  인증 방식
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGatewayAuthMode('token')}
                    disabled={loading}
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      gatewayAuthMode === 'token' 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    토큰 (자동 생성)
                  </button>
                  <button
                    onClick={() => setGatewayAuthMode('password')}
                    disabled={loading}
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      gatewayAuthMode === 'password' 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    비밀번호
                  </button>
                </div>
              </div>

              {/* 비밀번호 입력 */}
              {gatewayAuthMode === 'password' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">
                    Gateway 비밀번호
                  </label>
                  <input
                    type="password"
                    value={gatewayPassword}
                    onChange={(e) => setGatewayPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* 상태 표시 */}
          {status && (
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-300 text-center">
              {status}
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
              <p className="font-medium mb-1">오류 발생</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          )}

          {/* 설치 시작 버튼 */}
          <button
            onClick={saveAllConfigs}
            disabled={loading || (guide.needsToken && !token)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                설치 중...
              </span>
            ) : (
              '🚀 설치 시작'
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            모든 설정이 저장되고 Gateway가 시작됩니다
          </p>
        </div>
      </div>
    </div>
  )
}
