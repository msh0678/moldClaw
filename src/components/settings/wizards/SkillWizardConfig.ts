// 스킬별 마법사 설정
// 각 스킬의 마법사 흐름과 UI 텍스트 정의

export interface SkillWizardInfo {
  skillId: string;
  title: string;
  icon: string;
  type: 'login' | 'config' | 'token';
  
  // Login 타입
  loginSteps?: string[];           // 로그인 전 안내 단계
  loginWarning?: string;           // 경고 메시지 (옵션)
  loginCommand?: string;           // 표시용 명령어 (옵션)
  preLoginAction?: 'open_spotify' | 'open_foodora' | 'open_bear';  // 로그인 전 액션
  
  // Config 타입
  configFields?: ConfigField[];    // 입력 필드
  
  // 공통
  pollingFile?: string;            // 폴링할 파일 경로
  successMessage: string;
  platformNote?: string;           // 플랫폼 특이사항
}

export interface ConfigField {
  name: string;
  key: string;
  type: 'text' | 'password' | 'path';
  placeholder: string;
  required: boolean;
}

export const SKILL_WIZARD_CONFIG: Record<string, SkillWizardInfo> = {
  // ===== Login 타입 =====
  
  himalaya: {
    skillId: 'himalaya',
    title: 'Himalaya 이메일 설정',
    icon: '📬',
    type: 'login',
    loginSteps: [
      'IMAP/SMTP 서버 정보를 준비하세요',
      'Gmail 사용 시: 앱 비밀번호를 먼저 생성하세요',
      '터미널에서 설정 마법사가 시작됩니다',
    ],
    loginWarning: 'Gmail은 2단계 인증 사용 시 앱 비밀번호가 필요합니다',
    successMessage: '이메일 계정이 연결되었습니다',
    platformNote: 'macOS, Linux 지원',
  },
  
  'spotify-player': {
    skillId: 'spotify-player',
    title: 'Spotify 연결',
    icon: '🎵',
    type: 'login',
    loginSteps: [
      'Chrome 브라우저에서 Spotify에 로그인하세요',
      '로그인 상태를 유지한 채로 진행하세요',
      '터미널에서 Chrome 쿠키를 가져옵니다',
    ],
    preLoginAction: 'open_spotify',
    successMessage: 'Spotify 계정이 연결되었습니다',
    platformNote: 'macOS ARM64 전용',
  },
  
  '1password': {
    skillId: '1password',
    title: '1Password 로그인',
    icon: '🔐',
    type: 'login',
    loginSteps: [
      '1Password 데스크탑 앱이 설치되어 있어야 합니다',
      '앱 설정에서 CLI 연동을 활성화하세요',
      '터미널에서 로그인 후 앱에서 승인하세요',
    ],
    loginWarning: 'Secret Key와 Master Password가 필요합니다',
    successMessage: '1Password 계정이 연결되었습니다',
    platformNote: 'Windows, macOS, Linux 지원',
  },
  
  openhue: {
    skillId: 'openhue',
    title: 'Philips Hue 연결',
    icon: '💡',
    type: 'login',
    loginSteps: [
      'Hue Bridge가 같은 네트워크에 있어야 합니다',
      '터미널을 열면 Bridge 검색이 시작됩니다',
      '⚠️ 30초 내에 Bridge의 버튼을 누르세요!',
    ],
    loginWarning: '터미널을 열기 전에 Bridge 버튼을 누를 준비를 하세요',
    successMessage: 'Hue Bridge가 연결되었습니다',
    platformNote: 'macOS, Linux 지원',
  },
  
  wacli: {
    skillId: 'wacli',
    title: 'WhatsApp 연결',
    icon: '💬',
    type: 'login',
    loginSteps: [
      '휴대폰에서 WhatsApp을 열어주세요',
      '터미널에 QR 코드가 표시됩니다',
      '설정 → 연결된 기기 → QR 스캔',
    ],
    successMessage: 'WhatsApp이 연결되었습니다',
    platformNote: 'Windows, macOS, Linux 지원',
  },
  
  gog: {
    skillId: 'gog',
    title: 'Google Workspace 연결',
    icon: '📧',
    type: 'login',
    loginSteps: [
      'Gmail, Calendar, Drive에 접근합니다',
      '터미널에서 이메일 주소를 입력하세요',
      '브라우저에서 Google 로그인을 진행합니다',
    ],
    loginWarning: '"확인되지 않은 앱" 경고가 나타나면:\n1. "고급" 클릭\n2. "안전하지 않은 페이지로 이동" 클릭',
    successMessage: 'Google 계정이 연결되었습니다',
    platformNote: 'macOS ARM64 전용',
  },
  
  'food-order': {
    skillId: 'food-order',
    title: 'Foodora 연결',
    icon: '🍕',
    type: 'login',
    loginSteps: [
      'Chrome에서 foodora.at에 로그인하세요',
      '로그인 상태를 유지한 채로 진행하세요',
      '터미널에서 Chrome 쿠키를 가져옵니다',
    ],
    preLoginAction: 'open_foodora',
    successMessage: 'Foodora 계정이 연결되었습니다',
    platformNote: '오스트리아 Foodora 전용',
  },
  
  ordercli: {
    skillId: 'ordercli',
    title: 'Foodora 연결',
    icon: '🛒',
    type: 'login',
    loginSteps: [
      'Chrome에서 foodora.at에 로그인하세요',
      '로그인 상태를 유지한 채로 진행하세요',
      '터미널에서 Chrome 쿠키를 가져옵니다',
    ],
    preLoginAction: 'open_foodora',
    successMessage: 'Foodora 계정이 연결되었습니다',
    platformNote: '오스트리아 Foodora 전용',
  },
  
  // ===== Token 타입 (UI에서 직접 입력) =====
  
  'bear-notes': {
    skillId: 'bear-notes',
    title: 'Bear Notes 연결',
    icon: '🐻',
    type: 'token',
    loginSteps: [
      'Bear 앱을 열어주세요',
      'Help → API Token 메뉴를 클릭하세요',
      '표시된 토큰을 복사하세요',
    ],
    preLoginAction: 'open_bear',
    successMessage: 'Bear Notes가 연결되었습니다',
    platformNote: 'macOS 전용',
  },
  
  // ===== Config 타입 (UI에서 설정 입력) =====
  
  camsnap: {
    skillId: 'camsnap',
    title: '카메라 설정',
    icon: '📷',
    type: 'config',
    configFields: [
      { name: '카메라 이름', key: 'name', type: 'text', placeholder: '거실 카메라', required: true },
      { name: 'RTSP URL', key: 'url', type: 'text', placeholder: 'rtsp://192.168.1.100:554/stream', required: true },
      { name: '사용자명', key: 'username', type: 'text', placeholder: 'admin', required: false },
      { name: '비밀번호', key: 'password', type: 'password', placeholder: '비밀번호', required: false },
    ],
    successMessage: '카메라가 등록되었습니다',
    platformNote: 'macOS ARM64 전용',
  },
  
  obsidian: {
    skillId: 'obsidian',
    title: 'Obsidian Vault 설정',
    icon: '💎',
    type: 'config',
    configFields: [
      { name: 'Vault 경로', key: 'vault_path', type: 'path', placeholder: '/Users/me/Documents/MyVault', required: true },
    ],
    successMessage: 'Obsidian Vault가 설정되었습니다',
    platformNote: 'macOS, Linux 지원',
  },
};

// 스킬 ID로 마법사 설정 가져오기
export function getSkillWizardConfig(skillId: string): SkillWizardInfo | null {
  return SKILL_WIZARD_CONFIG[skillId] || null;
}

// 마법사가 있는 스킬인지 확인
export function hasSkillWizard(skillId: string): boolean {
  return skillId in SKILL_WIZARD_CONFIG;
}
