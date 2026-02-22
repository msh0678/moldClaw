// ProgressBar - 온보딩 진행률 표시
// 좌측에 세로로 표시, 완료된 단계는 클릭 가능

import type { OnboardingStep } from '../../types/config';

interface ProgressBarProps {
  steps: OnboardingStep[];
  stepLabels: Record<OnboardingStep, string>;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  onStepClick: (step: OnboardingStep) => void;
}

export default function ProgressBar({
  steps,
  stepLabels,
  currentStep,
  completedSteps,
  onStepClick,
}: ProgressBarProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="w-64 bg-forge-dark border-r border-white/10 flex flex-col">
      {/* 헤더 */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/app-icon.png" 
            alt="moldClaw" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-forge-text">moldClaw</h1>
            <p className="text-xs text-forge-muted">초기 설정</p>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="flex-1 p-6">
        <div className="relative">
          {/* 세로 연결선 */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-forge-surface" />
          
          {/* 진행된 부분 하이라이트 */}
          <div 
            className="absolute left-4 top-4 w-0.5 bg-forge-copper transition-all duration-300"
            style={{ 
              height: `${Math.max(0, currentIndex) * (100 / (steps.length - 1))}%` 
            }}
          />

          {/* 스텝들 */}
          <div className="space-y-8 relative">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step);
              const isCurrent = step === currentStep;
              const isClickable = isCompleted;

              return (
                <button
                  key={step}
                  onClick={() => isClickable && onStepClick(step)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-4 w-full text-left transition-all
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                    ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-50'}
                  `}
                >
                  {/* 원형 인디케이터 */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    border-2 transition-all z-10 bg-forge-night
                    ${isCurrent 
                      ? 'border-forge-copper text-forge-copper animate-pulse-border' 
                      : isCompleted 
                        ? 'border-forge-success bg-forge-success/20 text-forge-success' 
                        : 'border-forge-surface text-forge-muted'
                    }
                  `}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* 레이블 */}
                  <div className="flex-1">
                    <p className={`
                      font-medium text-sm
                      ${isCurrent ? 'text-forge-copper' : isCompleted ? 'text-forge-text' : 'text-forge-muted'}
                    `}>
                      {stepLabels[step]}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-forge-amber mt-0.5">현재 단계</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-forge-muted text-center">
          {currentIndex + 1} / {steps.length} 단계
        </p>
      </div>
    </div>
  );
}
