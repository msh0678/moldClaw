// 스킬 설치 방법
export type InstallMethod = 
  | 'brew' 
  | 'go' 
  | 'npm' 
  | 'uv' 
  | 'winget' 
  | 'builtin' 
  | 'manual';

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

// 연결 해제 설정
export interface DisconnectConfig {
  logout_command: string | null;
  config_paths: string[];
  env_vars: string[];
  mac_permissions: MacPermissions | null;
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

// 스킬 정의
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  install_method: InstallMethod;
  install_command: string | null;
  windows_install_method: InstallMethod | null;
  windows_install_command: string | null;
  binary_name: string | null;
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
  version: string | null;
  error: string | null;
}

// Prerequisite 상태
export interface PrerequisiteStatus {
  go_installed: boolean;
  go_version: string | null;
  uv_installed: boolean;
  uv_version: string | null;
  brew_installed: boolean;
  brew_version: string | null;
  winget_installed: boolean;
  npm_installed: boolean;
  npm_version: string | null;
}

// 스킬 상태 응답
export interface SkillsStatusResponse {
  skills: Record<string, SkillStatus>;
  prerequisites: PrerequisiteStatus;
  platform: 'windows' | 'macos' | 'linux';
}

// 스킬 삭제 결과
export interface UninstallResult {
  success: boolean;
  message: string;
  manual_command: string | null;
}

// 카테고리 정의
export const SKILL_CATEGORIES: Record<string, { name: string; emoji: string }> = {
  builtin: { name: '내장', emoji: '⚙️' },
  productivity: { name: '생산성', emoji: '📋' },
  dev: { name: '개발', emoji: '💻' },
  media: { name: '미디어', emoji: '🎬' },
  messaging: { name: '메시징', emoji: '💬' },
  smarthome: { name: '스마트홈', emoji: '🏠' },
  lifestyle: { name: '라이프스타일', emoji: '🌟' },
};

// 설치 방법별 라벨
export const INSTALL_METHOD_LABELS: Record<InstallMethod, string> = {
  brew: 'Homebrew',
  go: 'Go',
  npm: 'npm',
  uv: 'uv (Python)',
  winget: 'winget',
  builtin: '내장',
  manual: '수동 설치',
};

// 플랫폼에 따른 실제 설치 방법 결정
export function getEffectiveInstallMethod(
  skill: SkillDefinition, 
  platform: 'windows' | 'macos' | 'linux'
): InstallMethod {
  if (platform === 'windows' && skill.windows_install_method) {
    return skill.windows_install_method;
  }
  return skill.install_method;
}

// 스킬이 현재 플랫폼에서 사용 가능한지 확인
export function isSkillAvailable(
  skill: SkillDefinition, 
  platform: 'windows' | 'macos' | 'linux'
): boolean {
  switch (platform) {
    case 'windows': return skill.platform.windows;
    case 'macos': return skill.platform.macos;
    case 'linux': return skill.platform.linux;
    default: return false;
  }
}

// Prerequisite가 필요한지 확인
export function needsPrerequisite(
  skill: SkillDefinition,
  platform: 'windows' | 'macos' | 'linux',
  prereqs: PrerequisiteStatus
): { needed: boolean; missing: string | null } {
  const method = getEffectiveInstallMethod(skill, platform);
  
  switch (method) {
    case 'go':
      return { needed: true, missing: prereqs.go_installed ? null : 'Go' };
    case 'uv':
      return { needed: true, missing: prereqs.uv_installed ? null : 'uv' };
    case 'brew':
      if (platform !== 'windows') {
        return { needed: true, missing: prereqs.brew_installed ? null : 'Homebrew' };
      }
      return { needed: false, missing: null };
    case 'npm':
      return { needed: true, missing: prereqs.npm_installed ? null : 'npm' };
    case 'winget':
      if (platform === 'windows') {
        return { needed: true, missing: prereqs.winget_installed ? null : 'winget' };
      }
      return { needed: false, missing: null };
    default:
      return { needed: false, missing: null };
  }
}
