// 스킬 설치 방법
export type InstallMethod = 'brew' | 'go' | 'npm' | 'uv' | 'winget' | 'builtin' | 'manual';

// 플랫폼 지원
export interface PlatformSupport {
  windows: boolean;
  macos: boolean;
  linux: boolean;
}

// macOS 권한
export interface MacPermissions {
  automation: string[];
  full_disk_access: boolean;
  screen_recording: boolean;
  accessibility: boolean;
  reminders: boolean;
}

// 설정 요구사항 (tagged union)
export type SetupRequirement =
  | { type: 'none' }
  | { type: 'api_key'; vars: string[] }
  | { type: 'login'; command: string }
  | { type: 'config'; path: string }
  | { type: 'mac_permission'; permissions: MacPermissions }
  | { type: 'hardware'; description: string }
  | { type: 'custom'; description: string };

// 연결 해제 설정
export interface DisconnectConfig {
  logout_command?: string;
  config_paths: string[];
  env_vars: string[];
  mac_permissions?: MacPermissions;
}

// 스킬 정의
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  install_method: InstallMethod;
  install_command?: string;
  binary_name?: string;
  platform: PlatformSupport;
  setup: SetupRequirement;
  disconnect: DisconnectConfig;
  hidden: boolean;
}

// 스킬 상태
export interface SkillStatus {
  id: string;
  installed: boolean;
  configured: boolean;
  enabled: boolean;
  version?: string;
  error?: string;
}

// 전체 스킬 상태 응답
export interface SkillsStatusResponse {
  skills: Record<string, SkillStatus>;
  platform: 'windows' | 'macos' | 'linux';
}

// 카테고리 정의
export const SKILL_CATEGORIES: Record<string, { name: string; emoji: string }> = {
  productivity: { name: '생산성', emoji: '📊' },
  media: { name: '미디어', emoji: '🎵' },
  messaging: { name: '메시징', emoji: '💬' },
  smarthome: { name: '스마트홈', emoji: '🏠' },
  dev: { name: '개발', emoji: '💻' },
  lifestyle: { name: '라이프스타일', emoji: '🌟' },
  builtin: { name: '내장', emoji: '⚙️' },
};
