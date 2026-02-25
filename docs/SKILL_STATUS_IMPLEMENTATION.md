# Skill Status Check 구현 가이드

## 개요

moldClaw에서 스킬 연결 상태를 확인하는 Rust 함수 구현.

---

## 1. 데이터 구조

### Rust (src-tauri/src/lib.rs)

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct SkillRequirements {
    pub bins: Vec<String>,           // 필요한 바이너리
    pub any_bins: Vec<String>,       // 하나만 있으면 됨
    pub env: Vec<String>,            // 필요한 환경변수
    pub config: Vec<String>,         // 필요한 config 경로
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SkillStatus {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub description: String,
    pub available: bool,             // 사용 가능 여부
    pub installed: bool,             // 바이너리 설치됨
    pub configured: bool,            // 환경변수/설정 완료
    pub missing_bins: Vec<String>,   // 없는 바이너리
    pub missing_env: Vec<String>,    // 없는 환경변수
    pub install_method: String,      // "go", "npm", "brew", etc.
    pub install_command: String,     // 실제 설치 명령어
}

#[derive(Serialize, Deserialize)]
pub struct SkillsStatusResponse {
    pub total: usize,
    pub available: usize,
    pub installed: usize,
    pub skills: Vec<SkillStatus>,
}
```

---

## 2. 스킬 메타데이터 (하드코딩)

```rust
// src-tauri/src/skills_data.rs

pub struct SkillMeta {
    pub id: &'static str,
    pub name: &'static str,
    pub emoji: &'static str,
    pub description: &'static str,
    pub bins: &'static [&'static str],
    pub any_bins: &'static [&'static str],
    pub env: &'static [&'static str],
    pub install_method: &'static str,
    pub install_command: &'static str,
    pub platforms: &'static [&'static str],  // ["windows", "macos", "linux"]
}

pub const SKILLS: &[SkillMeta] = &[
    SkillMeta {
        id: "blogwatcher",
        name: "Blog Watcher",
        emoji: "📰",
        description: "블로그/RSS/Atom 피드 업데이트 모니터링",
        bins: &["blogwatcher"],
        any_bins: &[],
        env: &[],
        install_method: "go",
        install_command: "go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest",
        platforms: &["windows", "macos", "linux"],
    },
    SkillMeta {
        id: "sag",
        name: "ElevenLabs TTS",
        emoji: "🗣️",
        description: "ElevenLabs TTS. macOS say 스타일 UX",
        bins: &["sag"],
        any_bins: &[],
        env: &["ELEVENLABS_API_KEY"],
        install_method: "brew",
        install_command: "brew install steipete/tap/sag",
        platforms: &["macos", "linux"],
    },
    SkillMeta {
        id: "weather",
        name: "Weather",
        emoji: "🌤️",
        description: "현재 날씨 및 예보 조회",
        bins: &["curl"],
        any_bins: &[],
        env: &[],
        install_method: "builtin",
        install_command: "",
        platforms: &["windows", "macos", "linux"],
    },
    // ... 나머지 42개 스킬
];
```

---

## 3. 바이너리 존재 확인

```rust
// src-tauri/src/lib.rs

fn check_binary_exists(bin_name: &str) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        std::process::Command::new("cmd")
            .args(["/C", &format!("where {}", bin_name)])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    #[cfg(not(windows))]
    {
        std::process::Command::new("which")
            .arg(bin_name)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

fn check_binaries(bins: &[&str], any_bins: &[&str]) -> (bool, Vec<String>) {
    let mut missing = Vec::new();
    
    // bins: 모두 있어야 함
    for bin in bins {
        if !check_binary_exists(bin) {
            missing.push(bin.to_string());
        }
    }
    
    // any_bins: 하나만 있으면 됨
    if !any_bins.is_empty() {
        let has_any = any_bins.iter().any(|b| check_binary_exists(b));
        if !has_any {
            missing.push(format!("({})", any_bins.join(" 또는 ")));
        }
    }
    
    (missing.is_empty(), missing)
}
```

---

## 4. 환경변수 확인

```rust
fn check_env_vars(env_keys: &[&str]) -> (bool, Vec<String>) {
    let config = read_existing_config();
    let env_vars = config
        .get("env")
        .and_then(|e| e.get("vars"))
        .cloned()
        .unwrap_or(json!({}));
    
    let mut missing = Vec::new();
    
    for key in env_keys {
        let has_key = env_vars
            .get(*key)
            .and_then(|v| v.as_str())
            .map(|s| !s.is_empty())
            .unwrap_or(false);
        
        if !has_key {
            missing.push(key.to_string());
        }
    }
    
    (missing.is_empty(), missing)
}
```

---

## 5. 메인 함수

```rust
#[tauri::command]
fn get_skills_status() -> SkillsStatusResponse {
    use crate::skills_data::SKILLS;
    
    let current_platform = if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    };
    
    let mut skills: Vec<SkillStatus> = Vec::new();
    let mut available_count = 0;
    let mut installed_count = 0;
    
    for meta in SKILLS {
        // 플랫폼 체크
        let platform_ok = meta.platforms.contains(&current_platform);
        
        // 바이너리 체크
        let (bins_ok, missing_bins) = if platform_ok {
            check_binaries(meta.bins, meta.any_bins)
        } else {
            (false, vec!["플랫폼 미지원".to_string()])
        };
        
        // 환경변수 체크
        let (env_ok, missing_env) = check_env_vars(meta.env);
        
        let installed = platform_ok && bins_ok;
        let configured = env_ok;
        let available = installed && configured;
        
        if available {
            available_count += 1;
        }
        if installed {
            installed_count += 1;
        }
        
        skills.push(SkillStatus {
            id: meta.id.to_string(),
            name: meta.name.to_string(),
            emoji: meta.emoji.to_string(),
            description: meta.description.to_string(),
            available,
            installed,
            configured,
            missing_bins,
            missing_env,
            install_method: meta.install_method.to_string(),
            install_command: meta.install_command.to_string(),
        });
    }
    
    SkillsStatusResponse {
        total: skills.len(),
        available: available_count,
        installed: installed_count,
        skills,
    }
}
```

---

## 6. Frontend 사용

```typescript
// src/hooks/useSkills.ts
import { invoke } from '@tauri-apps/api/core';

interface SkillStatus {
  id: string;
  name: string;
  emoji: string;
  description: string;
  available: boolean;
  installed: boolean;
  configured: boolean;
  missingBins: string[];
  missingEnv: string[];
  installMethod: string;
  installCommand: string;
}

interface SkillsStatusResponse {
  total: number;
  available: number;
  installed: number;
  skills: SkillStatus[];
}

export async function getSkillsStatus(): Promise<SkillsStatusResponse> {
  return invoke<SkillsStatusResponse>('get_skills_status');
}
```

```tsx
// src/components/settings/SkillsSettings.tsx
const { data, isLoading } = useQuery({
  queryKey: ['skills-status'],
  queryFn: getSkillsStatus,
});

// UI에서 표시
{data?.skills.map(skill => (
  <SkillCard 
    key={skill.id}
    skill={skill}
    onInstall={() => installSkill(skill.id)}
  />
))}
```

---

## 7. 스킬 설치 함수

```rust
#[tauri::command]
async fn install_skill(skill_id: &str) -> Result<String, String> {
    use crate::skills_data::SKILLS;
    
    let skill = SKILLS.iter()
        .find(|s| s.id == skill_id)
        .ok_or("스킬을 찾을 수 없습니다")?;
    
    match skill.install_method {
        "go" => install_go_skill(skill.install_command).await,
        "npm" => install_npm_skill(skill.install_command).await,
        "brew" => Err("brew는 Windows에서 지원하지 않습니다".to_string()),
        "uv" => install_uv_skill(skill.install_command).await,
        "winget" => install_winget_skill(skill.install_command).await,
        "builtin" => Ok("설치가 필요없는 스킬입니다".to_string()),
        _ => Err("지원하지 않는 설치 방식입니다".to_string()),
    }
}

async fn install_go_skill(command: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;
        
        std::process::Command::new("cmd")
            .args(["/C", command])
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
            .map_err(|e| format!("설치 실패: {}", e))?;
        
        Ok("설치가 시작되었습니다. 새 창에서 진행 상황을 확인하세요.".to_string())
    }
    
    #[cfg(not(windows))]
    {
        std::process::Command::new("sh")
            .args(["-c", command])
            .spawn()
            .map_err(|e| format!("설치 실패: {}", e))?;
        
        Ok("설치가 시작되었습니다.".to_string())
    }
}

async fn install_npm_skill(command: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;
        
        // Windows에서 npm은 cmd /C로 실행해야 함
        std::process::Command::new("cmd")
            .args(["/C", command])
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
            .map_err(|e| format!("설치 실패: {}", e))?;
        
        Ok("설치가 시작되었습니다.".to_string())
    }
    
    #[cfg(not(windows))]
    {
        std::process::Command::new("sh")
            .args(["-c", command])
            .spawn()
            .map_err(|e| format!("설치 실패: {}", e))?;
        
        Ok("설치가 시작되었습니다.".to_string())
    }
}
```

---

## 8. 구현 순서

1. **Phase 1**: `skills_data.rs` 파일 생성 (45개 스킬 메타데이터)
2. **Phase 2**: `check_binary_exists()`, `check_env_vars()` 구현
3. **Phase 3**: `get_skills_status()` 명령어 구현
4. **Phase 4**: `install_skill()` 명령어 구현 (go, npm, uv, winget)
5. **Phase 5**: Frontend `SkillsSettings.tsx` 연동

---

## 9. 파일 구조

```
src-tauri/src/
├── lib.rs              # 기존 + get_skills_status, install_skill 추가
├── skills_data.rs      # 신규: 45개 스킬 메타데이터
├── openclaw.rs         # 기존
└── ...

src/components/settings/
├── SkillsSettings.tsx  # 수정: 스킬 목록 + 설치 UI
└── ...
```
