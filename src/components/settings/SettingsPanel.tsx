// SettingsPanel - 설정 페이지 메인 컴포넌트
// 좌측 패널 + 우측 콘텐츠 레이아웃
// 일반 설정 / 고급 설정 모드
// 저장 버튼 필수 (저장 안하면 변경 파기)

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SettingsSection, SettingsMode, FullConfig } from '../../types/config';
import { defaultFullConfig } from '../../types/config';
import SettingsSidebar from './SettingsSidebar';
import ModelSettings from './ModelSettings';
import MessengerSettings from './MessengerSettings';
import SkillsSettings from './SkillsSettings';
import ToolsSettings from './ToolsSettings';
import TTSSettings from './TTSSettings';
import GmailSettings from './GmailSettings';
import GeneralSettings from './GeneralSettings';
import SettingsModal from './SettingsModal';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [section, setSection] = useState<SettingsSection>('general');
  const [mode, setMode] = useState<SettingsMode>('normal');
  const [config, setConfig] = useState<FullConfig>(defaultFullConfig);
  const [originalConfig, setOriginalConfig] = useState<FullConfig>(defaultFullConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    component: React.ReactNode;
  } | null>(null);

  // 설정 로드
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [model, messenger, integrations] = await Promise.all([
        invoke<any>('get_model_config'),
        invoke<any>('get_messenger_config'),
        invoke<any>('get_integrations_config'),
      ]);

      const loadedConfig: FullConfig = {
        ...defaultFullConfig,
        model: model?.provider ? {
          provider: model.provider,
          model: model.model,
          apiKey: model.hasApiKey ? '••••••••' : '',
        } : null,
        messenger: {
          ...defaultFullConfig.messenger,
          type: messenger?.type || null,
          dmPolicy: messenger?.dmPolicy || 'pairing',
          allowFrom: messenger?.allowFrom || [],
        },
        integrations: integrations || {},
      };

      setConfig(loadedConfig);
      setOriginalConfig(loadedConfig);
    } catch (err) {
      console.error('설정 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 변경 감지
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, originalConfig]);

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      // 모델 설정 저장
      if (config.model && config.model.apiKey && !config.model.apiKey.includes('•')) {
        await invoke('update_model_config', {
          provider: config.model.provider,
          model: config.model.model,
          apiKey: config.model.apiKey,
        });
      }

      // 메신저 설정 저장
      if (config.messenger.type) {
        await invoke('update_messenger_config', {
          channel: config.messenger.type,
          token: config.messenger.token || '',
          dmPolicy: config.messenger.dmPolicy,
          allowFrom: config.messenger.allowFrom,
          groupPolicy: config.messenger.groupPolicy,
          requireMention: config.messenger.requireMention,
        });
      }

      // 통합 설정 저장
      await invoke('update_integrations_config', {
        integrations: config.integrations,
      });

      // Gateway 재시작
      await invoke('restart_gateway');

      setOriginalConfig(config);
      setHasChanges(false);
    } catch (err) {
      console.error('저장 실패:', err);
      alert(`저장 실패: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  // 취소 (변경 파기)
  const handleCancel = () => {
    if (hasChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) {
        return;
      }
    }
    onClose();
  };

  // 모달 열기
  const openModal = (title: string, component: React.ReactNode) => {
    setModalContent({ title, component });
    setModalOpen(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  // 설정 업데이트
  const updateConfig = (updates: Partial<FullConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // 현재 섹션 렌더링
  const renderSection = () => {
    const sectionProps = {
      config,
      updateConfig,
      mode,
      openModal,
      closeModal,
    };

    switch (section) {
      case 'general':
        return <GeneralSettings {...sectionProps} />;
      case 'model':
        return <ModelSettings {...sectionProps} />;
      case 'messenger':
        return <MessengerSettings {...sectionProps} />;
      case 'skills':
        return <SkillsSettings {...sectionProps} />;
      case 'tools':
        return <ToolsSettings {...sectionProps} />;
      case 'tts':
        return <TTSSettings {...sectionProps} />;
      case 'gmail':
        return <GmailSettings {...sectionProps} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-4" />
          <p className="text-forge-muted">설정 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* 좌측 사이드바 */}
      <SettingsSidebar
        currentSection={section}
        onSectionChange={setSection}
        mode={mode}
        onModeChange={setMode}
        onClose={handleCancel}
      />

      {/* 우측 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-forge-text">설정</h1>
            <p className="text-sm text-forge-muted">OpenClaw 설정을 관리합니다</p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-forge-amber px-2 py-1 bg-forge-amber/10 rounded">
                변경사항 있음
              </span>
            )}
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-forge-surface hover:bg-white/10 text-forge-text transition-colors"
            >
              {hasChanges ? '취소' : '닫기'}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="
                px-4 py-2 rounded-lg btn-primary
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-auto p-6">
          {renderSection()}
        </div>
      </div>

      {/* 모달 (호버 창 + 블러 효과) */}
      <SettingsModal
        isOpen={modalOpen}
        title={modalContent?.title || ''}
        onClose={closeModal}
      >
        {modalContent?.component}
      </SettingsModal>
    </div>
  );
}
