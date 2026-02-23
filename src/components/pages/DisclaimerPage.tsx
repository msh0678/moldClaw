// DisclaimerPage - 첫 실행 시 법적 고지 및 동의 페이지
// LEGAL_DISCLAIMER_KR.md 기반

import { useState } from 'react';

interface DisclaimerPageProps {
  onAgree: () => void;
}

export default function DisclaimerPage({ onAgree }: DisclaimerPageProps) {
  const [agreements, setAgreements] = useState({
    terms: false,
    security: false,
    cost: false,
  });
  const [showFullTerms, setShowFullTerms] = useState(false);

  const allAgreed = agreements.terms && agreements.security && agreements.cost;

  const handleToggle = (key: keyof typeof agreements) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAgreeAll = () => {
    setAgreements({ terms: true, security: true, cost: true });
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚖️</div>
          <h1 className="text-2xl font-bold text-forge-text mb-2">
            moldClaw 이용약관
          </h1>
          <p className="text-forge-muted text-sm">
            서비스 이용 전 아래 내용을 확인해 주세요
          </p>
        </div>

        {/* 주요 고지 카드들 */}
        <div className="space-y-4 mb-6">
          {/* 보안 경고 */}
          <div className="card p-4 bg-forge-error/5 border-forge-error/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔓</span>
              <div className="flex-1">
                <h3 className="font-bold text-forge-text mb-2">보안 취약점 고지</h3>
                <ul className="text-sm text-forge-muted space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span><strong className="text-forge-text">프롬프트 주입 공격</strong>: 악의적 메시지로 AI 행동이 조작될 수 있습니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span><strong className="text-forge-text">토큰 평문 저장</strong>: API 키가 암호화 없이 저장됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span><strong className="text-forge-text">시스템 접근</strong>: AI가 파일 읽기/쓰기, 명령 실행을 수행할 수 있습니다</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 비용 경고 */}
          <div className="card p-4 bg-forge-amber/5 border-forge-amber/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div className="flex-1">
                <h3 className="font-bold text-forge-text mb-2">API 비용 책임</h3>
                <ul className="text-sm text-forge-muted space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber">•</span>
                    <span>AI API(Claude, GPT 등) 사용 비용은 <strong className="text-forge-text">전적으로 사용자 책임</strong>입니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber">•</span>
                    <span>"모두 허용" 설정 시 <strong className="text-forge-text">예상치 못한 비용 폭증</strong>이 발생할 수 있습니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber">•</span>
                    <span>API 제공업체 대시보드에서 <strong className="text-forge-text">사용량 제한 설정</strong>을 권장합니다</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* WhatsApp 경고 */}
          <div className="card p-4 bg-forge-error/5 border-forge-error/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <h3 className="font-bold text-forge-text mb-2">WhatsApp 경고</h3>
                <ul className="text-sm text-forge-muted space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span>WhatsApp 연동은 <strong className="text-forge-error">비공식 API</strong>를 사용합니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span>Meta(WhatsApp) 이용약관 위반으로 <strong className="text-forge-error">계정이 영구 차단</strong>될 수 있습니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-error">•</span>
                    <span>개발자는 WhatsApp 사용으로 인한 <strong className="text-forge-text">어떠한 결과에도 책임지지 않습니다</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 법적 고지 */}
          <div className="card p-4 bg-forge-surface/50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚖️</span>
              <div className="flex-1">
                <h3 className="font-bold text-forge-text mb-2">법적 책임 고지</h3>
                <ul className="text-sm text-forge-muted space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-forge-copper">•</span>
                    <span><strong className="text-forge-text">개인정보 보호법</strong>: 그룹 채팅에서 제3자 메시지를 AI에게 전송 시 위반 가능</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-copper">•</span>
                    <span><strong className="text-forge-text">정보통신망법</strong>: 타인 시스템 무단 접근, 서비스 방해 금지</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-copper">•</span>
                    <span><strong className="text-forge-text">저작권법</strong>: 웹 스크래핑 시 저작권 및 이용약관 준수 필요</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 전체 약관 보기 토글 */}
        <div className="mb-6">
          <button
            onClick={() => setShowFullTerms(!showFullTerms)}
            className="text-sm text-forge-copper hover:text-forge-amber transition-colors flex items-center gap-2"
          >
            <span>{showFullTerms ? '▼' : '▶'}</span>
            <span>전체 이용약관 보기</span>
          </button>
          
          {showFullTerms && (
            <div className="mt-3 card p-4 max-h-60 overflow-y-auto text-xs text-forge-muted bg-forge-night/50">
              <h4 className="font-bold text-forge-text mb-2">제8조 (면책조항)</h4>
              <p className="mb-3">
                <strong>8.1 소프트웨어 "있는 그대로" 제공</strong><br/>
                본 소프트웨어는 "있는 그대로(AS IS)" 제공되며, 명시적이든 묵시적이든 어떠한 종류의 보증도 없습니다.
              </p>
              <p className="mb-3">
                <strong>8.2 손해배상 책임 제한</strong><br/>
                어떠한 경우에도 본 소프트웨어의 개발자, 기여자, 관련 당사자는 본 소프트웨어의 사용으로 인해 발생하는 
                직접적, 간접적, 부수적, 특별, 징벌적 또는 결과적 손해에 대해 책임지지 않습니다.
              </p>
              <p className="mb-3">
                <strong>8.3 AI 행동에 대한 면책</strong><br/>
                AI 모델의 판단, 응답, 행동에 대해 본 소프트웨어 개발자는 어떠한 책임도 지지 않습니다.
              </p>
              <p className="mb-3">
                <strong>8.4 제3자 서비스에 대한 면책</strong><br/>
                본 소프트웨어가 연동하는 제3자 서비스의 이용약관 위반, 서비스 중단, 계정 제재 등에 대해 책임지지 않습니다.
              </p>
              <p>
                <strong>8.5 보안 침해에 대한 면책</strong><br/>
                본 소프트웨어의 알려진 보안 취약점을 악용한 공격으로 인한 피해에 대해 책임지지 않습니다.
              </p>
              <hr className="my-3 border-forge-surface" />
              <p className="text-forge-muted">
                <strong>준거법:</strong> 대한민국 법률<br/>
                <strong>기준 문서:</strong> OpenClaw MIT License (Copyright © 2025 Peter Steinberger)
              </p>
            </div>
          )}
        </div>

        {/* 동의 체크박스 */}
        <div className="card p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-forge-text">동의 항목</span>
            <button
              onClick={handleAgreeAll}
              className="text-xs text-forge-copper hover:text-forge-amber transition-colors"
            >
              전체 동의
            </button>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.terms}
              onChange={() => handleToggle('terms')}
              className="mt-0.5 w-5 h-5 rounded border-forge-surface bg-forge-night text-forge-copper focus:ring-forge-copper/50"
            />
            <span className="text-sm text-forge-muted group-hover:text-forge-text transition-colors">
              <strong className="text-forge-text">이용약관</strong>을 모두 읽었으며, 모든 조항에 동의합니다.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.security}
              onChange={() => handleToggle('security')}
              className="mt-0.5 w-5 h-5 rounded border-forge-surface bg-forge-night text-forge-copper focus:ring-forge-copper/50"
            />
            <span className="text-sm text-forge-muted group-hover:text-forge-text transition-colors">
              <strong className="text-forge-error">보안 취약점</strong>을 인지하고, 본인 책임하에 사용합니다.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.cost}
              onChange={() => handleToggle('cost')}
              className="mt-0.5 w-5 h-5 rounded border-forge-surface bg-forge-night text-forge-copper focus:ring-forge-copper/50"
            />
            <span className="text-sm text-forge-muted group-hover:text-forge-text transition-colors">
              <strong className="text-forge-amber">AI API 비용</strong>이 전적으로 사용자 책임임을 이해합니다.
            </span>
          </label>
        </div>

        {/* 동의 버튼 */}
        <button
          onClick={onAgree}
          disabled={!allAgreed}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            allAgreed
              ? 'btn-primary'
              : 'bg-forge-surface/50 text-forge-muted cursor-not-allowed'
          }`}
        >
          {allAgreed ? '동의하고 시작하기' : '모든 항목에 동의해 주세요'}
        </button>

        {/* 하단 정보 */}
        <p className="text-center text-xs text-forge-muted mt-4">
          moldClaw v0.5.3+ • OpenClaw 기반 • MIT License
        </p>
      </div>
    </div>
  );
}
