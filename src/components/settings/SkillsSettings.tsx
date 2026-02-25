// SkillsSettings - 통합 스킬 관리 (moldClaw API 스킬 + OpenClaw CLI 스킬)
// v2.0: 45개 OpenClaw CLI 스킬 + 11개 moldClaw API 스킬 통합

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';
import type { SkillDefinition, SkillStatus, SkillsStatusResponse, SetupRequirement } from '../../types/skills';
import { SKILL_CATEGORIES } from '../../types/skills';

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
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    logo: 'https://cdn.simpleicons.org/notion/FFFFFF',
    description: '노트/문서 관리',
    detailedDesc: 'Notion 워크스페이스에 접근하여 페이지 읽기, 생성, 수정을 할 수 있습니다.',
    envVar: 'NOTION_API_KEY',
    guideSteps: ['notion.so/my-integrations 접속', '+ New integration 클릭', '토큰 복사', '연결할 페이지에서 Connections 추가'],
    guideUrl: 'https://www.notion.so/my-integrations',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐱',
    logo: 'https://cdn.simpleicons.org/github/FFFFFF',
    description: '코드 저장소',
    detailedDesc: 'GitHub 저장소의 코드를 읽고, 이슈/PR을 관리합니다.',
    envVar: 'GITHUB_TOKEN',
    guideSteps: ['GitHub Settings → Developer settings', 'Personal access tokens → Tokens (classic)', 'Generate new token', '필요한 권한 선택 후 복사'],
    guideUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'todoist',
    name: 'Todoist',
    icon: '✅',
    logo: 'https://cdn.simpleicons.org/todoist/E44332',
    description: '할 일 관리',
    detailedDesc: 'Todoist에 할 일을 추가하거나 완료 처리합니다.',
    envVar: 'TODOIST_API_TOKEN',
    guideSteps: ['todoist.com 로그인', '설정 → 연동 → 개발자', 'API 토큰 복사'],
    guideUrl: 'https://todoist.com/app/settings/integrations/developer',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/linear/5E6AD2',
    description: '이슈 트래킹',
    detailedDesc: 'Linear에서 이슈를 생성하고 관리합니다.',
    envVar: 'LINEAR_API_KEY',
    guideSteps: ['linear.app 로그인', 'Settings → Account → API', 'Personal API keys → Create key'],
    guideUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '📋',
    logo: 'https://cdn.simpleicons.org/trello/0052CC',
    description: '칸반 보드',
    detailedDesc: 'Trello 보드에서 카드를 관리합니다.',
    envVar: 'TRELLO_API_KEY',
    guideSteps: ['trello.com/power-ups/admin 접속', 'API Key + Token 생성'],
    guideUrl: 'https://trello.com/power-ups/admin',
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: '🎨',
    logo: 'https://cdn.simpleicons.org/figma/F24E1E',
    description: '디자인 파일',
    detailedDesc: 'Figma 파일 정보를 읽어옵니다.',
    envVar: 'FIGMA_ACCESS_TOKEN',
    guideSteps: ['figma.com → 계정 설정', 'Personal access tokens → 생성'],
    guideUrl: 'https://www.figma.com/developers/api#access-tokens',
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/jira/0052CC',
    description: '프로젝트 관리',
    detailedDesc: 'Jira에서 이슈를 관리합니다.',
    envVar: 'JIRA_API_TOKEN',
    guideSteps: ['id.atlassian.com/manage-profile/security/api-tokens 접속', 'Create API token'],
    guideUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '✅',
    logo: 'https://cdn.simpleicons.org/asana/F06A6A',
    description: '작업 관리',
    detailedDesc: 'Asana에서 작업을 관리합니다.',
    envVar: 'ASANA_TOKEN',
    guideSteps: ['app.asana.com/0/developer-console', 'Personal access tokens → New'],
    guideUrl: 'https://app.asana.com/0/developer-console',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/airtable/18BFFF',
    description: '스프레드시트 DB',
    detailedDesc: 'Airtable 베이스 데이터를 관리합니다.',
    envVar: 'AIRTABLE_API_KEY',
    guideSteps: ['airtable.com/account', 'API 섹션에서 키 생성'],
    guideUrl: 'https://airtable.com/account',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    logo: 'https://cdn.simpleicons.org/dropbox/0061FF',
    description: '클라우드 파일',
    detailedDesc: 'Dropbox 파일을 관리합니다.',
    envVar: 'DROPBOX_TOKEN',
    guideSteps: ['dropbox.com/developers/apps', 'Create app → Generate token'],
    guideUrl: 'https://www.dropbox.com/developers/apps',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: '🦊',
    logo: 'https://cdn.simpleicons.org/gitlab/FC6D26',
    description: '코드 저장소',
    detailedDesc: 'GitLab 저장소를 관리합니다.',
    envVar: 'GITLAB_TOKEN',
    guideSteps: ['GitLab → User Settings → Access Tokens', '토큰 생성'],
    guideUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
  },
];

// ===== 탭 타입 =====
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
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'available'>('all');
  
  const [disconnectTarget, setDisconnectTarget] = useState<ApiSkill | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
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
      setPlatform(statusRes.platform);
    } catch (err) {
      console.error('CLI 스킬 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

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
    const status = cliStatuses[skill.id];
    
    const CliSkillModal = () => {
      const [installing, setInstalling] = useState(false);
      const [disconnecting, setDisconnecting] = useState(false);
      const [apiKeyInput, setApiKeyInput] = useState('');
      const [error, setError] = useState<string | null>(null);

      const handleInstall = async () => {
        setInstalling(true);
        setError(null);
        try {
          await invoke('install_skill', { skillId: skill.id });
          await loadCliSkills();
        } catch (err) {
          setError(String(err));
        } finally {
          setInstalling(false);
        }
      };

      const handleSaveApiKey = async (envVar: string) => {
        if (!apiKeyInput.trim()) return;
        setError(null);
        try {
          await invoke('configure_skill_api_key', { skillId: skill.id, envVar, value: apiKeyInput.trim() });
          setApiKeyInput('');
          await loadCliSkills();
        } catch (err) {
          setError(String(err));
        }
      };

      const handleOpenLogin = async (command: string) => {
        try {
          await invoke('open_skill_login_terminal', { skillId: skill.id, loginCommand: command });
        } catch (err) {
          setError(String(err));
        }
      };

      const handleDisconnect = async () => {
        if (!confirm(`${skill.name} 연결을 해제하시겠습니까?\n설정과 인증 정보가 삭제됩니다.`)) return;
        setDisconnecting(true);
        setError(null);
        try {
          const result = await invoke<string>('disconnect_skill', { skillId: skill.id });
          alert(result);
          await loadCliSkills();
          closeModal();
        } catch (err) {
          setError(String(err));
        } finally {
          setDisconnecting(false);
        }
      };

      const renderSetupUI = () => {
        if (!status?.installed) return null;
        
        const setup = skill.setup as SetupRequirement;
        
        if (setup.type === 'api_key') {
          return (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text">API 키 설정</h4>
              {setup.vars.map(varName => (
                <div key={varName} className="flex gap-2">
                  <input
                    type="password"
                    placeholder={varName}
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="flex-1 bg-[#1a1c24] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm"
                  />
                  <button onClick={() => handleSaveApiKey(varName)} className="px-4 py-2 bg-forge-copper rounded-lg text-sm font-medium hover:bg-forge-copper/80">저장</button>
                </div>
              ))}
            </div>
          );
        }
        
        if (setup.type === 'login') {
          return (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text">로그인 필요</h4>
              <p className="text-sm text-forge-muted">터미널에서 로그인을 완료해주세요.</p>
              <button onClick={() => handleOpenLogin(setup.command)} className="px-4 py-2 bg-forge-copper rounded-lg text-sm font-medium hover:bg-forge-copper/80">
                로그인 터미널 열기
              </button>
            </div>
          );
        }
        
        if (setup.type === 'mac_permission') {
          return (
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
          );
        }
        
        if (setup.type === 'hardware') {
          return (
            <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
              <p className="text-sm text-forge-amber">🔌 {setup.description}</p>
            </div>
          );
        }
        
        if (setup.type === 'custom') {
          return (
            <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
              <p className="text-sm text-forge-amber">⚙️ {setup.description}</p>
            </div>
          );
        }
        
        return null;
      };

      return (
        <div className="space-y-4">
          {/* 상태 뱃지 */}
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded text-xs ${status?.installed ? 'bg-forge-success/20 text-forge-success' : 'bg-[#252836] text-forge-muted'}`}>
              {status?.installed ? '✓ 설치됨' : '미설치'}
            </span>
            {status?.installed && (
              <span className={`px-3 py-1 rounded text-xs ${status?.configured ? 'bg-forge-success/20 text-forge-success' : 'bg-forge-amber/20 text-forge-amber'}`}>
                {status?.configured ? '✓ 설정 완료' : '설정 필요'}
              </span>
            )}
          </div>

          {/* 설명 */}
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text">{skill.description}</p>
          </div>

          {/* 설치 */}
          {!status?.installed && skill.install_command && (
            <div className="space-y-3">
              <h4 className="font-medium text-forge-text text-sm">설치 명령어</h4>
              <code className="block p-3 bg-[#1a1c24] rounded-lg text-xs font-mono text-forge-muted overflow-x-auto">{skill.install_command}</code>
              <button onClick={handleInstall} disabled={installing} className="w-full px-4 py-2 bg-forge-copper rounded-lg text-sm font-medium hover:bg-forge-copper/80 disabled:opacity-50 flex items-center justify-center gap-2">
                {installing ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> 설치 중...</> : '설치'}
              </button>
            </div>
          )}

          {/* 설정 UI */}
          {renderSetupUI()}

          {/* 에러 */}
          {error && <div className="p-3 bg-forge-error/20 text-forge-error rounded-lg text-sm">{error}</div>}

          {/* 연결 해제 */}
          {status?.installed && status?.configured && (
            <div className="pt-4 border-t border-[#2a2d3e]">
              <button onClick={handleDisconnect} disabled={disconnecting} className="w-full px-4 py-2 bg-forge-error/10 text-forge-error border border-forge-error/30 rounded-lg text-sm hover:bg-forge-error/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {disconnecting ? <><div className="animate-spin w-4 h-4 border-2 border-forge-error/30 border-t-forge-error rounded-full" /> 연결 해제 중...</> : '연결 해제'}
              </button>
              <p className="text-xs text-forge-muted mt-2 text-center">바이너리는 유지됩니다</p>
            </div>
          )}
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">스킬</h2>
        <p className="text-forge-muted text-sm">외부 서비스와 CLI 도구를 연동하여 AI 기능을 확장합니다</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'api' ? 'bg-forge-copper text-white' : 'bg-[#252836] text-forge-muted hover:bg-[#2d3142]'}`}
        >
          🔑 API 연동 ({API_SKILLS.length})
        </button>
        <button
          onClick={() => setActiveTab('cli')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'cli' ? 'bg-forge-copper text-white' : 'bg-[#252836] text-forge-muted hover:bg-[#2d3142]'}`}
        >
          🛠️ CLI 도구 ({cliSkills.length})
        </button>
      </div>

      {/* API 스킬 탭 */}
      {activeTab === 'api' && (
        <div className="grid grid-cols-3 gap-3">
          {API_SKILLS.map((skill) => {
            const configured = isApiConfigured(skill);
            return (
              <div
                key={skill.id}
                className={`bg-[#1e2030] border-2 rounded-xl p-4 transition-all ${configured ? 'border-forge-success/40 hover:border-forge-success/60' : 'border-[#2a2d3e] hover:border-[#3a3f52]'} ${isWorking ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {skill.logo ? <img src={skill.logo} alt={skill.name} className="w-6 h-6 object-contain" /> : <span className="text-2xl">{skill.icon}</span>}
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
      )}

      {/* CLI 스킬 탭 */}
      {activeTab === 'cli' && (
        <>
          {/* 필터 */}
          <div className="flex gap-3 mb-4">
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
            {platform && (
              <span className="ml-auto text-xs text-forge-muted self-center">플랫폼: {platform}</span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-forge-muted">로딩 중...</div>
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
                      return (
                        <div
                          key={skill.id}
                          onClick={() => openCliSkillModal(skill)}
                          className={`bg-[#1e2030] border-2 rounded-xl p-4 cursor-pointer transition-all ${status?.installed ? 'border-forge-copper/40 hover:border-forge-copper' : 'border-[#2a2d3e] hover:border-[#3a3f52]'}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{skill.emoji}</span>
                            <span className="font-medium text-forge-text text-sm">{skill.name}</span>
                          </div>
                          <p className="text-xs text-forge-muted mb-3 line-clamp-1">{skill.description}</p>
                          <div className="flex gap-2">
                            {status?.installed ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-success/20 text-forge-success">설치됨</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#252836] text-forge-muted">미설치</span>
                            )}
                            {status?.installed && !status?.configured && (
                              <span className="text-xs px-2 py-0.5 rounded bg-forge-amber/20 text-forge-amber">설정 필요</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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
