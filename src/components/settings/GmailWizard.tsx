// GmailWizard - Gmail 연동 마법사 (간소화 버전)
// moldClaw 번들 OAuth credentials 사용
// Step 1: gog 설치 + credentials 등록 (자동)
// Step 2: Google 로그인 (경고 안내 포함)
// Step 3: 완료

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';

interface GmailWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'checking' | 'install' | 'auth' | 'complete' | 'error';

export default function GmailWizard({ onComplete, onCancel }: GmailWizardProps) {
  const [step, setStep] = useState<WizardStep>('checking');
  const [status, setStatus] = useState('확인 중...');
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // 초기 상태 확인
  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      setStatus('gog 설치 상태 확인 중...');
      setProgress(10);

      const gogInstalled = await invoke<boolean>('check_gog_installed');
      
      if (!gogInstalled) {
        // gog 설치 필요
        await installAndSetup();
        return;
      }

      setProgress(30);
      
      // credentials 등록 확인
      const credsRegistered = await invoke<boolean>('check_gog_credentials');
      if (!credsRegistered) {
        await registerCredentials();
      }

      setProgress(50);
      setStatus('인증 상태 확인 중...');

      // 이미 인증되어 있는지 확인
      try {
        const authAccount = await invoke<string>('check_gog_auth');
        if (authAccount) {
          setAccount(authAccount);
          setStep('complete');
          setStatus('이미 연결됨');
          setProgress(100);
          return;
        }
      } catch {
        // 인증 안됨 - 정상
      }

      setStep('auth');
      setStatus('Google 로그인이 필요합니다');
      setProgress(60);
    } catch (err) {
      console.error('초기 상태 확인 실패:', err);
      setError(String(err));
      setStep('error');
    }
  };

  const installAndSetup = async () => {
    try {
      setStep('install');
      setStatus('gog 다운로드 중...');
      setProgress(20);

      await invoke<string>('install_gog');
      
      setProgress(40);
      setStatus('OAuth 설정 중...');
      
      await registerCredentials();
      
      setProgress(60);
      setStep('auth');
      setStatus('Google 로그인이 필요합니다');
    } catch (err) {
      console.error('설치 실패:', err);
      setError(String(err));
      setStep('error');
    }
  };

  const registerCredentials = async () => {
    try {
      // 번들된 credentials.json 경로
      const credPath = await resolveResource('resources/gog_credentials.json');
      await invoke('register_gog_credentials', { credentials_path: credPath });
    } catch (err) {
      console.error('Credentials 등록 실패:', err);
      // credentials 등록 실패해도 계속 진행 시도
      // (사용자가 이미 등록했을 수 있음)
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setStatus('브라우저에서 로그인 중...');
      setProgress(75);

      await invoke<string>('start_gog_auth');
      
      // 인증 완료 확인
      setStatus('인증 확인 중...');
      setProgress(90);

      const authAccount = await invoke<string>('check_gog_auth');
      
      if (authAccount) {
        setAccount(authAccount);
        
        // OpenClaw config에 저장
        await invoke('setup_gmail_polling', {
          account: authAccount,
          interval_minutes: 5,
        });
        
        setStep('complete');
        setStatus('연결 완료!');
        setProgress(100);
      } else {
        setError('인증을 완료해주세요. 브라우저에서 "고급" → "계속" 버튼을 클릭하셨나요?');
        setStep('auth');
      }
    } catch (err) {
      console.error('Google 인증 실패:', err);
      setError(String(err));
      setStep('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep('checking');
    checkInitialState();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
          <span className="text-3xl">📧</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-forge-text">Gmail 연동</h2>
          <p className="text-sm text-forge-muted">이메일 읽기 및 관리</p>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="h-2 bg-[#2a2d3e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-forge-copper to-forge-amber transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-forge-muted mt-2 text-center">{status}</p>
      </div>

      {/* Step: 확인/설치 중 */}
      {(step === 'checking' || step === 'install') && (
        <div className="text-center py-8">
          <div className="animate-spin w-10 h-10 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto" />
          <p className="text-forge-muted mt-4">
            {step === 'install' ? '설치 중...' : '확인 중...'}
          </p>
        </div>
      )}

      {/* Step: Google 인증 */}
      {step === 'auth' && (
        <div className="space-y-4">
          {/* 중요 안내: 확인되지 않은 앱 경고 */}
          <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="text-sm">
                <p className="text-forge-text font-medium mb-2">
                  "확인되지 않은 앱" 경고가 표시됩니다
                </p>
                <p className="text-forge-muted mb-2">
                  Google 로그인 화면에서 경고가 나타나면:
                </p>
                <ol className="text-forge-muted space-y-1 ml-4">
                  <li>1. <strong className="text-forge-text">"고급"</strong> 클릭</li>
                  <li>2. <strong className="text-forge-text">"안전하지 않은 페이지로 이동"</strong> 클릭</li>
                  <li>3. 권한 허용</li>
                </ol>
                <p className="text-forge-muted mt-2 text-xs">
                  이는 앱이 Google 검증을 받기 전까지 정상적인 현상입니다.
                </p>
              </div>
            </div>
          </div>

          {/* 권한 안내 */}
          <div className="card p-4 bg-forge-surface">
            <p className="text-sm text-forge-muted mb-3">
              Google 계정으로 로그인하여 Gmail 접근 권한을 부여합니다.
            </p>
            <ul className="space-y-2 text-sm text-forge-muted">
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                이메일 읽기 및 검색
              </li>
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                언제든 연결 해제 가능
              </li>
              <li className="flex items-center gap-2">
                <span className="text-forge-success">✓</span>
                데이터는 로컬에만 저장
              </li>
            </ul>
          </div>

          <button
            onClick={handleGoogleAuth}
            className="w-full py-3 rounded-xl btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 계정으로 로그인
          </button>

          {error && (
            <div className="p-3 bg-forge-error/10 border border-forge-error/30 rounded-lg">
              <p className="text-sm text-forge-error">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Step: 완료 */}
      {step === 'complete' && (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-forge-success/20 mx-auto flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          
          <div>
            <p className="text-forge-success font-medium text-lg">연결 완료!</p>
            <p className="text-forge-muted text-sm mt-1">{account}</p>
          </div>

          <div className="card p-4 bg-forge-surface text-left">
            <p className="text-sm text-forge-muted mb-2">
              이제 OpenClaw가 Gmail을 읽고 관리할 수 있습니다.
            </p>
            <p className="text-sm text-forge-text">
              메신저에서 시도해보세요:
            </p>
            <ul className="text-sm text-forge-muted mt-2 space-y-1">
              <li>• "최근 이메일 확인해줘"</li>
              <li>• "오늘 온 메일 요약해줘"</li>
            </ul>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl btn-primary"
          >
            완료
          </button>
        </div>
      )}

      {/* Step: 에러 */}
      {step === 'error' && (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-forge-error/20 mx-auto flex items-center justify-center">
            <span className="text-3xl">✕</span>
          </div>
          
          <div>
            <p className="text-forge-error font-medium">오류 발생</p>
            <p className="text-forge-muted text-sm mt-1 break-words">{error}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142]"
            >
              취소
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 py-2 rounded-lg btn-primary"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 하단 버튼 (완료/에러 외) */}
      {(step === 'checking' || step === 'install' || step === 'auth') && (
        <div className="mt-6 pt-4 border-t border-[#2a2d3e]">
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-forge-muted hover:text-forge-text"
          >
            나중에 설정
          </button>
        </div>
      )}
    </div>
  );
}
