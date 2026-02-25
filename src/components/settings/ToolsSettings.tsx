// ToolsSettings - 도구(Tools) 설정 섹션
// QA 강화: 연타 방지, 모달 자동 닫기, 해제 연타 방지

import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FullConfig, SettingsMode } from '../../types/config';
import { BrandIcon } from '../common/BrandIcon';

interface ToolsSettingsProps {
  config: FullConfig;
  updateConfig: (updates: Partial<FullConfig>) => void;
  commitConfig: (newConfig: FullConfig) => void;
  mode: SettingsMode;
  openModal: (title: string, component: React.ReactNode) => void;
  closeModal: () => void;
}

interface Tool {
  id: string;
  name: string;
  icon: string;
  iconSlug?: string;         // Simple Icons slug for @iconify/react
  iconColor?: string;        // Brand color
  logo?: string;             // Fallback logo URL
  description: string;       // 카드에 표시되는 짧은 설명
  detailedDesc: string;      // 모달에 표시되는 상세 설명
  envVar: string;
  placeholder: string;
  guideUrl?: string;
  guideSteps: string[];      // API 키 발급 방법
  free?: boolean;            // 무료 플랜 여부
  freeLimit?: string;        // 무료 한도
}

const TOOLS: Tool[] = [
  {
    id: 'brave-search',
    name: 'Brave Search',
    icon: '🔍',
    iconSlug: 'brave',
    iconColor: '#FB542B',
    logo: 'https://cdn.simpleicons.org/brave/FB542B',
    description: '인터넷 검색',
    detailedDesc: 'AI가 인터넷에서 정보를 검색할 수 있게 해줍니다. "최신 뉴스 알려줘", "○○ 맛집 추천해줘" 같은 질문에 답할 수 있습니다.',
    envVar: 'BRAVE_API_KEY',
    placeholder: 'BSA...',
    guideUrl: 'https://brave.com/search/api/',
    guideSteps: [
      'brave.com/search/api 접속',
      '무료 계정 생성 (이메일만 필요)',
      'API Keys 메뉴에서 키 생성',
      '생성된 키를 아래에 입력',
    ],
    free: true,
    freeLimit: '월 2,000회 무료',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    icon: '🔥',
    description: '웹페이지 내용 추출',
    detailedDesc: '웹페이지의 텍스트 내용을 깔끔하게 추출합니다. "이 링크 요약해줘"라고 하면 AI가 해당 페이지를 읽고 요약해줍니다.',
    envVar: 'FIRECRAWL_API_KEY',
    placeholder: 'fc-...',
    guideUrl: 'https://firecrawl.dev/',
    guideSteps: [
      'firecrawl.dev 접속',
      'Get Started 클릭 → 회원가입',
      'Dashboard에서 API Key 복사',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '월 500회 무료',
  },
  {
    id: 'jina',
    name: 'Jina Reader',
    icon: '📖',
    // Simple Icons 미지원 - 이모지 사용
    description: '웹페이지 읽기',
    detailedDesc: '웹페이지를 AI가 이해하기 쉬운 형태로 변환합니다. 광고, 메뉴 등을 제외한 본문만 추출합니다.',
    envVar: 'JINA_API_KEY',
    placeholder: 'jina_...',
    guideUrl: 'https://jina.ai/',
    guideSteps: [
      'jina.ai 접속',
      '무료 계정 생성',
      'API Keys 메뉴에서 키 발급',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '무료 플랜 제공',
  },
  {
    id: 'serper',
    name: 'Serper',
    icon: '🌐',
    description: 'Google 검색',
    detailedDesc: 'Google 검색 결과를 가져옵니다. Brave Search와 비슷하지만 Google 검색 결과를 사용합니다.',
    envVar: 'SERPER_API_KEY',
    placeholder: '...',
    guideUrl: 'https://serper.dev/',
    guideSteps: [
      'serper.dev 접속',
      'Get API Key 클릭 → 회원가입',
      'Dashboard에서 API Key 복사',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '2,500회 무료 크레딧',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    icon: '🔎',
    description: 'AI 전용 검색',
    detailedDesc: 'AI 에이전트를 위해 최적화된 검색 엔진입니다. 일반 검색보다 AI가 이해하기 좋은 형태로 결과를 제공합니다.',
    envVar: 'TAVILY_API_KEY',
    placeholder: 'tvly-...',
    guideUrl: 'https://tavily.com/',
    guideSteps: [
      'tavily.com 접속',
      'Get Started 클릭 → 회원가입',
      'API Key 복사',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '월 1,000회 무료',
  },
  {
    id: 'exa',
    name: 'Exa',
    icon: '⚡',
    logo: 'https://cdn.simpleicons.org/exa/5468FF',
    description: '의미 기반 검색',
    detailedDesc: '키워드가 아닌 의미로 검색합니다. "나와 비슷한 글 찾아줘" 같은 복잡한 검색에 강합니다.',
    envVar: 'EXA_API_KEY',
    placeholder: 'exa-...',
    guideUrl: 'https://exa.ai/',
    guideSteps: [
      'exa.ai 접속',
      'Get API Key 클릭',
      '회원가입 후 키 발급',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '월 1,000회 무료',
  },
  {
    id: 'browserless',
    name: 'Browserless',
    icon: '🌐',
    description: '자동 브라우저',
    detailedDesc: '로그인이 필요하거나 JavaScript로 동작하는 복잡한 웹사이트도 읽을 수 있습니다. 일반 스크래핑으로 안 되는 페이지에 사용합니다.',
    envVar: 'BROWSERLESS_API_KEY',
    placeholder: '...',
    guideUrl: 'https://www.browserless.io/',
    guideSteps: [
      'browserless.io 접속',
      'Start Free Trial 클릭',
      '회원가입 후 Dashboard에서 API Key 확인',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '무료 체험 제공',
  },
  {
    id: 'scraperapi',
    name: 'ScraperAPI',
    icon: '🕷️',
    description: '차단 우회 스크래핑',
    detailedDesc: '봇 차단을 우회하여 웹페이지를 읽습니다. 자주 차단되는 사이트의 정보를 가져올 때 유용합니다.',
    envVar: 'SCRAPERAPI_KEY',
    placeholder: '...',
    guideUrl: 'https://www.scraperapi.com/',
    guideSteps: [
      'scraperapi.com 접속',
      '무료 계정 생성',
      'Dashboard에서 API Key 복사',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '월 1,000회 무료',
  },
  {
    id: 'apify',
    name: 'Apify',
    icon: '🤖',
    logo: 'https://cdn.simpleicons.org/apify/00E388',
    description: '웹 자동화',
    detailedDesc: '복잡한 웹 작업을 자동화합니다. 미리 만들어진 스크래퍼(Actor)를 사용해 다양한 사이트 데이터를 수집할 수 있습니다.',
    envVar: 'APIFY_TOKEN',
    placeholder: 'apify_api_...',
    guideUrl: 'https://console.apify.com/',
    guideSteps: [
      'console.apify.com 접속',
      '회원가입 (GitHub/Google 로그인 가능)',
      'Settings → API & Integrations',
      'Personal API Token 복사 → 아래에 입력',
    ],
    free: true,
    freeLimit: '월 $5 무료 크레딧',
  },
  {
    id: 'wolfram',
    name: 'Wolfram Alpha',
    icon: '🔢',
    logo: 'https://cdn.simpleicons.org/wolframlanguage/DD1100',
    description: '수학/과학 계산',
    detailedDesc: '복잡한 수학 문제, 과학 계산, 단위 변환 등을 처리합니다. "3x² + 2x - 1 = 0 풀어줘" 같은 질문에 정확한 답을 줍니다.',
    envVar: 'WOLFRAM_APP_ID',
    placeholder: '...',
    guideUrl: 'https://products.wolframalpha.com/api/',
    guideSteps: [
      'products.wolframalpha.com/api 접속',
      'Get API Access 클릭 → 회원가입',
      'Get an AppID 버튼 클릭',
      'App Name 입력 후 AppID 복사 → 아래에 입력',
    ],
    free: true,
    freeLimit: '월 2,000회 무료',
  },
  {
    id: 'newsapi',
    name: 'News API',
    icon: '📰',
    description: '뉴스 검색',
    detailedDesc: '전 세계 뉴스를 검색합니다. "오늘 주요 뉴스 알려줘", "○○ 관련 기사 찾아줘" 같은 요청에 최신 뉴스를 제공합니다.',
    envVar: 'NEWS_API_KEY',
    placeholder: '...',
    guideUrl: 'https://newsapi.org/',
    guideSteps: [
      'newsapi.org 접속',
      'Get API Key 클릭 → 회원가입',
      '이메일 인증 후 API Key 확인',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '개발용 무료 (프로덕션은 유료)',
  },
  {
    id: 'weatherapi',
    name: 'Weather API',
    icon: '🌤️',
    description: '날씨 정보',
    detailedDesc: '전 세계 날씨 정보를 제공합니다. "서울 날씨 어때?", "내일 비 와?" 같은 질문에 정확한 날씨를 알려줍니다.',
    envVar: 'WEATHER_API_KEY',
    placeholder: '...',
    guideUrl: 'https://www.weatherapi.com/',
    guideSteps: [
      'weatherapi.com 접속',
      'Sign Up 클릭 → 무료 계정 생성',
      'Dashboard에서 API Key 확인',
      '아래에 입력',
    ],
    free: true,
    freeLimit: '월 100만회 무료',
  },
];

export default function ToolsSettings({
  config,
  updateConfig: _updateConfig,
  commitConfig,
  mode: _mode,
  openModal,
  closeModal,
}: ToolsSettingsProps) {
  const [disconnectTarget, setDisconnectTarget] = useState<Tool | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const isWorkingRef = useRef(false);

  const isConfigured = (tool: Tool) => !!config.integrations[tool.envVar];

  const handleConnect = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    
    const ToolModal = () => {
      const [apiKey, setApiKey] = useState(config.integrations[tool.envVar] || '');
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState<string | null>(null);
      
      const handleSave = async () => {
        if (saving) return; // 연타 방지
        if (!apiKey.trim()) return;
        
        setSaving(true);
        setError(null);
        isWorkingRef.current = true;
        
        try {
          await invoke('update_integrations_config', {
            integrations: { [tool.envVar]: apiKey.trim() }
          });
          
          const newConfig = {
            ...config,
            integrations: {
              ...config.integrations,
              [tool.envVar]: apiKey.trim(),
            }
          };
          commitConfig(newConfig);
          closeModal(); // 성공 시 자동 닫기
        } catch (err) {
          console.error('도구 저장 실패:', err);
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
            <p className="text-sm text-forge-text leading-relaxed">{tool.detailedDesc}</p>
            {tool.free && tool.freeLimit && (
              <p className="text-xs text-forge-success mt-2">✓ {tool.freeLimit}</p>
            )}
          </div>
          
          {/* API 키 발급 방법 */}
          <div>
            <p className="text-sm font-medium text-forge-muted mb-2">API 키 발급 방법</p>
            <ol className="space-y-1.5 text-sm text-forge-muted">
              {tool.guideSteps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-forge-copper font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          
          {/* API 키 입력 */}
          <div>
            <label className="block text-sm font-medium text-forge-muted mb-2">
              API 키 입력
            </label>
            <input
              type="password"
              placeholder={tool.placeholder}
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

          {tool.guideUrl && (
            <a
              href={tool.guideUrl}
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
        </div>
      );
    };

    openModal(`${tool.name} 설정`, <ToolModal />);
  };

  const handleDisconnect = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkingRef.current || isDisconnecting) return;
    setDisconnectTarget(tool);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget || isDisconnecting) return;
    
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
        <h2 className="text-xl font-bold text-forge-text mb-2">도구</h2>
        <p className="text-forge-muted text-sm">웹 검색, 스크래핑 등 외부 도구를 설정합니다</p>
      </div>

      {/* 도구 그리드 */}
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
                ${isWorking ? 'opacity-60 pointer-events-none' : ''}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <BrandIcon 
                  iconSlug={tool.iconSlug}
                  iconColor={tool.iconColor}
                  logo={tool.logo}
                  icon={tool.icon}
                  name={tool.name}
                  size={24}
                />
                <span className="font-medium text-forge-text text-sm">{tool.name}</span>
              </div>
              <p className="text-xs text-forge-muted mb-3 line-clamp-1">{tool.description}</p>
              
              {configured ? (
                <button
                  onClick={(e) => handleDisconnect(tool, e)}
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
                  onClick={(e) => handleConnect(tool, e)}
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
