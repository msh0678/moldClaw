interface ExpiredScreenProps {
  message?: string;
}

export default function ExpiredScreen({ message }: ExpiredScreenProps) {
  const defaultMessage = `moldClaw 테스트가 종료됐습니다!

공식 배포 버전인 forgeClaw를 기대해주세요.

관리자가 배포한 토큰 및 봇은 만료됩니다.

이제 moldClaw를 삭제하고, 관리자에게 소중한 피드백을 전달해주세요!`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-md w-full text-center">
        {/* 아이콘 */}
        <div className="mb-6 text-6xl">⏰</div>
        
        {/* 제목 */}
        <h1 className="text-2xl font-bold text-white mb-6">
          테스트 기간 종료
        </h1>
        
        {/* 메시지 */}
        <div className="bg-white/10 rounded-xl p-6 mb-6">
          <p className="text-gray-200 whitespace-pre-line leading-relaxed">
            {message || defaultMessage}
          </p>
        </div>
        
        {/* 감사 메시지 */}
        <p className="text-gray-400 text-sm">
          테스트에 참여해주셔서 감사합니다! 🙏
        </p>
      </div>
    </div>
  );
}
