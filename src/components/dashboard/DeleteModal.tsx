// DeleteModal - 삭제 확인 모달 (호버 창 + 블러 효과)

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      {/* 블러 배경 */}
      <div className="absolute inset-0 bg-forge-night/80 backdrop-blur-md" />

      {/* 모달 */}
      <div
        className="
          relative z-10 w-full max-w-md
          bg-forge-dark border border-forge-error/30 rounded-2xl
          shadow-2xl overflow-hidden
        "
        style={{
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-forge-text">삭제 확인</h3>
          </div>
          <button
            onClick={onClose}
            className="
              w-8 h-8 rounded-lg bg-forge-surface hover:bg-forge-error/20
              flex items-center justify-center
              text-forge-muted hover:text-forge-error
              transition-colors
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          <div className="card p-4 bg-forge-error/10 border-forge-error/30 mb-4">
            <p className="text-forge-text font-medium mb-2">
              moldClaw와 OpenClaw를 모두 삭제합니다
            </p>
            <ul className="text-sm text-forge-muted space-y-1">
              <li>• OpenClaw 프로그램 및 설정 파일 삭제</li>
              <li>• API 키가 포함된 설정도 삭제</li>
              <li>• moldClaw 앱도 함께 삭제</li>
            </ul>
          </div>

          <p className="text-sm text-forge-error text-center mb-6">
            ⚠️ 이 작업은 되돌릴 수 없습니다
          </p>

          {/* 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="
                flex-1 py-3 rounded-xl
                bg-forge-surface hover:bg-white/10
                text-forge-text transition-colors
              "
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              className="
                flex-1 py-3 rounded-xl
                bg-forge-error hover:bg-forge-error/80
                text-white font-semibold transition-colors
              "
            >
              🗑️ 삭제
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
