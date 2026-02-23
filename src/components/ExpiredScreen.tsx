interface ExpiredScreenProps {
  message?: string;
  onContinue?: () => void;
}

export default function ExpiredScreen({ message, onContinue }: ExpiredScreenProps) {
  const defaultMessage = `moldClaw 테스트가 종료되었습니다.

공식 배포 버전인 forgeClaw를 기대해 주세요.

관리자가 배포한 토큰 및 봇은 만료됩니다.

moldClaw를 삭제하고, 관리자에게 피드백을 전달해 주시면 감사하겠습니다.`;

  return (
    <div className="gradient-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-forge-amber/20 border-2 border-forge-amber/40 flex items-center justify-center">
          <span className="text-4xl">⏰</span>
        </div>
        
        {/* 제목 */}
        <h1 className="text-2xl font-bold text-forge-text mb-2">
          테스트 기간 종료
        </h1>
        <p className="text-forge-muted text-sm mb-6">
          moldClaw 베타 테스트가 만료되었습니다
        </p>
        
        {/* 메시지 카드 */}
        <div className="card p-6 mb-6 text-left">
          <p className="text-forge-text whitespace-pre-line leading-relaxed text-sm">
            {message || defaultMessage}
          </p>
        </div>
        
        {/* 감사 메시지 */}
        <div className="flex items-center justify-center gap-2 text-forge-muted text-sm mb-6">
          <span>🙏</span>
          <span>테스트에 참여해 주셔서 감사합니다</span>
        </div>

        {/* 버튼 그룹 */}
        <div className="space-y-3">
          {onContinue && (
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-xl bg-forge-surface border-2 border-[#2a2d3e] text-forge-text font-medium hover:bg-[#252836] hover:border-forge-copper/30 transition-all"
            >
              확인했습니다, 계속 사용하기
            </button>
          )}
          
          {/* forgeClaw 안내 */}
          <div className="pt-3 border-t border-[#2a2d3e]">
            <p className="text-xs text-forge-muted mb-2">공식 버전 출시 시 알림 받기</p>
            <a
              href="https://forgeclaw.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-forge-copper hover:text-forge-amber transition-colors text-sm"
            >
              <span>forgeClaw 사이트 방문</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
