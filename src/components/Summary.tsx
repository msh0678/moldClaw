import type { FullConfig } from '../App'

interface SummaryProps {
  config: FullConfig
  onConfirm: () => void
  onEdit: (step: string) => void
  onBack: () => void
}

export default function Summary({ config, onConfirm, onEdit, onBack }: SummaryProps) {
  const messengerNames: Record<string, string> = {
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
  }

  const messengerIcons: Record<string, string> = {
    telegram: '✈️',
    discord: '🎮',
    whatsapp: '💚',
  }

  const policyNames: Record<string, string> = {
    pairing: '페어링',
    allowlist: '허용 목록',
    open: '모두 허용',
    disabled: '비활성화',
  }

  const integrationCount = Object.keys(config.integrations).filter(
    k => config.integrations[k]?.length > 0
  ).length

  // 설정 완성도 계산
  const completeness = {
    model: config.model !== null,
    messenger: config.messenger.type !== null,
    // WhatsApp은 토큰 불필요, 나머지는 토큰 필요
    messengerToken: config.messenger.type === null 
      || config.messenger.type === 'whatsapp' 
      || config.messenger.token.length > 10,
  }

  const isComplete = completeness.model && completeness.messenger && completeness.messengerToken

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← 뒤로
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          {/* 타이틀 */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-2xl font-bold mb-2">설정 확인</h2>
            <p className="text-gray-400 text-sm">
              아래 설정으로 OpenClaw를 시작합니다
            </p>
          </div>

          {/* 설정 요약 카드들 */}
          <div className="space-y-4 mb-8">
            {/* AI 모델 */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">AI 모델</span>
                <button
                  onClick={() => onEdit('model')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  수정
                </button>
              </div>
              {config.model ? (
                <div>
                  <div className="font-medium">{config.model.model}</div>
                  <div className="text-sm text-gray-500">
                    {config.model.provider} · API 키 설정됨
                  </div>
                </div>
              ) : (
                <div className="text-red-400">⚠️ 설정 필요</div>
              )}
            </div>

            {/* 메신저 */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">메신저</span>
                <button
                  onClick={() => onEdit('messenger')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  수정
                </button>
              </div>
              {config.messenger.type ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {messengerIcons[config.messenger.type]}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">
                      {messengerNames[config.messenger.type]}
                    </div>
                    <div className="text-sm text-gray-500">
                      DM: {policyNames[config.messenger.dmPolicy]}
                      {config.messenger.allowFrom.length > 0 && (
                        <span> · {config.messenger.allowFrom.length}명 허용</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      그룹: {policyNames[config.messenger.groupPolicy]}
                      {config.messenger.requireMention && ' · 멘션 필요'}
                    </div>
                    {config.messenger.type !== 'whatsapp' && (
                      <div className={`text-xs mt-1 ${config.messenger.token ? 'text-green-500' : 'text-red-400'}`}>
                        {config.messenger.token ? '✓ 토큰 설정됨' : '⚠️ 토큰이 필요합니다'}
                      </div>
                    )}
                    {config.messenger.type === 'whatsapp' && (
                      <div className="text-xs text-green-500 mt-1">
                        ✓ QR 코드 스캔 방식 (토큰 불필요)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-red-400">⚠️ 선택 필요</div>
              )}
            </div>

            {/* 외부 서비스 */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">외부 서비스</span>
                <button
                  onClick={() => onEdit('integrations')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  수정
                </button>
              </div>
              {integrationCount > 0 ? (
                <div>
                  <div className="font-medium">{integrationCount}개 서비스 설정</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {Object.entries(config.integrations)
                      .filter(([_, v]) => v?.length > 0)
                      .slice(0, 3)
                      .map(([k]) => k.replace(/_API_KEY|_TOKEN|_URL/g, ''))
                      .join(', ')}
                    {integrationCount > 3 && ` 외 ${integrationCount - 3}개`}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">설정된 서비스 없음 (선택사항)</div>
              )}
            </div>

            {/* Gateway 설정 */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Gateway</span>
                <span className="text-xs text-gray-600">Connect에서 상세 설정</span>
              </div>
              <div className="text-sm text-gray-500">
                포트 {config.gateway.port} · {config.gateway.bind} · {config.gateway.authMode} 인증
              </div>
            </div>
          </div>

          {/* 경고 메시지 */}
          {!isComplete && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-sm text-yellow-400">
                ⚠️ 필수 설정이 완료되지 않았습니다. 위에서 빨간색 항목을 확인하세요.
              </p>
            </div>
          )}

          {/* 안내 */}
          <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <p className="text-sm text-indigo-300">
              💡 다음 단계에서 메신저 토큰, allowFrom, 고급 설정을 입력할 수 있습니다.
            </p>
          </div>

          {/* 확인 버튼 */}
          <button
            onClick={onConfirm}
            disabled={!completeness.model || !completeness.messenger}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            다음: 연결 설정 →
          </button>
        </div>
      </div>
    </div>
  )
}
