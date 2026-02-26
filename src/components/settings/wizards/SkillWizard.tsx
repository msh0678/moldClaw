// SkillWizard - 스킬 연결 마법사 공통 컴포넌트
// Login/Token/Config 타입별 UI 자동 생성

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { type SkillWizardInfo } from './SkillWizardConfig';

interface SkillWizardProps {
  config: SkillWizardInfo;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'intro' | 'action' | 'polling' | 'complete' | 'error';

export default function SkillWizard({ config, onComplete, onCancel }: SkillWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Token 타입용
  const [tokenInput, setTokenInput] = useState('');
  
  // Config 타입용
  const [configInputs, setConfigInputs] = useState<Record<string, string>>({});
  
  // Camsnap 카메라 목록
  const [cameras, setCameras] = useState<Array<{name: string; url: string}>>([]);

  // Camsnap 카메라 목록 로드
  useEffect(() => {
    if (config.skillId === 'camsnap') {
      loadCameras();
    }
  }, [config.skillId]);

  const loadCameras = async () => {
    try {
      const list = await invoke<Array<{name: string; url: string}>>('get_camsnap_cameras');
      setCameras(list);
    } catch (err) {
      console.error('카메라 목록 로드 실패:', err);
    }
  };

  // Pre-login 액션 (브라우저 열기 등)
  const handlePreLoginAction = async () => {
    const actions: Record<string, string> = {
      'open_spotify': 'https://open.spotify.com',
      'open_foodora': 'https://www.foodora.at',
      'open_bear': 'bear://', // Bear 앱 URL scheme
    };
    
    if (config.preLoginAction && actions[config.preLoginAction]) {
      try {
        await openUrl(actions[config.preLoginAction]);
      } catch (err) {
        console.error('URL 열기 실패:', err);
      }
    }
  };

  // 터미널 로그인 시작
  const handleStartLogin = async () => {
    try {
      setError(null);
      setStep('polling');
      setStatus('터미널에서 로그인을 진행해주세요...');
      setProgress(30);
      
      await invoke('open_skill_login_terminal', { skillId: config.skillId });
      
      // 폴링 시작
      startPolling();
    } catch (err) {
      setError(String(err));
      setStep('error');
    }
  };

  // 설정 파일 폴링
  const startPolling = () => {
    let pollCount = 0;
    const maxPolls = 90; // 3분 (2초 간격)
    
    const poll = async () => {
      if (pollCount >= maxPolls) {
        setError('시간이 초과되었습니다. 다시 시도해주세요.');
        setStep('error');
        return;
      }
      
      pollCount++;
      setProgress(30 + Math.min(pollCount * 0.7, 60));
      
      try {
        const connected = await invoke<boolean>('poll_skill_config', { skillId: config.skillId });
        
        if (connected) {
          setProgress(100);
          setStatus(config.successMessage);
          setStep('complete');
          return;
        }
      } catch (err) {
        console.error('폴링 에러:', err);
      }
      
      // 계속 폴링
      setTimeout(poll, 2000);
    };
    
    poll();
  };

  // Token 저장 (bear-notes)
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      setError('토큰을 입력해주세요');
      return;
    }
    
    try {
      setError(null);
      setStatus('토큰 저장 중...');
      setProgress(50);
      
      await invoke('save_bear_token', { token: tokenInput });
      
      setProgress(100);
      setStatus(config.successMessage);
      setStep('complete');
    } catch (err) {
      setError(String(err));
      setStep('error');
    }
  };

  // Camsnap 카메라 저장
  const handleSaveCamsnap = async () => {
    const name = configInputs['name']?.trim();
    const url = configInputs['url']?.trim();
    
    if (!name || !url) {
      setError('카메라 이름과 URL은 필수입니다');
      return;
    }
    
    try {
      setError(null);
      setStatus('카메라 저장 중...');
      
      await invoke('save_camsnap_camera', { 
        camera: {
          name,
          url,
          username: configInputs['username']?.trim() || null,
          password: configInputs['password']?.trim() || null,
        }
      });
      
      setConfigInputs({});
      await loadCameras();
      setStatus('카메라가 추가되었습니다');
    } catch (err) {
      setError(String(err));
    }
  };

  // Camsnap 카메라 삭제
  const handleDeleteCamera = async (name: string) => {
    try {
      await invoke('delete_camsnap_camera', { name });
      await loadCameras();
    } catch (err) {
      setError(String(err));
    }
  };

  // Obsidian Vault 저장
  const handleSaveObsidian = async () => {
    const vaultPath = configInputs['vault_path']?.trim();
    
    if (!vaultPath) {
      setError('Vault 경로를 선택해주세요');
      return;
    }
    
    try {
      setError(null);
      setStatus('Vault 설정 중...');
      setProgress(50);
      
      await invoke('save_obsidian_vault', { vaultPath });
      
      setProgress(100);
      setStatus(config.successMessage);
      setStep('complete');
    } catch (err) {
      setError(String(err));
      setStep('error');
    }
  };

  // 폴더 선택 다이얼로그
  const handleSelectFolder = async (fieldKey: string) => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: '폴더 선택',
      });
      
      if (selected && typeof selected === 'string') {
        setConfigInputs(prev => ({ ...prev, [fieldKey]: selected }));
      }
    } catch (err) {
      console.error('폴더 선택 실패:', err);
    }
  };

  // Config 타입 저장 핸들러
  const handleSaveConfig = () => {
    if (config.skillId === 'camsnap') {
      handleSaveCamsnap();
    } else if (config.skillId === 'obsidian') {
      handleSaveObsidian();
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-forge-copper to-forge-amber flex items-center justify-center">
          <span className="text-3xl">{config.icon}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-forge-text">{config.title}</h2>
          {config.platformNote && (
            <p className="text-xs text-forge-muted">{config.platformNote}</p>
          )}
        </div>
      </div>

      {/* 진행률 (login/token 타입) */}
      {config.type !== 'config' && step !== 'intro' && (
        <div className="mb-6">
          <div className="h-2 bg-[#2a2d3e] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-forge-copper to-forge-amber transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-forge-muted mt-2 text-center">{status}</p>
        </div>
      )}

      {/* ===== Intro 단계 ===== */}
      {step === 'intro' && (
        <div className="space-y-4">
          {/* 안내 단계 */}
          {config.loginSteps && (
            <div className="card p-4 bg-forge-surface">
              <h4 className="font-medium text-forge-text mb-3">준비 사항</h4>
              <ol className="space-y-2">
                {config.loginSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-forge-muted">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-forge-copper/20 text-forge-copper text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 경고 메시지 */}
          {config.loginWarning && (
            <div className="p-4 bg-forge-amber/10 border border-forge-amber/30 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-sm text-forge-muted whitespace-pre-line">{config.loginWarning}</p>
              </div>
            </div>
          )}

          {/* Pre-login 액션 버튼 */}
          {config.preLoginAction && (
            <button
              onClick={handlePreLoginAction}
              className="w-full py-2.5 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors text-sm"
            >
              {config.preLoginAction === 'open_spotify' && '🎵 Spotify 열기'}
              {config.preLoginAction === 'open_foodora' && '🍕 Foodora 열기'}
              {config.preLoginAction === 'open_bear' && '🐻 Bear 앱 열기'}
            </button>
          )}

          {/* Token 타입: 토큰 입력 */}
          {config.type === 'token' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="API 토큰 붙여넣기"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="w-full bg-[#1a1c24] border border-[#2a2d3e] rounded-lg px-4 py-3 text-sm focus:border-forge-copper focus:outline-none"
              />
              <button
                onClick={handleSaveToken}
                disabled={!tokenInput.trim()}
                className="w-full py-3 rounded-xl btn-primary disabled:opacity-50"
              >
                토큰 저장
              </button>
            </div>
          )}

          {/* Config 타입: 설정 입력 */}
          {config.type === 'config' && config.configFields && (
            <div className="space-y-3">
              {/* Camsnap: 기존 카메라 목록 */}
              {config.skillId === 'camsnap' && cameras.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-forge-text mb-2">등록된 카메라</h4>
                  <div className="space-y-2">
                    {cameras.map(cam => (
                      <div key={cam.name} className="flex items-center justify-between p-3 bg-[#252836] rounded-lg">
                        <div>
                          <p className="text-sm text-forge-text">{cam.name}</p>
                          <p className="text-xs text-forge-muted truncate max-w-[200px]">{cam.url}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCamera(cam.name)}
                          className="text-forge-error hover:bg-forge-error/20 p-1.5 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 입력 필드 */}
              {config.configFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm text-forge-muted mb-1">{field.name}</label>
                  <div className="flex gap-2">
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={configInputs[field.key] || ''}
                      onChange={e => setConfigInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="flex-1 bg-[#1a1c24] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm focus:border-forge-copper focus:outline-none"
                    />
                    {field.type === 'path' && (
                      <button
                        onClick={() => handleSelectFolder(field.key)}
                        className="px-3 py-2 bg-[#252836] rounded-lg hover:bg-[#2d3142] text-sm"
                      >
                        📁
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={handleSaveConfig}
                className="w-full py-3 rounded-xl btn-primary mt-4"
              >
                {config.skillId === 'camsnap' ? '카메라 추가' : '저장'}
              </button>

              {/* Camsnap: 완료 버튼 */}
              {config.skillId === 'camsnap' && cameras.length > 0 && (
                <button
                  onClick={onComplete}
                  className="w-full py-2 text-sm text-forge-muted hover:text-forge-text"
                >
                  설정 완료
                </button>
              )}
            </div>
          )}

          {/* Login 타입: 터미널 열기 버튼 */}
          {config.type === 'login' && (
            <button
              onClick={handleStartLogin}
              className="w-full py-3.5 bg-gradient-to-r from-forge-copper to-forge-amber rounded-xl text-base font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-forge-copper/30 flex items-center justify-center gap-2"
            >
              <span className="text-lg">🖥️</span>
              로그인 터미널 열기
            </button>
          )}

          {error && (
            <div className="p-3 bg-forge-error/10 border border-forge-error/30 rounded-lg">
              <p className="text-sm text-forge-error">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Polling 단계 ===== */}
      {step === 'polling' && (
        <div className="space-y-4">
          <div className="card p-5 bg-forge-surface text-center">
            <div className="w-16 h-16 rounded-full bg-forge-copper/20 mx-auto mb-4 flex items-center justify-center animate-pulse">
              <span className="text-3xl">🔄</span>
            </div>
            <h3 className="text-lg font-medium text-forge-text mb-2">
              터미널에서 로그인을 진행해주세요
            </h3>
            <p className="text-sm text-forge-muted">
              로그인이 완료되면 자동으로 감지됩니다
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-forge-muted">
              <div className="animate-spin w-3 h-3 border border-forge-copper/30 border-t-forge-copper rounded-full" />
              확인 중...
            </div>
          </div>
        </div>
      )}

      {/* ===== Complete 단계 ===== */}
      {step === 'complete' && (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-forge-success/20 mx-auto flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          
          <div>
            <p className="text-forge-success font-medium text-lg">연결 완료!</p>
            <p className="text-forge-muted text-sm mt-1">{status}</p>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl btn-primary"
          >
            완료
          </button>
        </div>
      )}

      {/* ===== Error 단계 ===== */}
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
              onClick={() => {
                setError(null);
                setStep('intro');
                setProgress(0);
              }}
              className="flex-1 py-2 rounded-lg btn-primary"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 하단 취소 버튼 */}
      {(step === 'intro' || step === 'polling') && (
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
