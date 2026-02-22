// SettingsSidebar - 설정 좌측 패널
// 모든 설정 항목 표시 (일반/고급 구분 없음)

import type { SettingsSection, SettingsMode } from '../../types/config';

interface SettingsSidebarProps {
  currentSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  mode: SettingsMode;
  onModeChange: (mode: SettingsMode) => void;
  onClose: () => void;
}

interface MenuItem {
  id: SettingsSection;
  icon: string;
  label: string;
  description: string;
}

// '일반' 항목 제거, 모든 항목 동일 레벨로 표시
const MENU_ITEMS: MenuItem[] = [
  { id: 'model', icon: '🤖', label: 'AI 모델', description: 'AI 서비스 설정' },
  { id: 'messenger', icon: '💬', label: '메신저', description: '채널 연결 관리' },
  { id: 'tools', icon: '🔧', label: '도구', description: '외부 도구 연동' },
  { id: 'skills', icon: '🎯', label: '스킬', description: '추가 기능' },
  { id: 'tts', icon: '🔊', label: 'TTS', description: '음성 합성' },
  { id: 'gmail', icon: '📧', label: 'Gmail', description: '이메일 연동' },
];

export default function SettingsSidebar({
  currentSection,
  onSectionChange,
  mode: _mode,
  onModeChange: _onModeChange,
  onClose,
}: SettingsSidebarProps) {
  return (
    <div className="w-56 bg-[#1a1c24] border-r border-[#2a2d3e] flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-[#2a2d3e]">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-forge-muted hover:text-forge-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">대시보드</span>
        </button>
      </div>

      {/* 설정 타이틀 */}
      <div className="px-4 py-3 border-b border-[#2a2d3e]">
        <h2 className="text-lg font-bold text-forge-text">설정</h2>
      </div>

      {/* 메뉴 항목들 */}
      <nav className="flex-1 py-2 overflow-auto">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left transition-all
              ${currentSection === item.id
                ? 'bg-forge-copper/15 text-forge-copper border-l-[3px] border-forge-copper'
                : 'text-forge-text hover:bg-white/5 border-l-[3px] border-transparent'}
            `}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-[10px] text-forge-muted truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-[#2a2d3e]">
        <p className="text-[10px] text-forge-muted text-center">
          각 항목에서 변경 후 저장
        </p>
      </div>
    </div>
  );
}
