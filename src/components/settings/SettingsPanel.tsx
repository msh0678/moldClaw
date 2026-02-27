// SettingsPanel - 설정 페이지 메인 컴포넌트
// 좌측 패널 + 우측 콘텐츠 레이아웃
// 각 섹션에서 개별 저장, 사이드바 이동 시 미저장 변경사항 삭제
// 설정 변경 트래킹: 닫을 때 실제 변경이 있으면 Gateway 재시작

import { useState, useEffect, useCallback, useRef } from 'react';
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
import BrowserSettings from './BrowserSettings';
import SettingsModal from './SettingsModal';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [section, setSection] = useState<SettingsSection>('model');
  const [mode, setMode] = useState<SettingsMode>('advanced');
  const [config, setConfig] = useState<FullConfig>(defaultFullConfig);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  
  // 변경 트래킹 refs
  // initialConfigRef: 설정 패널 열 때의 상태 (불변, 비교 기준)
  const initialConfigRef = useRef<FullConfig>(defaultFullConfig);
  // savedConfigRef: 저장할 때마다 업데이트 (섹션 이동 시 리셋용 + 닫을 때 비교용)
  const savedConfigRef = useRef<FullConfig>(defaultFullConfig);
  
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
      // 초기 상태 저장 (비교 기준 - 불변)
      initialConfigRef.current = JSON.parse(JSON.stringify(loadedConfig));
      // 현재 저장된 상태
      savedConfigRef.current = JSON.parse(JSON.stringify(loadedConfig));
    } catch (err) {
      console.error('설정 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 섹션 변경 시 미저장 변경사항 삭제 (savedConfig로 리셋)
  const handleSectionChange = (newSection: SettingsSection) => {
    // 현재 config를 savedConfig로 리셋 (미저장 변경사항 삭제)
    setConfig(savedConfigRef.current);
    setSection(newSection);
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

  // 설정 업데이트 (임시 - 아직 저장 안 됨)
  const updateConfig = (updates: Partial<FullConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // 설정 저장 완료 시 호출 (savedConfig 업데이트)
  // 각 섹션에서 invoke 성공 후 반드시 호출해야 함
  const commitConfig = (newConfig: FullConfig) => {
    // Deep copy로 저장 (참조 문제 방지)
    savedConfigRef.current = JSON.parse(JSON.stringify(newConfig));
    setConfig(newConfig);
    console.log('[Settings] 설정 저장 완료:', newConfig);
  };

  // 현재 섹션 렌더링
  const renderSection = () => {
    const sectionProps = {
      config,
      updateConfig,
      commitConfig,  // 저장 완료 시 호출
      mode,
      openModal,
      closeModal,
    };

    switch (section) {
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
      case 'browser':
        return <BrowserSettings {...sectionProps} />;
      default:
        return <ModelSettings {...sectionProps} />;
    }
  };

  // 대시보드로 나가기 (변경사항 있으면 Gateway 정지만 - 대시보드에서 자동 재시작)
  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    
    try {
      // 설정 진입 시점과 현재 저장된 상태 비교
      const initialJson = JSON.stringify(initialConfigRef.current);
      const savedJson = JSON.stringify(savedConfigRef.current);
      const hasRealChanges = initialJson !== savedJson;
      
      console.log('[Settings] 변경 여부 체크:', {
        hasRealChanges,
        initial: initialConfigRef.current,
        saved: savedConfigRef.current,
      });
      
      if (hasRealChanges) {
        // 변경사항 있으면 Gateway 정지만 하고 대시보드에서 처리
        // stop_gateway는 비동기로 실행하고 기다리지 않음 (Fire-and-forget)
        console.log('[Settings] 설정 변경 감지 - Gateway 정지 (비동기)');
        invoke('stop_gateway').catch(err => {
          console.error('[Settings] Gateway 정지 실패:', err);
        });
        // 정지 완료를 기다리지 않고 즉시 진행
      }
    } finally {
      setConfig(savedConfigRef.current);
      setIsClosing(false);
      onClose();
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
    <div className="h-screen gradient-bg flex overflow-hidden">
      {/* 좌측 사이드바 - 고정, 스크롤 안 됨 */}
      <div className="h-full flex-shrink-0">
        <SettingsSidebar
          currentSection={section}
          onSectionChange={handleSectionChange}
          mode={mode}
          onModeChange={setMode}
          onClose={handleClose}
        />
      </div>

      {/* 우측 컨텐츠 - 스크롤 가능 */}
      <div className="flex-1 h-full overflow-auto p-8">
        {renderSection()}
      </div>

      {/* 모달 */}
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
