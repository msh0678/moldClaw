# moldClaw Skill Platform Architecture

## 개요

49개 OpenClaw 스킬을 moldClaw에 통합하면서, 플랫폼별로 사용 불가능한 스킬을 필터링/비활성화하는 시스템.

## 핵심 원칙

1. **데이터 주도**: 스킬 메타데이터에 플랫폼 호환성 정보 포함
2. **런타임 필터링**: Rust 백엔드에서 현재 OS 감지 → 프론트엔드에 전달
3. **점진적 공개**: 비활성화된 스킬도 보여주되, 왜 안 되는지 설명

---

## 데이터 구조

### 1. Skill 타입 정의 (`src/types/skills.ts`)

```typescript
export type Platform = 'darwin' | 'linux' | 'win32';
export type InstallKind = 'brew' | 'go' | 'npm' | 'uv' | 'winget' | 'pip' | 'download' | 'none' | 'channel';

export interface InstallMethod {
  id: string;
  kind: InstallKind;
  platforms: Platform[];        // 이 설치 방법이 지원하는 플랫폼
  package?: string;             // npm/go/uv 패키지명
  formula?: string;             // brew formula
  wingetId?: string;            // winget 패키지 ID
  bins?: string[];              // 설치되는 바이너리
  label: string;                // UI 표시용
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  emoji: string;
  
  // 플랫폼 호환성
  platforms: Platform[];        // 스킬 자체가 지원하는 플랫폼 (앱 종속성)
  installMethods: InstallMethod[];
  
  // 요구사항
  requiredBins?: string[];
  requiredEnv?: string[];
  requiredConfig?: string[];    // e.g., ['channels.discord']
  
  // 상태
  category: SkillCategory;
}

export type SkillCategory = 
  | 'productivity'    // 노트, 할일, 캘린더
  | 'communication'   // 메신저, 이메일
  | 'media'           // 음악, 이미지, 비디오
  | 'smart-home'      // 조명, 스피커, 온도
  | 'development'     // 코딩, Git, MCP
  | 'ai'              // 이미지 생성, TTS, STT
  | 'utility';        // 날씨, 검색, 요약

// 런타임 상태 (UI용)
export interface SkillWithStatus extends Skill {
  available: boolean;           // 현재 플랫폼에서 사용 가능
  unavailableReason?: string;   // 불가능 사유
  installed: boolean;           // 필요 바이너리 설치됨
  configured: boolean;          // 필요 설정 완료됨
}
```

### 2. 플랫폼별 설치 방법 매핑

```typescript
// 설치 방법별 플랫폼 지원
const INSTALL_PLATFORM_SUPPORT: Record<InstallKind, Platform[]> = {
  'brew':     ['darwin', 'linux'],  // Homebrew (Linux도 지원하지만 일반적이진 않음)
  'go':       ['darwin', 'linux', 'win32'],
  'npm':      ['darwin', 'linux', 'win32'],
  'uv':       ['darwin', 'linux', 'win32'],
  'pip':      ['darwin', 'linux', 'win32'],
  'winget':   ['win32'],
  'download': ['darwin', 'linux', 'win32'],
  'none':     ['darwin', 'linux', 'win32'],  // 바이너리 불필요
  'channel':  ['darwin', 'linux', 'win32'],  // 채널 설정만 필요
};
```

---

## 스킬 데이터 (`src/data/skills.ts`)

```typescript
import { Skill } from '../types/skills';

export const SKILLS: Skill[] = [
  // ✅ 크로스플랫폼 (Windows OK)
  {
    id: '1password',
    name: '1Password',
    description: '1Password CLI로 비밀번호/시크릿 조회·주입·실행',
    emoji: '🔐',
    platforms: ['darwin', 'linux', 'win32'],
    installMethods: [
      { id: 'brew', kind: 'brew', platforms: ['darwin', 'linux'], formula: '1password-cli', bins: ['op'], label: 'Homebrew' },
      { id: 'winget', kind: 'winget', platforms: ['win32'], wingetId: 'AgileBits.1Password.CLI', bins: ['op'], label: 'winget' },
    ],
    requiredBins: ['op'],
    category: 'utility',
  },
  
  // ❌ macOS 전용 (앱 종속)
  {
    id: 'apple-notes',
    name: 'Apple Notes',
    description: 'macOS 메모 앱 관리',
    emoji: '📝',
    platforms: ['darwin'],  // macOS만
    installMethods: [
      { id: 'brew', kind: 'brew', platforms: ['darwin'], formula: 'antoniorodr/memo/memo', bins: ['memo'], label: 'Homebrew' },
    ],
    requiredBins: ['memo'],
    category: 'productivity',
  },
  
  // ⚠️ brew-only (Windows 대안 없음)
  {
    id: 'sag',
    name: 'ElevenLabs TTS',
    description: 'ElevenLabs TTS. macOS say 스타일 UX',
    emoji: '🗣️',
    platforms: ['darwin', 'linux'],  // Windows 제외
    installMethods: [
      { id: 'brew', kind: 'brew', platforms: ['darwin', 'linux'], formula: 'steipete/tap/sag', bins: ['sag'], label: 'Homebrew' },
    ],
    requiredBins: ['sag'],
    requiredEnv: ['ELEVENLABS_API_KEY'],
    category: 'ai',
  },
  
  // 🔧 go 설치 가능 (크로스플랫폼)
  {
    id: 'blogwatcher',
    name: 'Blog Watcher',
    description: '블로그/RSS/Atom 피드 업데이트 모니터링',
    emoji: '📰',
    platforms: ['darwin', 'linux', 'win32'],
    installMethods: [
      { id: 'go', kind: 'go', platforms: ['darwin', 'linux', 'win32'], 
        package: 'github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest', bins: ['blogwatcher'], label: 'Go' },
    ],
    requiredBins: ['blogwatcher'],
    category: 'utility',
  },
  
  // 📡 채널 설정만 필요
  {
    id: 'discord',
    name: 'Discord',
    description: 'Discord 메시지, 리액션, 스레드, 채널 관리',
    emoji: '🎮',
    platforms: ['darwin', 'linux', 'win32'],
    installMethods: [
      { id: 'channel', kind: 'channel', platforms: ['darwin', 'linux', 'win32'], label: '채널 설정' },
    ],
    requiredConfig: ['channels.discord'],
    category: 'communication',
  },
  
  // ... 나머지 44개 스킬
];
```

---

## Rust 백엔드 (`src-tauri/src/lib.rs`)

```rust
#[tauri::command]
fn get_current_platform() -> String {
    #[cfg(target_os = "windows")]
    return "win32".to_string();
    
    #[cfg(target_os = "macos")]
    return "darwin".to_string();
    
    #[cfg(target_os = "linux")]
    return "linux".to_string();
}

#[tauri::command]
fn check_binary_exists(bin_name: &str) -> bool {
    which::which(bin_name).is_ok()
}

#[tauri::command]
fn check_binaries(bins: Vec<String>) -> HashMap<String, bool> {
    bins.into_iter()
        .map(|bin| (bin.clone(), which::which(&bin).is_ok()))
        .collect()
}
```

---

## 프론트엔드 필터링 로직 (`src/hooks/useSkills.ts`)

```typescript
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SKILLS } from '../data/skills';
import { Platform, Skill, SkillWithStatus } from '../types/skills';

export function useSkills() {
  const [platform, setPlatform] = useState<Platform>('win32');
  const [skills, setSkills] = useState<SkillWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. 현재 플랫폼 감지
      const currentPlatform = await invoke<string>('get_current_platform') as Platform;
      setPlatform(currentPlatform);
      
      // 2. 설치된 바이너리 확인
      const allBins = [...new Set(SKILLS.flatMap(s => s.requiredBins || []))];
      const binStatus = await invoke<Record<string, boolean>>('check_binaries', { bins: allBins });
      
      // 3. 스킬별 상태 계산
      const skillsWithStatus: SkillWithStatus[] = SKILLS.map(skill => {
        const available = isSkillAvailable(skill, currentPlatform);
        const unavailableReason = available ? undefined : getUnavailableReason(skill, currentPlatform);
        const installed = (skill.requiredBins || []).every(bin => binStatus[bin]);
        
        return {
          ...skill,
          available,
          unavailableReason,
          installed,
          configured: true, // TODO: 실제 설정 확인
        };
      });
      
      setSkills(skillsWithStatus);
      setLoading(false);
    }
    
    load();
  }, []);

  return { platform, skills, loading };
}

function isSkillAvailable(skill: Skill, platform: Platform): boolean {
  // 1. 스킬 자체가 플랫폼 지원 안 함 (macOS 앱 종속 등)
  if (!skill.platforms.includes(platform)) {
    return false;
  }
  
  // 2. 현재 플랫폼용 설치 방법이 있는지
  const hasInstallMethod = skill.installMethods.some(m => m.platforms.includes(platform));
  if (!hasInstallMethod) {
    return false;
  }
  
  return true;
}

function getUnavailableReason(skill: Skill, platform: Platform): string {
  if (!skill.platforms.includes(platform)) {
    const platformNames: Record<Platform, string> = {
      darwin: 'macOS',
      linux: 'Linux', 
      win32: 'Windows',
    };
    const supportedPlatforms = skill.platforms.map(p => platformNames[p]).join(', ');
    return `${supportedPlatforms} 전용 기능입니다`;
  }
  
  if (!skill.installMethods.some(m => m.platforms.includes(platform))) {
    return 'Windows용 설치 방법이 없습니다 (Homebrew 필요)';
  }
  
  return '알 수 없는 이유';
}
```

---

## UI 컴포넌트 (`src/components/settings/SkillsSettings.tsx`)

```tsx
import { useSkills } from '../../hooks/useSkills';
import { SkillWithStatus } from '../../types/skills';

export function SkillsSettings() {
  const { platform, skills, loading } = useSkills();
  const [showUnavailable, setShowUnavailable] = useState(true);
  
  if (loading) return <LoadingSpinner />;
  
  const availableSkills = skills.filter(s => s.available);
  const unavailableSkills = skills.filter(s => !s.available);
  
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2>스킬 ({availableSkills.length}개 사용 가능)</h2>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input 
            type="checkbox" 
            checked={showUnavailable}
            onChange={e => setShowUnavailable(e.target.checked)}
          />
          사용 불가 스킬 표시 ({unavailableSkills.length}개)
        </label>
      </div>
      
      {/* 카테고리별 그룹 */}
      {CATEGORIES.map(category => (
        <SkillCategory 
          key={category.id}
          category={category}
          skills={skills.filter(s => s.category === category.id)}
          showUnavailable={showUnavailable}
        />
      ))}
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillWithStatus }) {
  const isDisabled = !skill.available;
  
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      isDisabled 
        ? "opacity-50 bg-gray-800/30 border-gray-700 cursor-not-allowed"
        : "bg-surface border-gray-600 hover:border-primary"
    )}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{skill.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{skill.name}</h3>
            {isDisabled && (
              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                사용 불가
              </span>
            )}
            {!isDisabled && !skill.installed && (
              <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                설치 필요
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{skill.description}</p>
          
          {isDisabled && skill.unavailableReason && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              {skill.unavailableReason}
            </p>
          )}
        </div>
        
        {!isDisabled && (
          <Switch 
            checked={skill.configured}
            disabled={!skill.installed}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 플랫폼별 스킬 분류 요약

### Windows 사용 가능 (29개)
| 설치 방법 | 스킬 |
|-----------|------|
| **npm** | clawhub, mcporter, oracle |
| **go** | blogwatcher, blucli, eightctl, ordercli, sonoscli, wacli, gifgrep |
| **uv/pip** | local-places, nano-banana-pro, nano-pdf, openai-image-gen |
| **winget** | 1password, session-logs (jq+rg), video-frames (ffmpeg) |
| **download** | sherpa-onnx-tts |
| **curl (내장)** | openai-whisper-api, weather |
| **없음/채널** | canvas, healthcheck, skill-creator, discord, slack, bluebubbles, voice-call, coding-agent |

### Windows 불가 - macOS 앱 종속 (7개)
`apple-notes`, `apple-reminders`, `bear-notes`, `imsg`, `model-usage`, `peekaboo`, `things-mac`

### Windows 불가 - brew only (13개)
`camsnap`, `gemini`, `gog`, `goplaces`, `himalaya`, `obsidian`, `openhue`, `sag`, `songsee`, `spotify-player`, `summarize`, `openai-whisper`, `tmux`

---

## 구현 순서

1. **Phase 1**: 타입 정의 + 스킬 데이터 49개 작성
2. **Phase 2**: Rust 플랫폼 감지 + 바이너리 체크 커맨드
3. **Phase 3**: `useSkills` 훅 구현
4. **Phase 4**: SkillsSettings UI 컴포넌트
5. **Phase 5**: 스킬별 설정 모달 (API 키 입력 등)

---

## 대안 고려사항

### WSL 지원 (향후)
Windows에서 WSL이 설치되어 있으면 brew-only 스킬도 활성화 가능:

```rust
#[tauri::command]
fn check_wsl_available() -> bool {
    std::process::Command::new("wsl")
        .arg("--status")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
```

WSL 있으면: `wsl -e brew install sag` 형태로 설치/실행 가능하도록 확장.
