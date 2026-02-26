// moldClaw - Main Application
// Planetary Dashboard + Onboarding Wizard + Settings Panel

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppView } from './types/config';

// Re-export types for backward compatibility with old components
export type {
  ModelConfig,
  MessengerConfig,
  GatewayConfig,
  IntegrationConfig,
  FullConfig,
  Messenger,
} from './types/config';

export { defaultMessengerConfig, defaultGatewayConfig, defaultFullConfig } from './types/config';
import Loading from './components/Loading';
import ExpiredScreen from './components/ExpiredScreen';
import { OnboardingWizard } from './components/onboarding';
import { DashboardPlanetary } from './components/dashboard';
import { SettingsPanel } from './components/settings';
import { NotificationsPage, FilesPage, LogsPage, GuidePage, DisclaimerPage } from './components/pages';
import { useAppStatus } from './hooks/useAppStatus';

// 동의 여부 저장 키
const DISCLAIMER_AGREED_KEY = 'moldclaw_disclaimer_agreed_v1';

type UninstallState = 'idle' | 'uninstalling' | 'waitingForClose' | 'error';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [expiredAcknowledged, setExpiredAcknowledged] = useState(false);
  const [uninstallState, setUninstallState] = useState<UninstallState>('idle');
  const [uninstallError, setUninstallError] = useState<string | null>(null);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState<boolean | null>(null);
  // 설정에서 변경 후 대시보드로 돌아왔는지 (gateway 재시작 필요)
  const [settingsJustClosed, setSettingsJustClosed] = useState(false);
  const { appStatus, loading: statusLoading } = useAppStatus();

  // 첫 실행 시 동의 여부 확인
  useEffect(() => {
    const agreed = localStorage.getItem(DISCLAIMER_AGREED_KEY);
    setDisclaimerAgreed(agreed === 'true');
  }, []);

  // 동의 처리
  const handleDisclaimerAgree = useCallback(() => {
    localStorage.setItem(DISCLAIMER_AGREED_KEY, 'true');
    setDisclaimerAgreed(true);
  }, []);

  // 온보딩 완료 여부 확인
  const checkOnboardingStatus = useCallback(async () => {
    try {
      const isCompleted = await invoke<boolean>('is_onboarding_completed');
      return isCompleted;
    } catch {
      // Config가 있으면 온보딩 완료로 간주
      try {
        const hasConfig = await invoke<boolean>('has_config');
        return hasConfig;
      } catch {
        return false;
      }
    }
  }, []);

  // 네비게이션 핸들러
  const handleNavigate = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  // 온보딩 완료
  const handleOnboardingComplete = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  // 설정 닫기 (설정에서 변경 후 대시보드로 돌아갈 때 플래그 설정)
  const handleSettingsClose = useCallback(() => {
    setSettingsJustClosed(true);
    setCurrentView('dashboard');
  }, []);

  // 대시보드 준비 완료 (settingsJustClosed 플래그 리셋)
  // ⚠️ CRITICAL: 이 hook은 반드시 컴포넌트 최상위에 있어야 함!
  // 조건문 뒤에 두면 React Hooks 규칙 위반으로 빈 화면 발생
  const handleDashboardReady = useCallback(() => {
    setSettingsJustClosed(false);
  }, []);

  const handleRetryUninstall = async () => {
    setUninstallState('uninstalling');
    setUninstallError(null);

    try {
      await invoke<string>('uninstall_openclaw');
      await invoke('uninstall_moldclaw');
    } catch (err) {
      setUninstallState('error');
      setUninstallError(String(err));
    }
  };

  const handleCancelUninstall = () => {
    setUninstallState('idle');
    setUninstallError(null);
  };

  // 앱 상태 로딩 중 또는 동의 여부 확인 중
  if (statusLoading || disclaimerAgreed === null) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
          <p className="text-forge-muted">상태 확인 중...</p>
        </div>
      </div>
    );
  }

  // 첫 실행 - 동의 페이지 표시
  if (!disclaimerAgreed) {
    return <DisclaimerPage onAgree={handleDisclaimerAgree} />;
  }

  // 테스트 기간 만료
  if (appStatus?.status === 'expired' && !expiredAcknowledged) {
    return (
      <ExpiredScreen 
        message={appStatus.message} 
        onContinue={() => setExpiredAcknowledged(true)}
      />
    );
  }

  // 삭제 진행 중 - 전체 화면 오버레이
  if (uninstallState !== 'idle') {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {uninstallState === 'uninstalling' && (
            <>
              <div className="text-5xl mb-6 animate-spin">⚙️</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">삭제 진행 중</h2>
              <p className="text-forge-muted">
                OpenClaw 삭제 중... 잠시 기다리시면 moldClaw 삭제가 진행됩니다.
              </p>
            </>
          )}

          {uninstallState === 'waitingForClose' && (
            <>
              <div className="text-5xl mb-6">⚠️</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">파일 사용 중</h2>
              <div className="card p-4 mb-6 text-left bg-forge-amber/10 border-forge-amber/30">
                <p className="text-forge-text text-sm mb-3">
                  OpenClaw 관련 파일이 다른 프로그램에서 사용 중입니다.
                </p>
                <ul className="text-forge-muted text-sm list-disc list-inside">
                  <li>브라우저의 OpenClaw 웹 UI (127.0.0.1:18789)</li>
                  <li>터미널에서 실행 중인 OpenClaw</li>
                  <li>OpenClaw 설정 파일을 열어둔 편집기</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelUninstall}
                  className="flex-1 py-3 rounded-xl bg-forge-surface text-forge-text hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  onClick={handleRetryUninstall}
                  className="flex-1 py-3 rounded-xl btn-primary"
                >
                  완료했습니다, 계속 삭제
                </button>
              </div>
            </>
          )}

          {uninstallState === 'error' && (
            <>
              <div className="text-5xl mb-6">❌</div>
              <h2 className="text-xl font-bold text-forge-text mb-4">삭제 실패</h2>
              <div className="card p-4 mb-6 text-left bg-forge-error/10 border-forge-error/30">
                <p className="text-forge-error text-sm">{uninstallError}</p>
              </div>
              <p className="text-forge-muted text-sm mb-6">
                제어판 &gt; 프로그램 제거에서 직접 삭제해 주세요.
              </p>
              <button
                onClick={handleCancelUninstall}
                className="w-full py-3 rounded-xl btn-primary"
              >
                확인
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // 로딩 화면
  if (currentView === 'loading') {
    return (
      <Loading
        onReady={async () => {
          const isCompleted = await checkOnboardingStatus();
          setCurrentView(isCompleted ? 'dashboard' : 'onboarding');
        }}
        onDashboard={() => setCurrentView('dashboard')}
      />
    );
  }

  // 온보딩
  if (currentView === 'onboarding') {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // 설정
  if (currentView === 'settings') {
    return <SettingsPanel onClose={handleSettingsClose} />;
  }

  // 알림 관리
  if (currentView === 'notifications') {
    return <NotificationsPage onNavigate={handleNavigate} />;
  }

  // 파일/기록
  if (currentView === 'files') {
    return <FilesPage onNavigate={handleNavigate} />;
  }

  // 로그
  if (currentView === 'logs') {
    return <LogsPage onNavigate={handleNavigate} />;
  }

  // 사용법
  if (currentView === 'guide') {
    return <GuidePage onNavigate={handleNavigate} />;
  }

  // 대시보드 (기본)
  return (
    <DashboardPlanetary
      onNavigate={handleNavigate}
      forceCheckOnMount={settingsJustClosed}
      onReady={handleDashboardReady}
    />
  );
}

export default App;
