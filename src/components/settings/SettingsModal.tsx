// SettingsModal - 호버 창 + 블러 효과
// 빠른 페이드 인/아웃

import { useEffect, useRef } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SettingsModal({
  isOpen,
  title,
  onClose,
  children,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 모달 외부 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center p-4
        animate-fadeIn
      "
      onClick={handleBackdropClick}
    >
      {/* 블러 배경 - 더 불투명하게 */}
      <div 
        className="
          absolute inset-0 bg-[#0a0b0f]/90 backdrop-blur-lg
          animate-fadeIn
        " 
      />

      {/* 모달 컨텐츠 - 완전 불투명 */}
      <div
        ref={modalRef}
        className="
          relative z-10 w-full max-w-lg max-h-[80vh]
          bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-2xl
          shadow-2xl shadow-black/60 overflow-hidden
          animate-fadeIn
        "
        style={{
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-forge-text">{title}</h3>
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

        {/* 컨텐츠 */}
        <div className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
          {children}
        </div>

        {/* 하단 버튼 영역 (children에서 제공하지 않을 경우) */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
          >
            닫기
          </button>
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
