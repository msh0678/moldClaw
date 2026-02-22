// SkillsSettings - 스킬(Skills) 설정 섹션

import { useState } from 'react';
import type { FullConfig, SettingsMode } from '../../types/config';

interface SkillsSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  envVar?: string;
  guideSteps: string[];
  guideUrl?: string;
}

const SKILLS: Skill[] = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    icon: '🔷',
    description: '캘린더, 이메일 관리',
    guideSteps: ['Google Cloud Console 설정', 'OAuth 자격 증명 생성'],
    guideUrl: 'https://console.cloud.google.com/',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: '노트, 문서 관리',
    envVar: 'NOTION_API_KEY',
    guideSteps: ['Notion Integration 생성', 'API 키 복사'],
    guideUrl: 'https://www.notion.so/my-integrations',
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: '🎨',
    description: '디자인 파일 접근',
    envVar: 'FIGMA_ACCESS_TOKEN',
    guideSteps: ['Figma 설정에서 Personal Access Token 생성'],
    guideUrl: 'https://www.figma.com/developers/api#access-tokens',
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '📋',
    description: '프로젝트 보드 관리',
    envVar: 'TRELLO_API_KEY',
    guideSteps: ['Trello Developer API Key 발급'],
    guideUrl: 'https://trello.com/power-ups/admin',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '📊',
    description: '이슈 트래킹',
    envVar: 'LINEAR_API_KEY',
    guideSteps: ['Linear Settings > API > Personal API keys'],
    guideUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    icon: '💎',
    description: '로컬 노트 관리',
    guideSteps: ['Obsidian Vault 경로 설정'],
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐱',
    description: '코드 저장소 관리',
    envVar: 'GITHUB_TOKEN',
    guideSteps: ['GitHub Settings > Developer settings > Personal access tokens'],
    guideUrl: 'https://github.com/settings/tokens',
  },
];

export default function SkillsSettings({
  config,
  updateConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: SkillsSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<Skill | null>(null);

  const isConfigured = (skill: Skill) => {
    if (!skill.envVar) return false;
    return !!config.integrations[skill.envVar];
  };

  const handleConnect = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    const SkillModal = () => (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">{skill.description}</p>
        
        <ol className="space-y-2">
          {skill.guideSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-forge-muted">
              <span className="text-forge-copper">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>

        {skill.envVar && (
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              API 키
            </label>
            <input
              type="password"
              placeholder="API 키 입력"
              defaultValue={config.integrations[skill.envVar] || ''}
              onChange={(e) => {
                updateConfig({
                  integrations: {
                    ...config.integrations,
                    [skill.envVar!]: e.target.value,
                  }
                });
              }}
              className="
                w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
                focus:outline-none focus:border-forge-copper text-sm font-mono
              "
            />
          </div>
        )}

        {skill.guideUrl && (
          <a
            href={skill.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-forge-copper hover:text-forge-amber mt-4"
          >
            공식 문서 열기 →
          </a>
        )}
      </div>
    );

    openModal(`${skill.name} 연동`, <SkillModal />);
  };

  const handleDisconnect = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    setDisconnectTarget(skill);
  };

  const confirmDisconnect = () => {
    if (!disconnectTarget?.envVar) return;
    
    const newIntegrations = { ...config.integrations };
    delete newIntegrations[disconnectTarget.envVar];
    
    updateConfig({ integrations: newIntegrations });
    setDisconnectTarget(null);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">스킬</h2>
        <p className="text-forge-muted text-sm">외부 서비스와 연동하여 AI의 기능을 확장합니다</p>
      </div>

      {/* 스킬 그리드 - 3줄 레이아웃 */}
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
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{skill.icon}</span>
                <span className="font-medium text-forge-text text-sm">{skill.name}</span>
              </div>
              <p className="text-xs text-forge-muted mb-3 line-clamp-1">{skill.description}</p>
              
              {configured ? (
                <button
                  onClick={(e) => handleDisconnect(skill, e)}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-error/10 text-forge-error border border-forge-error/30
                    hover:bg-forge-error/20 transition-colors
                  "
                >
                  연결 해제
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnect(skill, e)}
                  className="
                    w-full text-xs px-3 py-2 rounded-lg
                    bg-forge-copper/10 text-forge-copper border border-forge-copper/30
                    hover:bg-forge-copper/20 transition-colors
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
            className="absolute inset-0 bg-[#0a0b0f]/90 backdrop-blur-lg"
            onClick={() => setDisconnectTarget(null)}
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
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#252836] text-forge-text hover:bg-[#2d3142] transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDisconnect}
                className="flex-1 px-4 py-2 rounded-lg bg-forge-error text-white hover:bg-forge-error/80 transition-colors"
              >
                해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
