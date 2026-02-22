// SettingsSidebar - 설정 좌측 패널
// 일반 설정 / 고급 설정 모드 토글

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
  advancedOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'general', icon: '⚙️', label: '일반', description: '기본 설정' },
  { id: 'model', icon: '🤖', label: 'AI 모델', description: 'AI 서비스 설정' },
  { id: 'messenger', icon: '💬', label: '메신저', description: '채널 연결 관리' },
  { id: 'skills', icon: '🎯', label: '스킬', description: '추가 기능', advancedOnly: true },
  { id: 'tools', icon: '🔧', label: '도구', description: '외부 도구 연동', advancedOnly: true },
  { id: 'tts', icon: '🔊', label: 'TTS', description: '음성 합성', advancedOnly: true },
  { id: 'gmail', icon: '📧', label: 'Gmail', description: '이메일 연동' },
];

export default function SettingsSidebar({
  currentSection,
  onSectionChange,
  mode,
  onModeChange,
  onClose,
}: SettingsSidebarProps) {
  const filteredItems = mode === 'advanced' 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(item => !item.advancedOnly);

  return (
    <div className="w-64 bg-forge-dark border-r border-white/10 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-forge-muted hover:text-forge-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">대시보드로</span>
        </button>
      </div>

      {/* 모드 토글 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 p-1 bg-forge-surface rounded-lg">
          <button
            onClick={() => onModeChange('normal')}
            className={`
              flex-1 py-2 text-sm rounded-md transition-all
              ${mode === 'normal' 
                ? 'bg-forge-copper text-white' 
                : 'text-forge-muted hover:text-forge-text'}
            `}
          >
            일반
          </button>
          <button
            onClick={() => onModeChange('advanced')}
            className={`
              flex-1 py-2 text-sm rounded-md transition-all
              ${mode === 'advanced' 
                ? 'bg-forge-copper text-white' 
                : 'text-forge-muted hover:text-forge-text'}
            `}
          >
            고급
          </button>
        </div>
      </div>

      {/* 메뉴 항목들 */}
      <nav className="flex-1 py-2 overflow-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left transition-all
              ${currentSection === item.id
                ? 'bg-forge-copper/15 text-forge-copper border-l-3 border-forge-copper'
                : 'text-forge-text hover:bg-white/5'}
            `}
          >
            <span className="text-xl w-8">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-forge-muted truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-forge-muted text-center">
          <p>moldClaw Settings</p>
          <p className="text-forge-copper mt-1">
            {mode === 'advanced' ? '고급 모드' : '일반 모드'}
          </p>
        </div>
      </div>
    </div>
  );
}
