// DeleteModal - 삭제 확인 모달 (moldClaw만 / OpenClaw까지 선택)

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeleteOption = 'moldclaw' | 'all' | null;
type DeleteStep = 'select' | 'confirm' | 'processing' | 'done';

export default function DeleteModal({ isOpen, onClose }: DeleteModalProps) {
  const [selectedOption, setSelectedOption] = useState<DeleteOption>(null);
  const [step, setStep] = useState<DeleteStep>('select');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // 모달 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setStep('select');
      setConfirmChecked(false);
      setResult(null);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && step !== 'processing') {
      onClose();
    }
  };

  const handleSelectOption = (option: DeleteOption) => {
    setSelectedOption(option);
    setStep('confirm');
    setConfirmChecked(false);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedOption(null);
    setConfirmChecked(false);
  };

  const handleConfirm = async () => {
    if (!confirmChecked || !selectedOption) return;
    
    setStep('processing');
    
    try {
      if (selectedOption === 'moldclaw') {
        await invoke('uninstall_moldclaw_only');
        setResult('moldClaw 삭제 준비 완료.\n\n시스템 설정에서 앱을 삭제하세요.\nOpenClaw 설정은 유지됩니다.');
      } else {
        const res = await invoke<string>('uninstall_with_openclaw');
        setResult(res);
      }
      setStep('done');
    } catch (err) {
      setResult(`오류: ${err}`);
      setStep('done');
    }
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
            <h3 className="text-lg font-semibold text-forge-text">
              {step === 'select' ? '삭제 옵션 선택' : 
               step === 'confirm' ? '삭제 확인' :
               step === 'processing' ? '삭제 중...' : '완료'}
            </h3>
          </div>
          {step !== 'processing' && (
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
          )}
        </div>

        {/* 내용 */}
        <div className="p-6">
          
          {/* Step 1: 옵션 선택 */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-forge-muted text-center mb-4">
                삭제 범위를 선택하세요
              </p>
              
              {/* moldClaw만 삭제 */}
              <button
                onClick={() => handleSelectOption('moldclaw')}
                className="w-full p-4 bg-forge-surface border border-white/20 rounded-xl hover:border-white/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">📦</span>
                  <span className="font-medium text-forge-text">moldClaw만 삭제</span>
                </div>
                <ul className="text-xs text-forge-muted space-y-1 ml-8">
                  <li>✅ OpenClaw 설정 유지 (~/.openclaw)</li>
                  <li>✅ API 키, 인증 정보 유지</li>
                  <li>✅ 설치한 CLI 스킬 유지</li>
                </ul>
              </button>
              
              {/* OpenClaw까지 삭제 */}
              <button
                onClick={() => handleSelectOption('all')}
                className="w-full p-4 bg-forge-error/10 border border-white/20 rounded-xl hover:border-white/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">🗑️</span>
                  <span className="font-medium text-forge-error">OpenClaw까지 전부 삭제</span>
                </div>
                <ul className="text-xs text-forge-muted space-y-1 ml-8">
                  <li>❌ ~/.openclaw 폴더 삭제</li>
                  <li>❌ 모든 API 키, 인증 정보 삭제</li>
                  <li>❌ OpenClaw npm 패키지 제거</li>
                </ul>
              </button>
            </div>
          )}
          
          {/* Step 2: 확인 */}
          {step === 'confirm' && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-forge-muted hover:text-forge-text mb-4 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                뒤로
              </button>
              
              <div className={`card p-4 mb-4 ${selectedOption === 'all' ? 'bg-forge-error/10 border-forge-error/30' : 'bg-forge-surface border-[#2a2d3e]'}`}>
                <p className="text-forge-text font-medium mb-2">
                  {selectedOption === 'moldclaw' 
                    ? 'moldClaw 앱만 삭제합니다' 
                    : 'moldClaw와 OpenClaw를 모두 삭제합니다'}
                </p>
                <ul className="text-sm text-forge-muted space-y-1">
                  {selectedOption === 'moldclaw' ? (
                    <>
                      <li>• OpenClaw 설정은 유지됩니다</li>
                      <li>• 나중에 다시 설치하면 기존 설정 사용 가능</li>
                    </>
                  ) : (
                    <>
                      <li>• OpenClaw 프로그램 및 설정 파일 삭제</li>
                      <li>• API 키가 포함된 설정도 삭제</li>
                      <li>• moldClaw 앱도 함께 삭제</li>
                    </>
                  )}
                </ul>
              </div>

              {selectedOption === 'all' && (
                <p className="text-sm text-forge-error text-center mb-4">
                  ⚠️ 이 작업은 되돌릴 수 없습니다
                </p>
              )}

              {/* 안전장치: 체크박스 확인 */}
              <label className={`flex items-center gap-3 p-4 rounded-xl mb-4 cursor-pointer select-none ${
                selectedOption === 'all' 
                  ? 'bg-forge-error/20 border border-forge-error/40' 
                  : 'bg-forge-surface border border-[#2a2d3e]'
              }`}>
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="w-5 h-5 rounded border-forge-error/50 text-forge-error focus:ring-forge-error"
                />
                <span className={`text-sm font-medium ${selectedOption === 'all' ? 'text-forge-error' : 'text-forge-text'}`}>
                  위 내용을 확인했습니다
                </span>
              </label>

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
                  disabled={!confirmChecked}
                  className={`
                    flex-1 py-3 rounded-xl
                    font-semibold transition-colors
                    ${confirmChecked 
                      ? selectedOption === 'all'
                        ? 'bg-forge-error hover:bg-forge-error/80 text-white cursor-pointer'
                        : 'bg-forge-copper hover:bg-forge-copper/80 text-white cursor-pointer'
                      : 'bg-forge-surface text-forge-muted cursor-not-allowed'}
                  `}
                >
                  {selectedOption === 'moldclaw' ? '📦 삭제 준비' : '🗑️ 전체 삭제'}
                </button>
              </div>
            </>
          )}
          
          {/* Step 3: 처리 중 */}
          {step === 'processing' && (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin w-10 h-10 border-3 border-forge-copper/30 border-t-forge-copper rounded-full mb-4" />
              <p className="text-forge-text mb-2">삭제 중...</p>
              <p className="text-sm text-forge-muted">잠시 후 앱이 자동으로 종료됩니다</p>
            </div>
          )}
          
          {/* Step 4: 완료 */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="p-4 bg-forge-success/20 text-forge-success rounded-lg">
                <p className="font-medium mb-2">✓ 완료</p>
                <p className="text-sm whitespace-pre-line">{result}</p>
              </div>
              <p className="text-sm text-forge-muted">
                • Windows: 설정 → 앱 → moldClaw 제거<br/>
                • macOS: 응용 프로그램 → moldClaw → 휴지통<br/>
                • Linux: 패키지 매니저로 제거
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
              >
                닫기
              </button>
            </div>
          )}
          
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
