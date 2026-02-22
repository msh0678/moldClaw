// ToolsSettings - 도구(Tools) 설정 섹션

import { useState } from 'react';
import type { FullConfig, SettingsMode } from '../../types/config';

interface ToolsSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
  envVar: string;
  placeholder: string;
  guideUrl?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'brave-search',
    name: 'Brave Search',
    icon: '🔍',
    description: '웹 검색 (무료 2,000회/월)',
    envVar: 'BRAVE_SEARCH_API_KEY',
    placeholder: 'BSA...',
    guideUrl: 'https://brave.com/search/api/',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    icon: '🔥',
    description: '웹페이지 스크래핑/파싱',
    envVar: 'FIRECRAWL_API_KEY',
    placeholder: 'fc-...',
    guideUrl: 'https://firecrawl.dev/',
  },
  {
    id: 'jina',
    name: 'Jina Reader',
    icon: '📖',
    description: '웹페이지 읽기',
    envVar: 'JINA_API_KEY',
    placeholder: 'jina_...',
    guideUrl: 'https://jina.ai/',
  },
  {
    id: 'serper',
    name: 'Serper',
    icon: '🌐',
    description: 'Google 검색 API',
    envVar: 'SERPER_API_KEY',
    placeholder: '...',
    guideUrl: 'https://serper.dev/',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    icon: '🔎',
    description: 'AI 검색 최적화',
    envVar: 'TAVILY_API_KEY',
    placeholder: 'tvly-...',
    guideUrl: 'https://tavily.com/',
  },
  {
    id: 'exa',
    name: 'Exa',
    icon: '⚡',
    description: 'AI 검색 엔진',
    envVar: 'EXA_API_KEY',
    placeholder: 'exa-...',
    guideUrl: 'https://exa.ai/',
  },
];

export default function ToolsSettings({
  config,
  updateConfig,
  mode: _mode,
  openModal,
  closeModal: _closeModal,
}: ToolsSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<Tool | null>(null);

  const isConfigured = (tool: Tool) => !!config.integrations[tool.envVar];

  const handleConnect = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    const ToolModal = () => (
      <div className="space-y-4">
        <p className="text-sm text-forge-muted">{tool.description}</p>
        
        <div>
          <label className="block text-sm font-medium text-forge-muted mb-2">
            API 키
          </label>
          <input
            type="password"
            placeholder={tool.placeholder}
            defaultValue={config.integrations[tool.envVar] || ''}
            onChange={(e) => {
              updateConfig({
                integrations: {
                  ...config.integrations,
                  [tool.envVar]: e.target.value,
                }
              });
            }}
            className="
              w-full px-4 py-3 bg-[#1a1c24] border-2 border-[#2a2d3e] rounded-xl
              focus:outline-none focus:border-forge-copper text-sm font-mono
            "
          />
          <p className="text-xs text-forge-muted mt-2">
            환경변수: <code className="text-forge-copper">{tool.envVar}</code>
          </p>
        </div>

        {tool.guideUrl && (
          <a
            href={tool.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-forge-copper hover:text-forge-amber mt-4"
          >
            공식 사이트 열기 →
          </a>
        )}
      </div>
    );

    openModal(`${tool.name} 설정`, <ToolModal />);
  };

  const handleDisconnect = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    setDisconnectTarget(tool);
  };

  const confirmDisconnect = () => {
    if (!disconnectTarget) return;
    
    const newIntegrations = { ...config.integrations };
    delete newIntegrations[disconnectTarget.envVar];
    
    updateConfig({ integrations: newIntegrations });
    setDisconnectTarget(null);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-forge-text mb-2">도구</h2>
        <p className="text-forge-muted text-sm">웹 검색, 스크래핑 등 외부 도구를 설정합니다</p>
      </div>

      {/* 도구 그리드 - 3줄 레이아웃 */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map((tool) => {
          const configured = isConfigured(tool);
          return (
            <div
              key={tool.id}
              className={`
                bg-[#1e2030] border-2 rounded-xl p-4 transition-all
                ${configured 
                  ? 'border-forge-success/40 hover:border-forge-success/60' 
                  : 'border-[#2a2d3e] hover:border-[#3a3f52]'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tool.icon}</span>
                <span className="font-medium text-forge-text text-sm">{tool.name}</span>
              </div>
              <p className="text-xs text-forge-muted mb-3 line-clamp-1">{tool.description}</p>
              
              {configured ? (
                <button
                  onClick={(e) => handleDisconnect(tool, e)}
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
                  onClick={(e) => handleConnect(tool, e)}
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
