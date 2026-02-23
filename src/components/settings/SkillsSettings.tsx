// SkillsSettings - 스킬(Skills) 설정 섹션
// QA 강화: 연타 방지, 모달 자동 닫기, 해제 연타 방지

import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';

interface SkillsSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  logo?: string;
  description: string;         // 카드 짧은 설명
  detailedDesc: string;        // 모달 상세 설명
  envVar?: string;
  guideSteps: string[];
  guideUrl?: string;
  comingSoon?: boolean;        // 아직 미구현
}

const SKILLS: Skill[] = [
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    logo: 'https://cdn.simpleicons.org/notion/FFFFFF',
    description: '노트/문서 관리',
    detailedDesc: 'Notion 워크스페이스에 접근하여 페이지 읽기, 생성, 수정을 할 수 있습니다. "Notion에 회의록 만들어줘", "오늘 할 일 Notion에 추가해줘" 같은 요청을 처리합니다.',
    envVar: 'NOTION_API_KEY',
    guideSteps: [
      'notion.so/my-integrations 접속',
      '+ New integration 클릭',
      '이름 입력 후 Submit',
      'Internal Integration Token 복사',
      '⚠️ 연결할 페이지에서 "Connections" 설정 필요!',
    ],
    guideUrl: 'https://www.notion.so/my-integrations',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐱',
    logo: 'https://cdn.simpleicons.org/github/FFFFFF',
    description: '코드 저장소',
    detailedDesc: 'GitHub 저장소의 코드를 읽고, 이슈를 확인하고, PR을 생성할 수 있습니다. 개발 프로젝트 관리에 유용합니다.',
    envVar: 'GITHUB_TOKEN',
    guideSteps: [
      'GitHub 로그인 → Settings',
      'Developer settings → Personal access tokens',
      'Tokens (classic) → Generate new token',
      '필요한 권한 선택 (repo, read:user 등)',
      '토큰 복사 (한 번만 표시됨!)',
    ],
    guideUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'todoist',
    name: 'Todoist',
    icon: '✅',
    logo: 'https://cdn.simpleicons.org/todoist/E44332',
    description: '할 일 관리',
    detailedDesc: 'Todoist에 할 일을 추가하거나 완료 처리할 수 있습니다. "장보기 할 일 추가해줘", "오늘 할 일 뭐 있어?" 같은 요청을 처리합니다.',
    envVar: 'TODOIST_API_TOKEN',
    guideSteps: [
      'todoist.com 로그인',
      '설정 → 연동 → 개발자',
      'API 토큰 복사',
    ],
    guideUrl: 'https://todoist.com/app/settings/integrations/developer',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/linear/5E6AD2',
    description: '이슈 트래킹',
    detailedDesc: 'Linear에서 이슈를 생성하고 관리합니다. 개발 팀의 작업 현황을 파악하고 새 이슈를 만들 수 있습니다.',
    envVar: 'LINEAR_API_KEY',
    guideSteps: [
      'linear.app 로그인',
      'Settings → Account → API',
      'Personal API keys → Create key',
      '키 복사',
    ],
    guideUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '📋',
    logo: 'https://cdn.simpleicons.org/trello/0052CC',
    description: '칸반 보드',
    detailedDesc: 'Trello 보드에서 카드를 생성하고 이동시킵니다. 프로젝트 진행 상황을 관리하거나 새 작업을 추가할 수 있습니다.',
    envVar: 'TRELLO_API_KEY',
    guideSteps: [
      'trello.com/power-ups/admin 접속',
      'API Key 확인',
      '추가로 Token도 필요 (링크 클릭)',
      'API Key와 Token 모두 입력',
    ],
    guideUrl: 'https://trello.com/power-ups/admin',
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: '🎨',
    logo: 'https://cdn.simpleicons.org/figma/F24E1E',
    description: '디자인 파일',
    detailedDesc: 'Figma 파일의 정보를 읽어옵니다. 디자인 컴포넌트 정보, 색상 값 등을 확인할 수 있습니다.',
    envVar: 'FIGMA_ACCESS_TOKEN',
    guideSteps: [
      'figma.com 로그인',
      '계정 설정 → Personal access tokens',
      '토큰 생성 → 복사',
    ],
    guideUrl: 'https://www.figma.com/developers/api#access-tokens',
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/jira/0052CC',
    description: '프로젝트 관리',
    detailedDesc: 'Jira에서 이슈를 확인하고 생성합니다. 회사 프로젝트 관리에 Jira를 사용한다면 연동하세요.',
    envVar: 'JIRA_API_TOKEN',
    guideSteps: [
      'id.atlassian.com/manage-profile/security/api-tokens 접속',
      'Create API token 클릭',
      '토큰 이름 입력 → Create',
      '토큰 복사',
    ],
    guideUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '✅',
    logo: 'https://cdn.simpleicons.org/asana/F06A6A',
    description: '작업 관리',
    detailedDesc: 'Asana에서 작업을 추가하고 상태를 관리합니다. 팀 프로젝트 관리에 Asana를 사용한다면 연동하세요.',
    envVar: 'ASANA_TOKEN',
    guideSteps: [
      'app.asana.com/0/developer-console 접속',
      'Personal access tokens 탭',
      '+ New access token',
      '토큰 복사',
    ],
    guideUrl: 'https://app.asana.com/0/developer-console',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '📊',
    logo: 'https://cdn.simpleicons.org/airtable/18BFFF',
    description: '스프레드시트 DB',
    detailedDesc: 'Airtable 베이스의 데이터를 읽고 수정합니다. 엑셀처럼 생긴 데이터베이스를 AI로 관리할 수 있습니다.',
    envVar: 'AIRTABLE_API_KEY',
    guideSteps: [
      'airtable.com/account 접속',
      'API 섹션에서 Generate API key',
      '키 복사',
    ],
    guideUrl: 'https://airtable.com/account',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    logo: 'https://cdn.simpleicons.org/dropbox/0061FF',
    description: '클라우드 파일',
    detailedDesc: 'Dropbox에 파일을 업로드하거나 다운로드합니다. 클라우드 파일 관리를 AI로 할 수 있습니다.',
    envVar: 'DROPBOX_TOKEN',
    guideSteps: [
      'dropbox.com/developers/apps 접속',
      'Create app 클릭',
      'App 설정에서 Generate access token',
      '토큰 복사',
    ],
    guideUrl: 'https://www.dropbox.com/developers/apps',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: '🦊',
    logo: 'https://cdn.simpleicons.org/gitlab/FC6D26',
    description: '코드 저장소',
    detailedDesc: 'GitLab 저장소의 코드를 읽고 이슈를 관리합니다. GitHub 대신 GitLab을 사용한다면 연동하세요.',
    envVar: 'GITLAB_TOKEN',
    guideSteps: [
      'GitLab 로그인',
      'User Settings → Access Tokens',
      '토큰 이름, 만료일, 권한 설정',
      'Create personal access token → 복사',
    ],
    guideUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    icon: '💎',
    logo: 'https://cdn.simpleicons.org/obsidian/7C3AED',
    description: '로컬 노트',
    detailedDesc: '컴퓨터에 저장된 Obsidian Vault의 노트를 읽고 수정합니다. 현재 기능 개발 중입니다.',
    guideSteps: [
      '⚠️ 이 기능은 현재 개발 중입니다',
      '추후 업데이트에서 지원 예정',
    ],
    comingSoon: true,
  },
];

export default function SkillsSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
  mode: _mode,
  openModal,
  closeModal,
}: SkillsSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<Skill | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const isWorkingRef = useRef(false);

  const isConfigured = (skill: Skill) => {
    if (!skill.envVar) return false;
    return !!config.integrations[skill.envVar];
  };

  const handleConnect = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    
    // 준비 중인 스킬은 안내 모달만 표시
    if (skill.comingSoon) {
      const ComingSoonModal = () => (
        <div className="space-y-4">
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text leading-relaxed">{skill.detailedDesc}</p>
          </div>
          
          <div className="bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
            <p className="text-sm text-forge-amber">⚠️ 이 기능은 현재 준비 중입니다</p>
          </div>
          
          <ol className="space-y-1.5 text-sm text-forge-muted">
            {skill.guideSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-forge-copper font-medium">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      );
      
      openModal(`${skill.name}`, <ComingSoonModal />);
      return;
    }
    
    const SkillModal = () => {
      const [apiKey, setApiKey] = useState(config.integrations[skill.envVar!] || '');
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState<string | null>(null);
      
      const handleSave = async () => {
        if (saving) return; // 연타 방지
        if (!skill.envVar || !apiKey.trim()) return;
        
        setSaving(true);
        setError(null);
        isWorkingRef.current = true;
        
        try {
          await invoke('update_integrations_config', {
            integrations: { [skill.envVar]: apiKey.trim() }
          });
          
          const newConfig = {
            ...config,
            integrations: {
              ...config.integrations,
              [skill.envVar]: apiKey.trim(),
            }
          };
          commitConfig(newConfig);
          closeModal(); // 성공 시 자동 닫기
        } catch (err) {
          console.error('스킬 저장 실패:', err);
          setError(String(err));
        } finally {
          setSaving(false);
          isWorkingRef.current = false;
        }
      };
      
      return (
        <div className="space-y-4">
          {/* 상세 설명 */}
          <div className="bg-[#252836] p-3 rounded-lg">
            <p className="text-sm text-forge-text leading-relaxed">{skill.detailedDesc}</p>
          </div>
          
          {/* API 키 발급 방법 */}
          <div>
            <p className="text-sm font-medium text-forge-muted mb-2">API 키 발급 방법</p>
            <ol className="space-y-1.5 text-sm text-forge-muted">
              {skill.guideSteps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-forge-copper font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {skill.envVar && (
            <div>
              <label className="block text-sm font-medium text-forge-muted mb-2">
                API 키 입력
              </label>
              <input
                type="password"
                placeholder="API 키 입력"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saving}
                className="
                  w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                  focus:outline-none focus:border-forge-copper text-sm font-mono
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </div>
          )}

          {skill.guideUrl && (
            <a
              href={skill.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-forge-copper hover:text-forge-amber"
            >
              🔗 공식 사이트에서 발급받기 →
            </a>
          )}
          
          {error && (
            <p className="text-sm text-forge-error bg-forge-error/10 p-3 rounded-lg">{error}</p>
          )}
          
          {skill.envVar && (
            <button
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="
                w-full py-3 rounded-xl btn-primary mt-2
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          )}
        </div>
      );
    };

    openModal(`${skill.name} 연동`, <SkillModal />);
  };

  const handleDisconnect = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    setDisconnectTarget(skill);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget?.envVar || isDisconnecting) return;
    
    setIsDisconnecting(true);
    isWorkingRef.current = true;
    
    try {
      await invoke('update_integrations_config', {
        integrations: { [disconnectTarget.envVar]: '' }
      });
      
      const newIntegrations = { ...config.integrations };
      delete newIntegrations[disconnectTarget.envVar];
      const newConfig = { ...config, integrations: newIntegrations };
      commitConfig(newConfig);
      setDisconnectTarget(null);
    } catch (err) {
      console.error('연결 해제 실패:', err);
      alert(`연결 해제 실패: ${err}`);
    } finally {
      setIsDisconnecting(false);
      isWorkingRef.current = false;
    }
  };

  const cancelDisconnect = () => {
    if (isDisconnecting) return;
    setDisconnectTarget(null);
  };

  const isWorking = isWorkingRef.current || isDisconnecting;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">스킬</h2>
        <p className="text-forge-muted text-sm">외부 서비스와 연동하여 AI의 기능을 확장합니다</p>
      </div>

      {/* 스킬 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {SKILLS.map((skill) => {
          const configured = isConfigured(skill);
          return (
            <div
              key={skill.id}
              className={`
                bg-[#1e2030] border-2 rounded-xl p-4 transition-all
                ${configured 
                  ? 'border-forge-success/40 hover:border-forge-success/60' 
                  : 'border-[#2a2d3e] hover:border-[#3a3f52]'}
                ${isWorking ? 'opacity-60 pointer-events-none' : ''}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                {skill.logo ? (
                  <img src={skill.logo} alt={skill.name} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-2xl">{skill.icon}</span>
                )}
                <span className="font-medium text-forge-text text-sm">{skill.name}</span>
              </div>
              <p className="text-xs text-forge-muted mb-3 line-clamp-1">{skill.description}</p>
              
              {skill.comingSoon ? (
                <button
                  onClick={(e) => handleConnect(skill, e)}
                  disabled={isWorking}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-amber/10 text-forge-amber border border-forge-amber/30
                    hover:bg-forge-amber/20 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  준비 중
                </button>
              ) : configured ? (
                <button
                  onClick={(e) => handleDisconnect(skill, e)}
                  disabled={isWorking}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-error/10 text-forge-error border border-forge-error/30
                    hover:bg-forge-error/20 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  연결 해제
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnect(skill, e)}
                  disabled={isWorking}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-white text-[#1a1c24] font-medium
                    hover:bg-gray-100 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  연결
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 연결 해제 확인 모달 */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 bg-[#0a0b0f]/70 backdrop-blur-md ${isDisconnecting ? '' : 'cursor-pointer'}`}
            onClick={cancelDisconnect}
          />
          <div className="relative z-10 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-2xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-2">연결 해제 확인</h3>
            <p className="text-sm text-forge-muted mb-4">
              <span className="text-forge-copper">{disconnectTarget.name}</span> 연동을 해제하시겠습니까?
              <br />
              저장된 API 키가 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDisconnect}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDisconnecting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    해제 중...
                  </>
                ) : (
                  '해제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
