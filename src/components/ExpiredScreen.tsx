interface ExpiredScreenProps {
  message?: string;
  onContinue?: () => void;
}

export default function ExpiredScreen({ message, onContinue }: ExpiredScreenProps) {
  const defaultMessage = `moldClaw 테스트 기간이 종료되었습니다.

관리자가 배포한 토큰 및 봇은 만료됩니다.

피드백이 있으시면 hexagon0678@gmail.com으로 전달해 주시면 감사하겠습니다.`;

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
          
          {/* 문의 안내 */}
          <div className="pt-3 border-t border-[#2a2d3e]">
            <p className="text-xs text-forge-muted mb-2">문의 및 피드백</p>
            <a
              href="mailto:hexagon0678@gmail.com"
              className="inline-flex items-center gap-2 text-forge-copper hover:text-forge-amber transition-colors text-sm"
            >
              <span>hexagon0678@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
