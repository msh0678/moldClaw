// SkillsSettings - 통합 스킬 관리 (moldClaw API 스킬 + OpenClaw CLI 스킬)
// v3.0: Prerequisite 체크 + 플랫폼별 비활성화 + 스킬 마법사

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';
import type { 
  SkillDefinition, 
  SkillStatus, 
  SkillsStatusResponse, 
  SetupRequirement,
  PrerequisiteStatus 
} from '../../types/skills';
import { SKILL_CATEGORIES, getEffectiveInstallMethod, needsPrerequisite } from '../../types/skills';
import { BrandIcon } from '../common/BrandIcon';
import SkillWizard from './wizards/SkillWizard';
import { getSkillWizardConfig } from './wizards/SkillWizardConfig';

interface SkillsSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

// ===== moldClaw 기존 API 키 스킬 (11개) =====
interface ApiSkill {
  id: string;
  name: string;
  icon: string;
  iconSlug?: string;    // Simple Icons slug
  iconColor?: string;   // Brand color
  logo?: string;
  description: string;
  detailedDesc: string;
  envVar?: string;
  guideSteps: string[];
  guideUrl?: string;
  comingSoon?: boolean;
}

const API_SKILLS: ApiSkill[] = [
  {
    id: 'notion', name: 'Notion', icon: '📝',
    iconSlug: 'notion', iconColor: '#000000',
    logo: 'https://cdn.simpleicons.org/notion/FFFFFF',
    description: '노트/문서 관리',
    detailedDesc: 'Notion 워크스페이스에 접근하여 페이지 읽기, 생성, 수정을 할 수 있습니다.',
    envVar: 'NOTION_API_KEY',
    guideSteps: ['notion.so/my-integrations 접속', '+ New integration 클릭', '토큰 복사', '연결할 페이지에서 Connections 추가'],
    guideUrl: 'https://www.notion.so/my-integrations',
  },
  {
    id: 'github', name: 'GitHub', icon: '🐱',
    iconSlug: 'github', iconColor: '#181717',
    logo: 'https://cdn.simpleicons.org/github/FFFFFF',
    description: '코드 저장소',
    detailedDesc: 'GitHub 저장소의 코드를 읽고, 이슈/PR을 관리합니다.',
    envVar: 'GITHUB_TOKEN',
    guideSteps: ['GitHub Settings → Developer settings', 'Personal access tokens → Tokens (classic)', 'Generate new token'],
    guideUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'todoist', name: 'Todoist', icon: '✅',
    iconSlug: 'todoist', iconColor: '#E44332',
    logo: 'https://cdn.simpleicons.org/todoist/E44332',
    description: '할 일 관리',
    detailedDesc: 'Todoist에 할 일을 추가하거나 완료 처리합니다.',
    envVar: 'TODOIST_API_TOKEN',
    guideSteps: ['todoist.com 로그인', '설정 → 연동 → 개발자', 'API 토큰 복사'],
    guideUrl: 'https://todoist.com/app/settings/integrations/developer',
  },
  {
    id: 'linear', name: 'Linear', icon: '📊',
    iconSlug: 'linear', iconColor: '#5E6AD2',
    logo: 'https://cdn.simpleicons.org/linear/5E6AD2',
    description: '이슈 트래킹',
    detailedDesc: 'Linear에서 이슈를 생성하고 관리합니다.',
    envVar: 'LINEAR_API_KEY',
    guideSteps: ['linear.app 로그인', 'Settings → Account → API', 'Personal API keys → Create key'],
    guideUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'trello', name: 'Trello', icon: '📋',
    iconSlug: 'trello', iconColor: '#0052CC',
    logo: 'https://cdn.simpleicons.org/trello/0052CC',
    description: '칸반 보드',
    detailedDesc: 'Trello 보드에서 카드를 관리합니다.',
    envVar: 'TRELLO_API_KEY',
    guideSteps: ['trello.com/power-ups/admin 접속', 'API Key + Token 생성'],
    guideUrl: 'https://trello.com/power-ups/admin',
  },
  {
    id: 'figma', name: 'Figma', icon: '🎨',
    iconSlug: 'figma', iconColor: '#F24E1E',
    logo: 'https://cdn.simpleicons.org/figma/F24E1E',
    description: '디자인 파일',
    detailedDesc: 'Figma 파일 정보를 읽어옵니다.',
    envVar: 'FIGMA_ACCESS_TOKEN',
    guideSteps: ['figma.com → 계정 설정', 'Personal access tokens → 생성'],
    guideUrl: 'https://www.figma.com/developers/api#access-tokens',
  },
  {
    id: 'jira', name: 'Jira', icon: '📊',
    iconSlug: 'jira', iconColor: '#0052CC',
    logo: 'https://cdn.simpleicons.org/jira/0052CC',
    description: '프로젝트 관리',
    detailedDesc: 'Jira에서 이슈를 관리합니다.',
    envVar: 'JIRA_API_TOKEN',
    guideSteps: ['id.atlassian.com/manage-profile/security/api-tokens 접속', 'Create API token'],
    guideUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  {
    id: 'asana', name: 'Asana', icon: '✅',
    iconSlug: 'asana', iconColor: '#F06A6A',
    logo: 'https://cdn.simpleicons.org/asana/F06A6A',
    description: '작업 관리',
    detailedDesc: 'Asana에서 작업을 관리합니다.',
    envVar: 'ASANA_TOKEN',
    guideSteps: ['app.asana.com/0/developer-console', 'Personal access tokens → New'],
    guideUrl: 'https://app.asana.com/0/developer-console',
  },
  {
    id: 'airtable', name: 'Airtable', icon: '📊',
    iconSlug: 'airtable', iconColor: '#18BFFF',
    logo: 'https://cdn.simpleicons.org/airtable/18BFFF',
    description: '스프레드시트 DB',
    detailedDesc: 'Airtable 베이스 데이터를 관리합니다.',
    envVar: 'AIRTABLE_API_KEY',
    guideSteps: ['airtable.com/account', 'API 섹션에서 키 생성'],
    guideUrl: 'https://airtable.com/account',
  },
  {
    id: 'dropbox', name: 'Dropbox', icon: '📦',
    iconSlug: 'dropbox', iconColor: '#0061FF',
    logo: 'https://cdn.simpleicons.org/dropbox/0061FF',
    description: '클라우드 파일',
    detailedDesc: 'Dropbox 파일을 관리합니다.',
    envVar: 'DROPBOX_TOKEN',
    guideSteps: ['dropbox.com/developers/apps', 'Create app → Generate token'],
    guideUrl: 'https://www.dropbox.com/developers/apps',
  },
  {
    id: 'gitlab', name: 'GitLab', icon: '🦊',
    iconSlug: 'gitlab', iconColor: '#FC6D26',
    logo: 'https://cdn.simpleicons.org/gitlab/FC6D26',
    description: '코드 저장소',
    detailedDesc: 'GitLab 저장소를 관리합니다.',
    envVar: 'GITLAB_TOKEN',
    guideSteps: ['GitLab → User Settings → Access Tokens', '토큰 생성'],
    guideUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
  },
];

type TabType = 'api' | 'cli';

export default function SkillsSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
  mode: _mode,
  openModal,
  closeModal,
}: SkillsSettingsProps) {
  // 상태
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [cliSkills, setCliSkills] = useState<SkillDefinition[]>([]);
  const [cliStatuses, setCliStatuses] = useState<Record<string, SkillStatus>>({});
  const [prerequisites, setPrerequisites] = useState<PrerequisiteStatus | null>(null);
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('macos');
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'available'>('all');
  
  const [disconnectTarget, setDisconnectTarget] = useState<ApiSkill | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [installingPrereq, setInstallingPrereq] = useState<string | null>(null);
  const isWorkingRef = useRef(false);

  // CLI 스킬 데이터 로드
  useEffect(() => {
    if (activeTab === 'cli') {
      loadCliSkills();
    }
  }, [activeTab]);

  const loadCliSkills = async () => {
    try {
      setLoading(true);
      const [defs, statusRes] = await Promise.all([
        invoke<SkillDefinition[]>('get_skill_definitions'),
        invoke<SkillsStatusResponse>('get_skills_status'),
      ]);
      setCliSkills(defs);
      setCliStatuses(statusRes.skills);
      setPrerequisites(statusRes.prerequisites);
      setPlatform(statusRes.platform as 'windows' | 'macos' | 'linux');
    } catch (err) {
      console.error('CLI 스킬 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prerequisite 설치
  const installPrerequisite = async (name: string) => {
    setInstallingPrereq(name);
    try {
      const result = await invoke<string>('install_prerequisite', { name });
      alert(result);
      await loadCliSkills();
    } catch (err) {
      alert(`설치 실패: ${err}`);
    } finally {
      setInstallingPrereq(null);
    }
  };

  // 누락된 prerequisite 목록
  const missingPrereqs = prerequisites ? [
    !prerequisites.go_installed && 'Go',
    !prerequisites.uv_installed && 'uv',
    platform !== 'windows' && !prerequisites.brew_installed && 'Homebrew',
  ].filter(Boolean) as string[] : [];

  // API 스킬: 설정 여부 확인
  const isApiConfigured = (skill: ApiSkill) => {
    if (!skill.envVar) return false;
    return !!config.integrations[skill.envVar];
  };

  // API 스킬: 연결
  const handleApiConnect = (skill: ApiSkill, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    
    const ApiSkillModal = () => {
      const [apiKey, setApiKey] = useState(config.integrations[skill.envVar!] || '');
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState<string | null>(null);
      
      const handleSave = async () => {
        if (saving || !skill.envVar || !apiKey.trim()) return;
        setSaving(true);
        setError(null);
        isWorkingRef.current = true;
        
        try {
          await invoke('update_integrations_config', {
            integrations: { [skill.envVar]: apiKey.trim() }
          });
          const newConfig = {
            ...config,
            integrations: { ...config.integrations, [skill.envVar]: apiKey.trim() }
          };
          commitConfig(newConfig);
          closeModal();
        } catch (err) {
          setError(String(err));
        } finally {
          setSaving(false);
          isWorkingRef.current = false;
        }
      };
      
      return (
        <div className="space-y-4">
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text leading-relaxed">{skill.detailedDesc}</p>
          </div>
          <ol className="space-y-1.5 text-sm text-forge-muted">
            {skill.guideSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-forge-copper font-medium">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {skill.envVar && (
            <input
              type="password"
              placeholder="API 키 입력"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={saving}
              className="w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl focus:outline-none focus:border-forge-copper text-sm font-mono disabled:opacity-50"
            />
          )}
          {skill.guideUrl && (
            <a href={skill.guideUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-forge-copper hover:text-forge-amber">
              🔗 공식 사이트 →
            </a>
          )}
          {error && <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>}
          {skill.envVar && (
            <button onClick={handleSave} disabled={saving || !apiKey.trim()} className="w-full py-3 rounded-xl btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 저장 중...</> : '저장'}
            </button>
          )}
        </div>
      );
    };
    openModal(`${skill.name} 연동`, <ApiSkillModal />);
  };

  // API 스킬: 연결 해제
  const handleApiDisconnect = (skill: ApiSkill, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    setDisconnectTarget(skill);
  };

  const confirmApiDisconnect = async () => {
    if (!disconnectTarget?.envVar || isDisconnecting) return;
    setIsDisconnecting(true);
    isWorkingRef.current = true;
    
    try {
      await invoke('update_integrations_config', { integrations: { [disconnectTarget.envVar]: '' } });
      const newIntegrations = { ...config.integrations };
      delete newIntegrations[disconnectTarget.envVar];
      commitConfig({ ...config, integrations: newIntegrations });
      setDisconnectTarget(null);
    } catch (err) {
      alert(`연결 해제 실패: ${err}`);
    } finally {
      setIsDisconnecting(false);
      isWorkingRef.current = false;
    }
  };

  // CLI 스킬: 상세 모달
  const openCliSkillModal = (skill: SkillDefinition) => {
    const initialStatus = cliStatuses[skill.id];
    const prereqCheck = prerequisites ? needsPrerequisite(skill, platform, prerequisites) : { needed: false, missing: null };
    
    const CliSkillModal = () => {
      // 로컬 상태로 관리 (실시간 업데이트)
      const [localStatus, setLocalStatus] = useState(initialStatus);
      const [installing, setInstalling] = useState(false);
      const [disconnecting, setDisconnecting] = useState(false);
      const [uninstalling, setUninstalling] = useState(false);
      const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
      const [uninstallResult, setUninstallResult] = useState<{ success: boolean; message: string; manual_command: string | null } | null>(null);
      const [isPolling, setIsPolling] = useState(false);
      const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
      const [error, setError] = useState<string | null>(null);

      const wizardConfig = getSkillWizardConfig(skill.id);
      const hasWizard = !!wizardConfig;
      
      // SetupRequirement::None 인지 확인 (연결 개념 없음)
      const isNoSetupRequired = skill.setup.type === 'none';
      
      // Builtin 스킬인지 확인 (삭제 불가, 연결 해제만 가능)
      const isBuiltin = skill.install_method === 'builtin';

      // 상태 새로고침 함수
      const refreshStatus = async () => {
        try {
          const res = await invoke<SkillsStatusResponse>('get_skills_status');
          setLocalStatus(res.skills[skill.id]);
          return res.skills[skill.id];
        } catch {
          return localStatus;
        }
      };

      // login 타입 마법사 polling (터미널 비동기 완료 감지)
      useEffect(() => {
        if (!isPolling) return;
        
        const interval = setInterval(async () => {
          const newStatus = await refreshStatus();
          if (newStatus?.configured) {
            setIsPolling(false);
          }
        }, 2000);
        
        return () => clearInterval(interval);
      }, [isPolling]);

      const handleInstall = async () => {
        setInstalling(true);
        setError(null);
        try {
          await invoke('install_skill', { skillId: skill.id });
          // 설치 후 즉시 상태 조회
          const newStatus = await refreshStatus();
          await loadCliSkills();
          
          // 마법사가 있고 login 타입이면 polling 시작
          if (hasWizard && wizardConfig?.type === 'login' && newStatus?.installed && !newStatus?.configured) {
            setIsPolling(true);
          }
        } catch (err) {
          setError(String(err));
        } finally {
          setInstalling(false);
        }
      };

      const handleSaveApiKey = async () => {
        if (skill.setup.type !== 'api_key') return;
        setError(null);
        try {
          await invoke('configure_skill_api_key', { skillId: skill.id, apiKeys: apiKeyInputs });
          await refreshStatus();
          await loadCliSkills();
          setApiKeyInputs({});
        } catch (err) {
          setError(String(err));
        }
      };

      const handleOpenLogin = async () => {
        try {
          await invoke('open_skill_login_terminal', { skillId: skill.id });
          // 터미널 열린 후 polling 시작
          setIsPolling(true);
        } catch (err) {
          setError(String(err));
        }
      };

      const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
      const [disconnectResult, setDisconnectResult] = useState<string | null>(null);

      const handleDisconnect = async () => {
        setShowDisconnectConfirm(true);
      };

      const confirmDisconnect = async () => {
        setShowDisconnectConfirm(false);
        setDisconnecting(true);
        setError(null);
        try {
          const result = await invoke<string>('disconnect_skill', { skillId: skill.id });
          setDisconnectResult(result);
          await refreshStatus();
          await loadCliSkills();
        } catch (err) {
          setError(String(err));
        } finally {
          setDisconnecting(false);
        }
      };

      // 삭제 핸들러
      const handleUninstall = () => {
        setShowUninstallConfirm(true);
      };

      const confirmUninstall = async () => {
        setShowUninstallConfirm(false);
        setUninstalling(true);
        setError(null);
        setUninstallResult(null);
        try {
          const result = await invoke<{ success: boolean; message: string; manual_command: string | null }>('uninstall_skill', { skillId: skill.id });
          setUninstallResult(result);
          if (result.success) {
            // 성공 시 상태 새로고침 → installed: false가 되어 설치 UI로 전환
            await refreshStatus();
            await loadCliSkills();
          }
        } catch (err) {
          setError(String(err));
        } finally {
          setUninstalling(false);
        }
      };

      // 마법사 완료 핸들러
      const handleWizardComplete = async () => {
        await refreshStatus();
        await loadCliSkills();
        closeModal();
      };

      // 마법사 열기
      const openWizard = () => {
        if (!wizardConfig) return;
        openModal(wizardConfig.title, (
          <SkillWizard 
            config={wizardConfig} 
            onComplete={handleWizardComplete} 
            onCancel={closeModal} 
          />
        ));
      };

      const effectiveMethod = getEffectiveInstallMethod(skill, platform);
      const effectiveCommand = platform === 'windows' && skill.windows_install_command 
        ? skill.windows_install_command 
        : skill.install_command;

      // ===== UI 분기 로직 =====
      
      // 1. 미설치 상태
      if (!localStatus?.installed) {
        return (
          <div className="space-y-4">
            {/* 설명 */}
            <div className="bg-[#252836] p-3 rounded-lg">
              <p className="text-sm text-forge-text">{skill.description}</p>
            </div>

            {/* Prerequisite 경고 */}
            {prereqCheck.missing && (
              <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
                <p className="text-sm text-forge-amber mb-2">⚠️ {prereqCheck.missing}가 설치되어 있지 않습니다</p>
                <button 
                  onClick={() => installPrerequisite(prereqCheck.missing!.toLowerCase())} 
                  disabled={!!installingPrereq}
                  className="px-3 py-1.5 bg-forge-amber text-[#1a1c24] rounded text-xs font-medium hover:bg-forge-amber/80 disabled:opacity-50"
                >
                  {installingPrereq === prereqCheck.missing?.toLowerCase() ? '설치 중...' : `${prereqCheck.missing} 설치`}
                </button>
              </div>
            )}

            {/* 설치 UI */}
            {effectiveCommand && !prereqCheck.missing && (
              <div className="space-y-3">
                <h4 className="font-medium text-forge-text text-sm">설치 ({effectiveMethod})</h4>
                <code className="block p-3 bg-[#1a1c24] rounded-lg text-xs font-mono text-forge-muted overflow-x-auto">{effectiveCommand}</code>
                <button onClick={handleInstall} disabled={installing} className="w-full px-4 py-2 bg-forge-copper rounded-lg text-sm font-medium hover:bg-forge-copper/80 disabled:opacity-50 flex items-center justify-center gap-2">
                  {installing ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 설치 중...</> : '설치'}
                </button>
              </div>
            )}

            {error && <div className="p-3 bg-forge-error/20 text-forge-error rounded-lg text-sm">{error}</div>}
          </div>
        );
      }

      // 2. 설치됨 + 설정 완료 (연결 해제/삭제 UI)
      if (localStatus?.configured) {
        return (
          <div className="space-y-4">
            {/* 상태 뱃지 */}
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded text-xs bg-forge-success/20 text-forge-success">✓ 설치됨</span>
              {!isNoSetupRequired && <span className="px-3 py-1 rounded text-xs bg-forge-success/20 text-forge-success">✓ 설정 완료</span>}
            </div>

            {/* 설명 */}
            <div className="bg-[#252836] p-3 rounded-lg">
              <p className="text-sm text-forge-text">{skill.description}</p>
            </div>

            {/* 삭제 결과 */}
            {uninstallResult && (
              <div className={`p-3 rounded-lg text-sm ${uninstallResult.success ? 'bg-forge-success/20 text-forge-success' : 'bg-forge-error/20 text-forge-error'}`}>
                <p className="font-medium mb-1">{uninstallResult.success ? '✓ 삭제 완료' : '✗ 삭제 실패'}</p>
                <p className="text-xs whitespace-pre-line">{uninstallResult.message}</p>
                {uninstallResult.manual_command && (
                  <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                    <p className="text-forge-muted mb-1">수동으로 삭제하려면:</p>
                    <code className="text-forge-text">{uninstallResult.manual_command}</code>
                  </div>
                )}
              </div>
            )}

            {/* 삭제 확인 모달 */}
            {showUninstallConfirm && (
              <div className="p-4 bg-forge-error/10 border border-forge-error/30 rounded-xl">
                <p className="text-sm text-forge-text mb-3">
                  <span className="font-medium text-forge-error">{skill.name}</span>을(를) 삭제하시겠습니까?
                </p>
                <p className="text-xs text-forge-muted mb-4">바이너리와 설정 파일이 모두 삭제됩니다.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowUninstallConfirm(false)} 
                    className="flex-1 px-3 py-2 bg-[#252836] text-forge-text rounded-lg text-sm hover:bg-[#2d3142]"
                  >
                    취소
                  </button>
                  <button 
                    onClick={confirmUninstall}
                    disabled={uninstalling}
                    className="flex-1 px-3 py-2 bg-forge-error text-white rounded-lg text-sm hover:bg-forge-error/80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uninstalling ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 삭제 중...</> : '삭제'}
                  </button>
                </div>
              </div>
            )}

            {/* 연결 해제 결과 (SetupRequirement 있는 경우만) */}
            {!isNoSetupRequired && disconnectResult && (
              <div className="p-3 bg-forge-success/20 text-forge-success rounded-lg text-sm">
                <p className="font-medium mb-1">✓ 연결 해제 완료</p>
                <p className="text-xs whitespace-pre-line">{disconnectResult}</p>
              </div>
            )}

            {/* 연결 해제 확인 모달 (SetupRequirement 있는 경우만) */}
            {!isNoSetupRequired && showDisconnectConfirm && (
              <div className="p-4 bg-forge-amber/10 border border-forge-amber/30 rounded-xl">
                <p className="text-sm text-forge-text mb-3">
                  <span className="font-medium text-forge-amber">{skill.name}</span> 연결을 해제하시겠습니까?
                </p>
                <p className="text-xs text-forge-muted mb-4">설정과 인증 정보가 삭제됩니다. 바이너리는 유지됩니다.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowDisconnectConfirm(false)} 
                    className="flex-1 px-3 py-2 bg-[#252836] text-forge-text rounded-lg text-sm hover:bg-[#2d3142]"
                  >
                    취소
                  </button>
                  <button 
                    onClick={confirmDisconnect}
                    disabled={disconnecting}
                    className="flex-1 px-3 py-2 bg-forge-amber text-white font-bold rounded-lg text-sm hover:bg-forge-amber/80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {disconnecting ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 해제 중...</> : '⚠️ 연결 해제'}
                  </button>
                </div>
              </div>
            )}

            {/* 버튼 영역 */}
            {!showDisconnectConfirm && !showUninstallConfirm && !disconnectResult && !uninstallResult && (
              <div className="pt-4 border-t border-[#2a2d3e] space-y-2">
                {/* SetupRequirement 있는 경우: 연결 해제 + 삭제 */}
                {!isNoSetupRequired && (
                  <button 
                    onClick={handleDisconnect} 
                    disabled={disconnecting || uninstalling} 
                    className="w-full px-4 py-2 bg-forge-amber/10 text-forge-amber border border-forge-amber/30 rounded-lg text-sm hover:bg-forge-amber/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {disconnecting ? <><div className="animate-spin w-4 h-4 border-2 border-forge-amber/30 border-t-forge-amber rounded-full" /> 연결 해제 중...</> : '연결 해제'}
                  </button>
                )}
                {/* 삭제 버튼 (Builtin 스킬 제외) */}
                {!isBuiltin && (
                  <button 
                    onClick={handleUninstall} 
                    disabled={disconnecting || uninstalling} 
                    className="w-full px-4 py-2 bg-forge-error/10 text-forge-error border border-forge-error/30 rounded-lg text-sm hover:bg-forge-error/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uninstalling ? <><div className="animate-spin w-4 h-4 border-2 border-forge-error/30 border-t-forge-error rounded-full" /> 삭제 중...</> : '삭제'}
                  </button>
                )}
                {!isNoSetupRequired && !isBuiltin && <p className="text-xs text-forge-muted text-center">연결 해제: 설정만 삭제 / 삭제: 바이너리까지 삭제</p>}
              </div>
            )}

            {error && <div className="p-3 bg-forge-error/20 text-forge-error rounded-lg text-sm">{error}</div>}
          </div>
        );
      }

      // 3. 설치됨 + 마법사 있음 + 미설정 (마법사 UI)
      if (hasWizard) {
        return (
          <div className="space-y-4">
            {/* 상태 뱃지 */}
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded text-xs bg-forge-success/20 text-forge-success">✓ 설치됨</span>
              <span className="px-3 py-1 rounded text-xs bg-forge-amber/20 text-forge-amber">설정 필요</span>
              {isPolling && <span className="px-3 py-1 rounded text-xs bg-forge-copper/20 text-forge-copper animate-pulse">감지 중...</span>}
            </div>

            {/* 설명 */}
            <div className="bg-[#252836] p-3 rounded-lg">
              <p className="text-sm text-forge-text">{skill.description}</p>
            </div>

            {/* 마법사 UI */}
            <div className="bg-[#252836] border border-[#2a2d3e] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-forge-copper/20 flex items-center justify-center">
                  <span className="text-xl">{wizardConfig?.type === 'login' ? '🔐' : wizardConfig?.type === 'token' ? '🔑' : '⚙️'}</span>
                </div>
                <div>
                  <h4 className="font-medium text-forge-text">
                    {wizardConfig?.type === 'login' ? '로그인 필요' : wizardConfig?.type === 'token' ? '토큰 입력 필요' : '설정 필요'}
                  </h4>
                  <p className="text-sm text-forge-muted">마법사로 간편하게 설정하세요</p>
                </div>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={openWizard}
                  className="px-6 py-2.5 bg-forge-copper border-2 border-forge-amber rounded-lg text-sm font-medium hover:bg-forge-copper/80 transition-colors"
                >
                  🧙 설정 마법사 열기
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-forge-error/20 text-forge-error rounded-lg text-sm">{error}</div>}
          </div>
        );
      }

      // 4. 설치됨 + 마법사 없음 + 미설정 (수동 설정 UI)
      const setup = skill.setup as SetupRequirement;
      return (
        <div className="space-y-4">
          {/* 상태 뱃지 */}
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded text-xs bg-forge-success/20 text-forge-success">✓ 설치됨</span>
            <span className="px-3 py-1 rounded text-xs bg-forge-amber/20 text-forge-amber">설정 필요</span>
            {isPolling && <span className="px-3 py-1 rounded text-xs bg-forge-copper/20 text-forge-copper animate-pulse">감지 중...</span>}
          </div>

          {/* 설명 */}
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text">{skill.description}</p>
          </div>

          {/* 수동 설정 UI */}
          {setup.type === 'api_key' && (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text">API 키 설정</h4>
              {setup.vars.map(varName => (
                <div key={varName} className="flex gap-2">
                  <input
                    type="password"
                    placeholder={varName}
                    value={apiKeyInputs[varName] || ''}
                    onChange={e => setApiKeyInputs(prev => ({ ...prev, [varName]: e.target.value }))}
                    className="flex-1 bg-[#1a1c24] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button onClick={handleSaveApiKey} className="px-4 py-2 bg-forge-copper border-2 border-forge-amber text-white rounded-lg text-sm font-bold hover:bg-forge-copper/80 shadow-lg">💾 저장</button>
            </div>
          )}

          {setup.type === 'login' && (
            <div className="bg-[#252836] border border-[#2a2d3e] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-forge-copper/20 flex items-center justify-center">
                  <span className="text-xl">🔐</span>
                </div>
                <div>
                  <h4 className="font-medium text-forge-text">로그인 필요</h4>
                  <p className="text-sm text-forge-muted">터미널에서 로그인을 완료해주세요</p>
                </div>
              </div>
              <div className="flex justify-center">
                <button onClick={handleOpenLogin} className="px-6 py-2.5 bg-forge-copper border-2 border-forge-amber rounded-lg text-sm font-medium hover:bg-forge-copper/80 transition-colors">
                  로그인 터미널 열기
                </button>
              </div>
            </div>
          )}

          {setup.type === 'mac_permission' && (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text">macOS 권한 필요</h4>
              <ul className="text-sm text-forge-muted space-y-1">
                {setup.permissions.automation.map(app => <li key={app}>• 자동화: {app}</li>)}
                {setup.permissions.full_disk_access && <li>• 전체 디스크 접근 권한</li>}
                {setup.permissions.screen_recording && <li>• 화면 기록</li>}
                {setup.permissions.accessibility && <li>• 손쉬운 사용</li>}
                {setup.permissions.reminders && <li>• 미리 알림</li>}
              </ul>
              <p className="text-xs text-forge-muted">시스템 설정 → 개인정보 보호 및 보안에서 허용</p>
            </div>
          )}

          {setup.type === 'config' && (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text">설정 파일 필요</h4>
              <p className="text-sm text-forge-muted">아래 경로에 설정 파일을 생성해야 합니다:</p>
              <code className="block text-xs bg-[#1a1c24] p-2 rounded font-mono text-forge-muted break-all">{setup.path}</code>
              <p className="text-xs text-forge-muted">스킬 문서를 참고하여 설정을 완료해주세요.</p>
            </div>
          )}

          {setup.type === 'hardware' && (
            <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
              <p className="text-sm text-forge-amber">🔌 {setup.description}</p>
            </div>
          )}

          {setup.type === 'custom' && (
            <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
              <p className="text-sm text-forge-amber">⚙️ {setup.description}</p>
            </div>
          )}

          {error && <div className="p-3 bg-forge-error/20 text-forge-error rounded-lg text-sm">{error}</div>}
        </div>
      );
    };

    openModal(`${skill.emoji} ${skill.name}`, <CliSkillModal />);
  };

  // CLI 스킬 필터링
  const filteredCliSkills = cliSkills.filter(skill => {
    const status = cliStatuses[skill.id];
    if (statusFilter === 'installed' && !status?.installed) return false;
    if (statusFilter === 'available' && status?.installed) return false;
    if (categoryFilter !== 'all' && skill.category !== categoryFilter) return false;
    return true;
  });

  // 카테고리별 그룹화
  const groupedCliSkills = filteredCliSkills.reduce((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, SkillDefinition[]>);

  const isWorking = isWorkingRef.current || isDisconnecting;

  // 스킬 카드 비활성화 여부
  const isSkillDisabled = (skill: SkillDefinition): { disabled: boolean; reason: string | null } => {
    if (!prerequisites) return { disabled: false, reason: null };
    const prereqCheck = needsPrerequisite(skill, platform, prerequisites);
    if (prereqCheck.missing) {
      return { disabled: true, reason: `${prereqCheck.missing} 필요` };
    }
    return { disabled: false, reason: null };
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">스킬</h2>
        <p className="text-forge-muted text-sm">외부 서비스와 CLI 도구를 연동하여 AI 기능을 확장합니다</p>
      </div>

      {/* 폴더형 탭 컨테이너 */}
      <div className="relative">
        {/* 탭 버튼들 (폴더 탭 형태) */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative
              ${activeTab === 'api' 
                ? 'bg-[#1a1c24] text-forge-copper border-2 border-[#2a2d3e] border-b-[#1a1c24] rounded-t-xl z-10' 
                : 'bg-[#252836] text-forge-muted hover:text-forge-text border-2 border-transparent rounded-t-xl -mb-[2px]'
              }`}
          >
            🔑 API 연동
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ml-1
              ${activeTab === 'cli' 
                ? 'bg-[#1a1c24] text-forge-copper border-2 border-[#2a2d3e] border-b-[#1a1c24] rounded-t-xl z-10' 
                : 'bg-[#252836] text-forge-muted hover:text-forge-text border-2 border-transparent rounded-t-xl -mb-[2px]'
              }`}
          >
            🛠️ CLI 도구
          </button>
        </div>

        {/* 폴더 본체 (컨텐츠 영역) */}
        <div className="border-2 border-[#2a2d3e] rounded-b-xl rounded-tr-xl bg-[#1a1c24] p-4 -mt-[2px]">
          
          {/* Prerequisite 경고 (CLI 탭에서만) */}
          {activeTab === 'cli' && missingPrereqs.length > 0 && (
            <div className="mb-4 bg-forge-amber/10 border border-forge-amber/30 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-medium text-forge-amber mb-3">일부 스킬에 필요한 도구가 설치되어 있지 않습니다</p>
                  <div className="flex flex-wrap gap-3">
                    {missingPrereqs.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          installPrerequisite(name.toLowerCase());
                        }}
                        disabled={!!installingPrereq}
                        className="px-4 py-2 bg-forge-copper hover:bg-forge-copper/80 text-white rounded-lg text-sm font-semibold shadow-md border border-forge-copper/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative z-20"
                      >
                        {installingPrereq === name.toLowerCase() ? '⏳설치 중...' : `📦 ${name} 설치`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API 스킬 탭 */}
          {activeTab === 'api' && (
            <>
            <p className="text-xs text-forge-muted mb-4">💡 API 키를 저장하면 AI가 curl/exec로 해당 서비스를 사용할 수 있습니다</p>
        <div className="grid grid-cols-3 gap-3">
          {API_SKILLS.map((skill) => {
            const configured = isApiConfigured(skill);
            return (
              <div
                key={skill.id}
                className={`bg-[#1e2030] border-2 rounded-xl p-4 transition-all ${configured ? 'border-forge-success/40 hover:border-forge-success/60' : 'border-[#2a2d3e] hover:border-[#3a3f52]'} ${isWorking ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <BrandIcon iconSlug={skill.iconSlug} iconColor={skill.iconColor} logo={skill.logo} icon={skill.icon} name={skill.name} size={24} />
                  <span className="font-medium text-forge-text text-sm">{skill.name}</span>
                </div>
                <p className="text-xs text-forge-muted mb-3 line-clamp-1">{skill.description}</p>
                
                {configured ? (
                  <button onClick={(e) => handleApiDisconnect(skill, e)} disabled={isWorking} className="w-full text-xs px-3 py-2 rounded-lg bg-forge-error/10 text-forge-error border border-forge-error/30 hover:bg-forge-error/20 disabled:opacity-50">
                    연결 해제
                  </button>
                ) : (
                  <button onClick={(e) => handleApiConnect(skill, e)} disabled={isWorking} className="w-full text-xs px-3 py-2 rounded-lg bg-white text-[#1a1c24] font-medium hover:bg-gray-100 disabled:opacity-50">
                    연결
                  </button>
                )}
              </div>
            );
          })}
          </div>
          </>
          )}

          {/* CLI 스킬 탭 */}
          {activeTab === 'cli' && (
          <>
            {/* 필터 */}
          <div className="flex gap-3 mb-4 items-center">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="bg-[#252836] text-forge-text border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm">
              <option value="all">전체</option>
              <option value="installed">설치됨</option>
              <option value="available">미설치</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-[#252836] text-forge-text border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm">
              <option value="all">모든 카테고리</option>
              {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.emoji} {cat.name}</option>
              ))}
            </select>
            <button
              onClick={() => loadCliSkills()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252836] hover:bg-[#2d3142] text-forge-text disabled:opacity-50 transition-colors text-sm"
            >
              <svg 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              새로고침
            </button>
            {platform && (
              <span className="ml-auto text-xs text-forge-muted">플랫폼: {platform}</span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-forge-muted">
              <div className="animate-spin w-8 h-8 border-2 border-forge-copper/30 border-t-forge-copper rounded-full mx-auto mb-3" />
              스킬 정보 로딩 중...
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCliSkills).map(([category, skills]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-forge-text mb-3">
                    {SKILL_CATEGORIES[category]?.emoji} {SKILL_CATEGORIES[category]?.name || category}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {skills.map(skill => {
                      const status = cliStatuses[skill.id];
                      const { disabled, reason } = isSkillDisabled(skill);
                      
                      return (
                        <div
                          key={skill.id}
                          onClick={() => !disabled && openCliSkillModal(skill)}
                          className={`bg-[#1e2030] border-2 rounded-xl p-4 transition-all ${
                            disabled 
                              ? 'border-[#252836] opacity-50 cursor-not-allowed' 
                              : status?.installed 
                                ? 'border-forge-copper/40 hover:border-forge-copper cursor-pointer' 
                                : 'border-[#2a2d3e] hover:border-[#3a3f52] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{skill.emoji}</span>
                            <span className="font-medium text-forge-text text-sm">{skill.name}</span>
                          </div>
                          <p className="text-xs text-forge-muted mb-3 line-clamp-1">{skill.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {disabled && reason ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-amber/20 text-forge-amber">{reason}</span>
                            ) : status?.installed ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-success/20 text-forge-success">설치됨</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#252836] text-forge-muted">미설치</span>
                            )}
                            {status?.installed && !status?.configured && !disabled && (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-amber/20 text-forge-amber">설정 필요</span>
                            )}
                            {status?.error && (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-error/20 text-forge-error" title={status.error}>⚠️</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedCliSkills).length === 0 && (
                <div className="text-center py-12 text-forge-muted">
                  조건에 맞는 스킬이 없습니다
                </div>
              )}
            </div>
          )}
          </>
          )}

        </div>
      </div>

      {/* API 연결 해제 확인 모달 */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0b0f]/70 backdrop-blur-md" onClick={() => !isDisconnecting && setDisconnectTarget(null)} />
          <div className="relative z-10 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-2xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-2">연결 해제 확인</h3>
            <p className="text-sm text-forge-muted mb-4">
              <span className="text-forge-copper">{disconnectTarget.name}</span> 연동을 해제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDisconnectTarget(null)} disabled={isDisconnecting} className="flex-1 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] disabled:opacity-50">취소</button>
              <button onClick={confirmApiDisconnect} disabled={isDisconnecting} className="flex-1 px-4 py-2 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 disabled:opacity-50 flex items-center justify-center gap-2">
                {isDisconnecting ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 해제 중...</> : '해제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
