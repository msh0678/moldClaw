import { useState } from 'react'

export type Page = 'dashboard' | 'notifications' | 'files' | 'logs'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  onSettings: () => void
}

const menuItems: { id: Page; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '🏠', label: '대시보드' },
  { id: 'notifications', icon: '🔔', label: '알림 관리' },
  { id: 'files', icon: '📁', label: '파일/기록' },
  { id: 'logs', icon: '📋', label: '로그' },
]

export default function Sidebar({ currentPage, onNavigate, onSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div 
      className={`sidebar h-full flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* 로고 영역 */}
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <img 
          src="/app-icon.png" 
          alt="moldClaw" 
          className="w-10 h-10 object-contain"
        />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-forge-text">moldClaw</h1>
            <p className="text-xs text-forge-muted">OpenClaw Manager</p>
          </div>
        )}
      </div>

      {/* 메뉴 항목들 */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left ${
              currentPage === item.id 
                ? 'active text-forge-copper' 
                : 'text-forge-text hover:text-forge-copper'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* 하단 영역 */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {/* 설정 버튼 - 대시보드에서만 활성화 */}
        {currentPage === 'dashboard' && (
          <button
            onClick={onSettings}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg btn-secondary ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="text-xl">⚙️</span>
            {!collapsed && <span className="font-medium">설정</span>}
          </button>
        )}

        {/* 접기/펼치기 버튼 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-forge-muted hover:text-forge-text transition-colors"
        >
          <span className="text-sm">{collapsed ? '→' : '←'}</span>
          {!collapsed && <span className="text-xs">사이드바 접기</span>}
        </button>
      </div>
    </div>
  )
}
