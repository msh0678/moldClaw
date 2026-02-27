// BrowserSettings - 브라우저 릴레이 설정 섹션
// OpenClaw 공식 스키마 준수:
// browser.enabled, browser.defaultProfile, browser.profiles

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import type { FullConfig, SettingsMode } from '../../types/config';

const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/openclaw-browser-relay/nglingapjinhecnfejdcpihlpneeadjp';

interface BrowserSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  markConfigDirty: () => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface BrowserConfig {
  enabled: boolean;
  defaultProfile: string;
  isInstalled: boolean;
}

export default function BrowserSettings({
  config: _config,
  updateConfig: _updateConfig,
  commitConfig: _commitConfig,
  markConfigDirty: _markConfigDirty,
  mode: _mode,
  openModal: _openModal,
  closeModal: _closeModal,
}: BrowserSettingsProps) {
  const [browserConfig, setBrowserConfig] = useState<BrowserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  
  const isWorkingRef = useRef(false);

  // 브라우저 설정 로드
  const loadBrowserConfig = async () => {
    try {
      const config = await invoke<any>('get_browser_config');
      setBrowserConfig({
        enabled: config?.enabled ?? false,
        defaultProfile: config?.defaultProfile ?? 'chrome',
        isInstalled: config?.isInstalled ?? false,
      });
    } catch (err) {
      console.error('브라우저 설정 로드 실패:', err);
      setBrowserConfig({
        enabled: false,
        defaultProfile: 'chrome',
        isInstalled: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrowserConfig();
  }, []);

  // 브라우저 컨트롤 설치
  const handleInstall = async () => {
    if (isWorkingRef.current || isInstalling) return;
    
    setIsInstalling(true);
    setError(null);
    isWorkingRef.current = true;

    try {
      // 1. 프로필 생성 + 확장 설치
      await invoke<string>('install_browser_control');
      
      // 2. config에 browser 설정 저장
      await invoke('save_browser_config');
      
      // 3. 상태 새로고침
      await loadBrowserConfig();

      // 4. Chrome 웹스토어 열기
      setTimeout(() => {
        open(CHROME_EXTENSION_URL).catch(console.error);
      }, 500);

    } catch (err) {
      setError(String(err));
    } finally {
      setIsInstalling(false);
      isWorkingRef.current = false;
    }
  };

  // 브라우저 컨트롤 비활성화
  const handleDisable = async () => {
    if (isWorkingRef.current || isDisabling || !confirmDisable) return;
    
    setIsDisabling(true);
    setError(null);
    isWorkingRef.current = true;

    try {
      await invoke('disable_browser_config');
      await loadBrowserConfig();
      setConfirmDisable(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsDisabling(false);
      isWorkingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-forge-copper/30 border-t-forge-copper rounded-full" />
      </div>
    );
  }

  const isEnabled = browserConfig?.enabled && browserConfig?.isInstalled;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">브라우저 릴레이</h2>
        <p className="text-forge-muted text-sm">Chrome 브라우저 자동 제어 기능</p>
      </div>

      {/* 상태 카드 */}
      <div className={`card p-5 mb-6 ${isEnabled ? 'border-forge-success/30' : 'border-forge-surface'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-forge-success/20' : 'bg-forge-surface'}`}>
            <span className="text-2xl">🌐</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-forge-text">
                {isEnabled ? '연결됨' : '연결 안 됨'}
              </h3>
              {isEnabled && (
                <span className="px-2 py-0.5 bg-forge-success/20 text-forge-success text-xs rounded-full">
                  활성
                </span>
              )}
            </div>
            <p className="text-sm text-forge-muted">
              {isEnabled 
                ? `프로필: ${browserConfig?.defaultProfile || 'chrome'}`
                : '브라우저 자동 제어를 사용하려면 설치하세요'}
            </p>
          </div>
        </div>
      </div>

      {/* 기능 설명 */}
      <div className="card p-5 mb-6">
        <h3 className="font-medium text-forge-text mb-3">제공 기능</h3>
        <ul className="space-y-2">
          {[
            '웹 페이지 자동 읽기 및 분석',
            '폼 자동 입력 및 클릭',
            '스크린샷 캡처',
            '웹 자동화 작업',
          ].map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-forge-muted">
              <span className="text-forge-success">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* 안내 */}
      <div className="card p-4 mb-6 bg-forge-amber/10 border-forge-amber/30">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-forge-text font-medium text-sm mb-1">Chromium 기반 브라우저 필요</p>
            <p className="text-forge-muted text-xs">
              Chrome, Edge, Brave 등 Chromium 기반 브라우저에서 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="card p-4 mb-6 bg-forge-error/10 border-forge-error/30">
          <p className="text-forge-error text-sm">{error}</p>
        </div>
      )}

      {/* 버튼 영역 */}
      {!isEnabled ? (
        <div className="space-y-4">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full py-3 rounded-xl btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                설치 중...
              </>
            ) : (
              <>
                <span>🔌</span>
                브라우저 컨트롤 설치
              </>
            )}
          </button>

          {/* 설치 안내 */}
          <div className="card p-4">
            <h4 className="font-medium text-forge-text text-sm mb-2">설치 후 추가 설정</h4>
            <ol className="space-y-1 text-xs text-forge-muted">
              <li>1. Chrome 웹스토어에서 확장 프로그램 설치</li>
              <li>2. 확장 프로그램 아이콘을 툴바에 고정</li>
              <li>3. 제어할 탭에서 아이콘 클릭하여 연결</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chrome 웹스토어 열기 */}
          <button
            onClick={() => open(CHROME_EXTENSION_URL).catch(console.error)}
            className="w-full py-3 rounded-xl bg-forge-surface hover:bg-white/10 text-forge-text transition-colors flex items-center justify-center gap-2"
          >
            <span>🔗</span>
            Chrome 웹스토어 열기
          </button>

          {/* 비활성화 */}
          <div className="card p-4 bg-forge-error/5 border-forge-error/20">
            <h4 className="font-medium text-forge-error text-sm mb-2">브라우저 컨트롤 비활성화</h4>
            <p className="text-xs text-forge-muted mb-3">
              비활성화하면 브라우저 자동 제어 기능을 사용할 수 없습니다.
            </p>
            
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={confirmDisable}
                onChange={(e) => setConfirmDisable(e.target.checked)}
                disabled={isDisabling}
                className="w-4 h-4 rounded border-forge-error/50 bg-forge-night text-forge-error focus:ring-forge-error/50"
              />
              <span className="text-sm text-forge-error">비활성화하겠습니다</span>
            </label>

            <button
              onClick={handleDisable}
              disabled={!confirmDisable || isDisabling}
              className="w-full py-2 rounded-lg bg-forge-error/20 text-forge-error hover:bg-forge-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDisabling ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-forge-error/30 border-t-forge-error rounded-full" />
                  처리 중...
                </>
              ) : (
                '비활성화'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
