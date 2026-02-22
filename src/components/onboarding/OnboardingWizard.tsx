// OnboardingWizard - 온보딩 메인 컴포넌트
// 플로우: 모델 → 메신저 선택 → 메신저 연결 → 브라우저 릴레이 → 설정 한눈에 보기
// 대시보드 버튼 없음 (온보딩 완료 전 이동 불가)
// 상태는 변수로 저장 (임시 config 파일 사용 X)

import { useState, useCallback } from 'react';
import type { OnboardingState, OnboardingStep, ModelConfig, MessengerConfig } from '../../types/config';
import { defaultOnboardingState } from '../../types/config';
import ProgressBar from './ProgressBar';
import ModelStep from './ModelStep';
import MessengerStep from './MessengerStep';
import MessengerConnectStep from './MessengerConnectStep';
import BrowserStep from './BrowserStep';
import SummaryStep from './SummaryStep';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS: OnboardingStep[] = ['model', 'messenger', 'messenger-connect', 'browser', 'summary'];

const STEP_LABELS: Record<OnboardingStep, string> = {
  'model': 'AI 모델',
  'messenger': '메신저 선택',
  'messenger-connect': '메신저 연결',
  'browser': '브라우저 릴레이',
  'summary': '설정 확인',
};

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  // 모든 상태를 변수로 관리 (파일 저장 X)
  const [state, setState] = useState<OnboardingState>(defaultOnboardingState);

  const currentStepIndex = STEPS.indexOf(state.currentStep);

  // 단계 이동 핸들러
  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex, goToStep]);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex, goToStep]);

  // 모델 설정 완료
  const handleModelComplete = useCallback((config: ModelConfig) => {
    setState(prev => ({ ...prev, model: config }));
    goNext();
  }, [goNext]);

  // 메신저 선택 완료
  const handleMessengerSelect = useCallback((config: MessengerConfig) => {
    setState(prev => ({ ...prev, messenger: config }));
    goNext();
  }, [goNext]);

  // 메신저 연결 완료 (토큰/QR 등)
  const handleMessengerConnect = useCallback((config: MessengerConfig) => {
    setState(prev => ({ ...prev, messenger: config }));
    goNext();
  }, [goNext]);

  // 브라우저 릴레이 완료
  const handleBrowserComplete = useCallback((installed: boolean) => {
    setState(prev => ({ ...prev, browserRelayInstalled: installed }));
    goNext();
  }, [goNext]);

  // 설치 시작 (최종 완료)
  const handleInstall = useCallback(() => {
    setState(prev => ({ ...prev, isComplete: true }));
    onComplete();
  }, [onComplete]);

  // 뒤로가기 시 이전 값 유지
  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  return (
    <div className="min-h-screen flex gradient-bg">
      {/* 좌측 Progress Bar */}
      <ProgressBar
        steps={STEPS}
        stepLabels={STEP_LABELS}
        currentStep={state.currentStep}
        completedSteps={STEPS.slice(0, currentStepIndex)}
        onStepClick={goToStep}
      />

      {/* 우측 컨텐츠 */}
      <div className="flex-1 overflow-auto">
        {state.currentStep === 'model' && (
          <ModelStep
            initialConfig={state.model}
            onComplete={handleModelComplete}
          />
        )}

        {state.currentStep === 'messenger' && (
          <MessengerStep
            initialConfig={state.messenger}
            onComplete={handleMessengerSelect}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 'messenger-connect' && (
          <MessengerConnectStep
            messengerConfig={state.messenger}
            modelConfig={state.model}
            onComplete={handleMessengerConnect}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 'browser' && (
          <BrowserStep
            onComplete={handleBrowserComplete}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 'summary' && (
          <SummaryStep
            modelConfig={state.model}
            messengerConfig={state.messenger}
            browserInstalled={state.browserRelayInstalled}
            onInstall={handleInstall}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
