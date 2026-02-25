# moldClaw 스킬/도구 시스템 구현 가이드

## 목표
45개 OpenClaw CLI 스킬 + 11개 moldClaw API 키 스킬을 통합 관리하는 UI/Backend 구현

---

## 1. 데이터 구조

### 1.1 Rust 타입 정의 (`src-tauri/src/skills.rs`)

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 스킬 설치 방법
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallMethod {
    Brew,           // brew install
    Go,             // go install
    Npm,            // npm install -g
    Uv,             // uv tool install
    Winget,         // winget install
    Builtin,        // OpenClaw 내장
    Manual,         // 수동 설치 필요
}

/// 플랫폼 지원
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformSupport {
    pub windows: bool,
    pub macos: bool,
    pub linux: bool,
}

/// macOS 권한 종류
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacPermissions {
    pub automation: Vec<String>,      // ["Notes.app", "Messages.app"]
    pub full_disk_access: bool,
    pub screen_recording: bool,
    pub accessibility: bool,
    pub reminders: bool,
}

/// 스킬 연결 해제 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisconnectConfig {
    pub logout_command: Option<String>,
    pub config_paths: Vec<String>,
    pub env_vars: Vec<String>,
    pub mac_permissions: Option<MacPermissions>,
}

/// 스킬 설정 요구사항
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SetupRequirement {
    None,                           // 설정 불필요
    ApiKey(Vec<String>),            // 환경변수 이름들
    Login(String),                  // 로그인 명령어
    Config(String),                 // config 파일 경로
    MacPermission(MacPermissions),  // macOS 권한
    Hardware(String),               // 하드웨어 설명
    Custom(String),                 // 커스텀 설명
}

/// 스킬 정의
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub emoji: String,
    pub category: String,           // "productivity", "media", "smarthome", "dev", etc.
    
    // 설치 정보
    pub install_method: InstallMethod,
    pub install_command: Option<String>,
    pub binary_name: Option<String>,
    pub platform: PlatformSupport,
    
    // 설정 정보
    pub setup: SetupRequirement,
    pub disconnect: DisconnectConfig,
    
    // UI 표시 여부
    pub hidden: bool,               // canvas, healthcheck 등 자동 활성화
}

/// 스킬 상태
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStatus {
    pub id: String,
    pub installed: bool,            // 바이너리 존재 여부
    pub configured: bool,           // 설정 완료 여부 (API 키, 로그인 등)
    pub enabled: bool,              // skills.entries에서 enabled 상태
    pub version: Option<String>,    // 바이너리 버전 (있으면)
    pub error: Option<String>,      // 에러 메시지 (있으면)
}

/// 전체 스킬 상태 응답
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsStatusResponse {
    pub skills: HashMap<String, SkillStatus>,
    pub platform: String,           // "windows", "macos", "linux"
}
```

### 1.2 스킬 정의 데이터 (`src-tauri/src/skill_definitions.rs`)

```rust
use lazy_static::lazy_static;
use crate::skills::*;

lazy_static! {
    pub static ref SKILL_DEFINITIONS: Vec<SkillDefinition> = vec![
        // ===== 자동 활성화 (hidden) =====
        SkillDefinition {
            id: "canvas".into(),
            name: "Canvas".into(),
            description: "OpenClaw 내장 캔버스".into(),
            emoji: "🎨".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "healthcheck".into(),
            name: "Healthcheck".into(),
            description: "시스템 상태 점검".into(),
            emoji: "🏥".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "skill-creator".into(),
            name: "Skill Creator".into(),
            description: "새 스킬 생성 도구".into(),
            emoji: "🛠️".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "weather".into(),
            name: "Weather".into(),
            description: "날씨 정보 (curl 사용)".into(),
            emoji: "🌤️".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: Some("curl".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        
        // ===== API 키 필요 스킬 =====
        SkillDefinition {
            id: "sag".into(),
            name: "ElevenLabs TTS".into(),
            description: "고품질 음성 합성".into(),
            emoji: "🗣️".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/sag".into()),
            binary_name: Some("sag".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::ApiKey(vec!["ELEVENLABS_API_KEY".into()]),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["ELEVENLABS_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "goplaces".into(),
            name: "Google Places".into(),
            description: "장소 검색".into(),
            emoji: "📍".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/goplaces".into()),
            binary_name: Some("goplaces".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::ApiKey(vec!["GOOGLE_PLACES_API_KEY".into()]),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GOOGLE_PLACES_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "openai-image-gen".into(),
            name: "OpenAI Image Gen".into(),
            description: "DALL-E 이미지 생성".into(),
            emoji: "🎨".into(),
            category: "media".into(),
            install_method: InstallMethod::Manual,
            install_command: None,
            binary_name: Some("python3".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey(vec!["OPENAI_API_KEY".into()]),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["OPENAI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },
        
        // ===== 로그인 필요 스킬 =====
        SkillDefinition {
            id: "gog".into(),
            name: "Google Workspace".into(),
            description: "Gmail, Calendar, Drive 통합".into(),
            emoji: "📧".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/gogcli".into()),
            binary_name: Some("gog".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login("gog auth add".into()),
            disconnect: DisconnectConfig {
                logout_command: Some("gog auth remove-all".into()),
                config_paths: vec!["~/.config/gog/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "wacli".into(),
            name: "WhatsApp CLI".into(),
            description: "WhatsApp 메시지 전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/wacli".into()),
            binary_name: Some("wacli".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login("wacli auth".into()),
            disconnect: DisconnectConfig {
                logout_command: Some("wacli logout".into()),
                config_paths: vec!["~/.config/wacli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "food-order".into(),
            name: "Food Order".into(),
            description: "Foodora 음식 주문".into(),
            emoji: "🍕".into(),
            category: "lifestyle".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/ordercli/cmd/ordercli@latest".into()),
            binary_name: Some("ordercli".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login("ordercli foodora session chrome".into()),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/ordercli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "spotify-player".into(),
            name: "Spotify Player".into(),
            description: "Spotify 음악 제어".into(),
            emoji: "🎵".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/spogo".into()),
            binary_name: Some("spogo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login("spogo auth import --browser chrome".into()),
            disconnect: DisconnectConfig {
                logout_command: Some("spogo auth logout".into()),
                config_paths: vec!["~/.config/spogo/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        
        // ===== macOS 권한 필요 =====
        SkillDefinition {
            id: "apple-notes".into(),
            name: "Apple Notes".into(),
            description: "macOS 메모 앱 연동".into(),
            emoji: "📝".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install antoniorodr/memo/memo".into()),
            binary_name: Some("memo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission(MacPermissions {
                automation: vec!["Notes.app".into()],
                full_disk_access: false,
                screen_recording: false,
                accessibility: false,
                reminders: false,
            }),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    automation: vec!["Notes.app".into()],
                    full_disk_access: false,
                    screen_recording: false,
                    accessibility: false,
                    reminders: false,
                }),
            },
            hidden: false,
        },
        SkillDefinition {
            id: "imsg".into(),
            name: "iMessage".into(),
            description: "iMessage 읽기/전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/imsg".into()),
            binary_name: Some("imsg".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission(MacPermissions {
                automation: vec!["Messages.app".into()],
                full_disk_access: true,
                screen_recording: false,
                accessibility: false,
                reminders: false,
            }),
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    automation: vec!["Messages.app".into()],
                    full_disk_access: true,
                    screen_recording: false,
                    accessibility: false,
                    reminders: false,
                }),
            },
            hidden: false,
        },
        
        // ===== 설정 불필요 (바이너리만) =====
        SkillDefinition {
            id: "blogwatcher".into(),
            name: "Blog Watcher".into(),
            description: "블로그/RSS 구독".into(),
            emoji: "📰".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest".into()),
            binary_name: Some("blogwatcher".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.blogwatcher/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "tmux".into(),
            name: "tmux".into(),
            description: "터미널 멀티플렉서".into(),
            emoji: "🖥️".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install tmux".into()),
            binary_name: Some("tmux".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        SkillDefinition {
            id: "video-frames".into(),
            name: "Video Frames".into(),
            description: "비디오 프레임 추출".into(),
            emoji: "🎬".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install ffmpeg".into()),
            binary_name: Some("ffmpeg".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
        
        // ... 나머지 41개 스킬 정의 추가
    ];
}

/// 현재 플랫폼에서 지원되는 스킬만 필터링
pub fn get_supported_skills() -> Vec<&'static SkillDefinition> {
    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    };
    
    SKILL_DEFINITIONS.iter()
        .filter(|s| !s.hidden)
        .filter(|s| match platform {
            "windows" => s.platform.windows,
            "macos" => s.platform.macos,
            "linux" => s.platform.linux,
            _ => false,
        })
        .collect()
}
```

---

## 2. Rust Backend 구현

### 2.1 스킬 상태 확인 (`src-tauri/src/skills.rs`)

```rust
use std::process::Command;
use std::path::PathBuf;
use dirs;

/// 바이너리 존재 확인
fn check_binary_exists(binary: &str) -> bool {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", &format!("where {}", binary)])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    #[cfg(not(windows))]
    {
        Command::new("which")
            .arg(binary)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// 환경변수 설정 확인 (openclaw.json에서)
fn check_env_var_configured(config: &serde_json::Value, var_name: &str) -> bool {
    config
        .get("env")
        .and_then(|e| e.get("vars"))
        .and_then(|v| v.get(var_name))
        .map(|v| !v.as_str().unwrap_or("").is_empty())
        .unwrap_or(false)
}

/// Config 파일 존재 확인
fn check_config_exists(path: &str) -> bool {
    let expanded = expand_home_path(path);
    expanded.exists()
}

/// ~ 를 홈 디렉토리로 확장
fn expand_home_path(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    }
    PathBuf::from(path)
}

/// 단일 스킬 상태 확인
fn get_skill_status(skill: &SkillDefinition, config: &serde_json::Value) -> SkillStatus {
    // 1. 바이너리 설치 확인
    let installed = if let Some(ref binary) = skill.binary_name {
        check_binary_exists(binary)
    } else {
        // Builtin은 항상 설치됨
        matches!(skill.install_method, InstallMethod::Builtin)
    };
    
    // 2. 설정 완료 확인
    let configured = match &skill.setup {
        SetupRequirement::None => true,
        SetupRequirement::ApiKey(vars) => {
            vars.iter().all(|v| check_env_var_configured(config, v))
        },
        SetupRequirement::Login(_) => {
            // config 파일 존재로 확인
            skill.disconnect.config_paths.iter().any(|p| check_config_exists(p))
        },
        SetupRequirement::Config(path) => check_config_exists(path),
        SetupRequirement::MacPermission(_) => {
            // macOS 권한은 런타임에만 확인 가능, 일단 true
            true
        },
        SetupRequirement::Hardware(_) => true,
        SetupRequirement::Custom(_) => true,
    };
    
    // 3. enabled 상태 확인
    let enabled = config
        .get("skills")
        .and_then(|s| s.get("entries"))
        .and_then(|e| e.get(&skill.id))
        .and_then(|s| s.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(true);  // 기본값 true
    
    SkillStatus {
        id: skill.id.clone(),
        installed,
        configured,
        enabled,
        version: None,  // TODO: 버전 확인 구현
        error: None,
    }
}

/// Tauri 명령: 모든 스킬 상태 조회
#[tauri::command]
pub fn get_skills_status() -> Result<SkillsStatusResponse, String> {
    let config = read_openclaw_config()?;
    let skills = get_supported_skills();
    
    let mut status_map = std::collections::HashMap::new();
    for skill in skills {
        let status = get_skill_status(skill, &config);
        status_map.insert(skill.id.clone(), status);
    }
    
    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }.to_string();
    
    Ok(SkillsStatusResponse {
        skills: status_map,
        platform,
    })
}

/// Tauri 명령: 스킬 정의 목록 조회
#[tauri::command]
pub fn get_skill_definitions() -> Vec<SkillDefinition> {
    get_supported_skills().into_iter().cloned().collect()
}
```

### 2.2 스킬 설치 (`src-tauri/src/skills.rs`)

```rust
/// Tauri 명령: 스킬 설치
#[tauri::command]
pub async fn install_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS.iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;
    
    let install_cmd = skill.install_command.as_ref()
        .ok_or_else(|| "설치 명령어가 없습니다".to_string())?;
    
    match skill.install_method {
        InstallMethod::Brew => install_with_brew(install_cmd).await,
        InstallMethod::Go => install_with_go(install_cmd).await,
        InstallMethod::Npm => install_with_npm(install_cmd).await,
        InstallMethod::Uv => install_with_uv(install_cmd).await,
        InstallMethod::Winget => install_with_winget(install_cmd).await,
        InstallMethod::Builtin => Ok("내장 스킬입니다".into()),
        InstallMethod::Manual => Err("수동 설치가 필요합니다".into()),
    }
}

async fn install_with_brew(cmd: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    return Err("Windows에서는 brew를 사용할 수 없습니다".into());
    
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("sh")
            .args(["-c", cmd])
            .output()
            .map_err(|e| e.to_string())?;
        
        if output.status.success() {
            Ok("설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

async fn install_with_go(cmd: &str) -> Result<String, String> {
    // Go가 설치되어 있는지 확인
    if !check_binary_exists("go") {
        return Err("Go가 설치되어 있지 않습니다. 먼저 Go를 설치해주세요.".into());
    }
    
    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(not(windows))]
    let output = Command::new("sh")
        .args(["-c", cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok("설치 완료".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

async fn install_with_npm(cmd: &str) -> Result<String, String> {
    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(not(windows))]
    let output = Command::new("sh")
        .args(["-c", cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok("설치 완료".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

async fn install_with_uv(cmd: &str) -> Result<String, String> {
    // uv 확인, 없으면 pip fallback
    let use_uv = check_binary_exists("uv");
    
    let actual_cmd = if use_uv {
        cmd.to_string()
    } else {
        // uv tool install -> pip install
        cmd.replace("uv tool install", "pip install")
    };
    
    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", &actual_cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(not(windows))]
    let output = Command::new("sh")
        .args(["-c", &actual_cmd])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok("설치 완료".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

async fn install_with_winget(cmd: &str) -> Result<String, String> {
    #[cfg(not(windows))]
    return Err("winget은 Windows에서만 사용 가능합니다".into());
    
    #[cfg(windows)]
    {
        let output = Command::new("cmd")
            .args(["/C", cmd])
            .output()
            .map_err(|e| e.to_string())?;
        
        if output.status.success() {
            Ok("설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
```

### 2.3 스킬 설정 (API 키/로그인)

```rust
/// Tauri 명령: 스킬 API 키 설정
#[tauri::command]
pub fn configure_skill_api_key(skill_id: String, env_var: String, value: String) -> Result<(), String> {
    let mut config = read_openclaw_config()?;
    
    // env.vars 섹션에 추가
    if config.get("env").is_none() {
        config["env"] = serde_json::json!({});
    }
    if config["env"].get("vars").is_none() {
        config["env"]["vars"] = serde_json::json!({});
    }
    
    config["env"]["vars"][env_var] = serde_json::Value::String(value);
    
    save_openclaw_config(&config)?;
    Ok(())
}

/// Tauri 명령: 스킬 로그인 터미널 열기
#[tauri::command]
pub fn open_skill_login_terminal(skill_id: String, login_command: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            login_command.replace("\"", "\\\"")
        );
        
        Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // gnome-terminal, konsole, xterm 순으로 시도
        let terminals = ["gnome-terminal", "konsole", "xterm"];
        for term in terminals {
            if check_binary_exists(term) {
                let _ = Command::new(term)
                    .args(["--", "sh", "-c", &format!("{}; read -p 'Press Enter to close'", login_command)])
                    .spawn();
                break;
            }
        }
    }
    
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &login_command])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
```

### 2.4 스킬 연결 해제

```rust
/// Tauri 명령: 스킬 연결 해제
#[tauri::command]
pub async fn disconnect_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS.iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;
    
    let disconnect = &skill.disconnect;
    let mut results = Vec::new();
    
    // 1. logout 명령어 실행
    if let Some(ref cmd) = disconnect.logout_command {
        #[cfg(windows)]
        let output = Command::new("cmd").args(["/C", cmd]).output();
        
        #[cfg(not(windows))]
        let output = Command::new("sh").args(["-c", cmd]).output();
        
        match output {
            Ok(o) if o.status.success() => results.push("로그아웃 완료".into()),
            Ok(o) => results.push(format!("로그아웃 실패: {}", String::from_utf8_lossy(&o.stderr))),
            Err(e) => results.push(format!("로그아웃 실패: {}", e)),
        }
    }
    
    // 2. config 폴더/파일 삭제
    for path in &disconnect.config_paths {
        let expanded = expand_home_path(path);
        if expanded.exists() {
            if expanded.is_dir() {
                match std::fs::remove_dir_all(&expanded) {
                    Ok(_) => results.push(format!("{} 삭제됨", path)),
                    Err(e) => results.push(format!("{} 삭제 실패: {}", path, e)),
                }
            } else {
                match std::fs::remove_file(&expanded) {
                    Ok(_) => results.push(format!("{} 삭제됨", path)),
                    Err(e) => results.push(format!("{} 삭제 실패: {}", path, e)),
                }
            }
        }
    }
    
    // 3. 환경변수 제거
    if !disconnect.env_vars.is_empty() {
        let mut config = read_openclaw_config()?;
        for var in &disconnect.env_vars {
            if let Some(vars) = config.get_mut("env")
                .and_then(|e| e.get_mut("vars"))
                .and_then(|v| v.as_object_mut())
            {
                vars.remove(var);
                results.push(format!("{} 환경변수 제거됨", var));
            }
        }
        save_openclaw_config(&config)?;
    }
    
    // 4. skills.entries에서 제거
    let mut config = read_openclaw_config()?;
    if let Some(entries) = config.get_mut("skills")
        .and_then(|s| s.get_mut("entries"))
        .and_then(|e| e.as_object_mut())
    {
        entries.remove(&skill_id);
        results.push("스킬 항목 제거됨".into());
    }
    save_openclaw_config(&config)?;
    
    Ok(results.join("\n"))
}

/// Tauri 명령: 스킬 비활성화만 (연결 해제 아님)
#[tauri::command]
pub fn disable_skill(skill_id: String) -> Result<(), String> {
    let mut config = read_openclaw_config()?;
    
    // skills.entries.<skill_id>.enabled = false
    if config.get("skills").is_none() {
        config["skills"] = serde_json::json!({});
    }
    if config["skills"].get("entries").is_none() {
        config["skills"]["entries"] = serde_json::json!({});
    }
    
    config["skills"]["entries"][&skill_id]["enabled"] = serde_json::Value::Bool(false);
    
    save_openclaw_config(&config)?;
    Ok(())
}

/// Tauri 명령: 스킬 활성화
#[tauri::command]
pub fn enable_skill(skill_id: String) -> Result<(), String> {
    let mut config = read_openclaw_config()?;
    
    if let Some(entry) = config.get_mut("skills")
        .and_then(|s| s.get_mut("entries"))
        .and_then(|e| e.get_mut(&skill_id))
    {
        entry["enabled"] = serde_json::Value::Bool(true);
    }
    
    save_openclaw_config(&config)?;
    Ok(())
}
```

### 2.5 lib.rs에 등록

```rust
// src-tauri/src/lib.rs

mod skills;
mod skill_definitions;

pub use skills::*;
pub use skill_definitions::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 기존 명령어들...
            
            // 스킬 관련
            get_skills_status,
            get_skill_definitions,
            install_skill,
            configure_skill_api_key,
            open_skill_login_terminal,
            disconnect_skill,
            disable_skill,
            enable_skill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 3. React Frontend 구현

### 3.1 타입 정의 (`src/types/skills.ts`)

```typescript
export type InstallMethod = 'brew' | 'go' | 'npm' | 'uv' | 'winget' | 'builtin' | 'manual';

export interface PlatformSupport {
  windows: boolean;
  macos: boolean;
  linux: boolean;
}

export interface MacPermissions {
  automation: string[];
  full_disk_access: boolean;
  screen_recording: boolean;
  accessibility: boolean;
  reminders: boolean;
}

export type SetupRequirement = 
  | { type: 'none' }
  | { type: 'api_key'; vars: string[] }
  | { type: 'login'; command: string }
  | { type: 'config'; path: string }
  | { type: 'mac_permission'; permissions: MacPermissions }
  | { type: 'hardware'; description: string }
  | { type: 'custom'; description: string };

export interface DisconnectConfig {
  logout_command?: string;
  config_paths: string[];
  env_vars: string[];
  mac_permissions?: MacPermissions;
}

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

export interface SkillStatus {
  id: string;
  installed: boolean;
  configured: boolean;
  enabled: boolean;
  version?: string;
  error?: string;
}

export interface SkillsStatusResponse {
  skills: Record<string, SkillStatus>;
  platform: 'windows' | 'macos' | 'linux';
}
```

### 3.2 스킬 목록 컴포넌트 (`src/components/settings/SkillsSettings.tsx`)

```tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  SkillDefinition, 
  SkillStatus, 
  SkillsStatusResponse 
} from '../../types/skills';

// 카테고리 정의
const CATEGORIES = {
  productivity: { name: '생산성', emoji: '📊' },
  media: { name: '미디어', emoji: '🎵' },
  messaging: { name: '메시징', emoji: '💬' },
  smarthome: { name: '스마트홈', emoji: '🏠' },
  dev: { name: '개발', emoji: '💻' },
  lifestyle: { name: '라이프스타일', emoji: '🌟' },
  builtin: { name: '내장', emoji: '⚙️' },
};

export default function SkillsSettings() {
  const [definitions, setDefinitions] = useState<SkillDefinition[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SkillStatus>>({});
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [filter, setFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 데이터 로드
  useEffect(() => {
    loadSkillsData();
  }, []);

  const loadSkillsData = async () => {
    try {
      setLoading(true);
      const [defs, statusRes] = await Promise.all([
        invoke<SkillDefinition[]>('get_skill_definitions'),
        invoke<SkillsStatusResponse>('get_skills_status'),
      ]);
      setDefinitions(defs);
      setStatuses(statusRes.skills);
      setPlatform(statusRes.platform);
    } catch (err) {
      console.error('스킬 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 스킬 목록
  const filteredSkills = definitions.filter(skill => {
    const status = statuses[skill.id];
    
    // 필터 적용
    if (filter === 'installed' && !status?.installed) return false;
    if (filter === 'available' && status?.installed) return false;
    
    // 카테고리 필터
    if (categoryFilter !== 'all' && skill.category !== categoryFilter) return false;
    
    return true;
  });

  // 카테고리별 그룹화
  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, SkillDefinition[]>);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">스킬 관리</h2>
      
      {/* 필터 */}
      <div className="flex gap-4 mb-6">
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value as any)}
          className="bg-surface-dark rounded px-3 py-2"
        >
          <option value="all">전체</option>
          <option value="installed">설치됨</option>
          <option value="available">미설치</option>
        </select>
        
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-surface-dark rounded px-3 py-2"
        >
          <option value="all">모든 카테고리</option>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 스킬 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSkills).map(([category, skills]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3">
                {CATEGORIES[category as keyof typeof CATEGORIES]?.emoji}{' '}
                {CATEGORIES[category as keyof typeof CATEGORIES]?.name || category}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    status={statuses[skill.id]}
                    onClick={() => setSelectedSkill(skill)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 스킬 상세 모달 */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          status={statuses[selectedSkill.id]}
          onClose={() => setSelectedSkill(null)}
          onRefresh={loadSkillsData}
        />
      )}
    </div>
  );
}

// 스킬 카드 컴포넌트
function SkillCard({ 
  skill, 
  status, 
  onClick 
}: { 
  skill: SkillDefinition; 
  status?: SkillStatus;
  onClick: () => void;
}) {
  const isInstalled = status?.installed ?? false;
  const isConfigured = status?.configured ?? false;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg cursor-pointer transition-all
        ${isInstalled ? 'bg-surface-dark border-l-4 border-primary' : 'bg-surface-darker'}
        hover:bg-surface-light
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{skill.emoji}</span>
        <div className="flex-1">
          <div className="font-medium">{skill.name}</div>
          <div className="text-sm text-gray-400">{skill.description}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isInstalled ? (
            <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400">
              설치됨
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-600/20 text-gray-400">
              미설치
            </span>
          )}
          {isInstalled && !isConfigured && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400">
              설정 필요
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3.3 스킬 상세 모달 (`src/components/settings/SkillDetailModal.tsx`)

```tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SkillDefinition, SkillStatus } from '../../types/skills';

interface Props {
  skill: SkillDefinition;
  status?: SkillStatus;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SkillDetailModal({ skill, status, onClose, onRefresh }: Props) {
  const [installing, setInstalling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isInstalled = status?.installed ?? false;
  const isConfigured = status?.configured ?? false;

  // 설치
  const handleInstall = async () => {
    try {
      setInstalling(true);
      setError(null);
      await invoke('install_skill', { skillId: skill.id });
      onRefresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setInstalling(false);
    }
  };

  // API 키 설정
  const handleSaveApiKey = async (envVar: string) => {
    try {
      setError(null);
      await invoke('configure_skill_api_key', {
        skillId: skill.id,
        envVar,
        value: apiKeyInput,
      });
      setApiKeyInput('');
      onRefresh();
    } catch (err) {
      setError(String(err));
    }
  };

  // 로그인 터미널 열기
  const handleOpenLogin = async (command: string) => {
    try {
      await invoke('open_skill_login_terminal', {
        skillId: skill.id,
        loginCommand: command,
      });
    } catch (err) {
      setError(String(err));
    }
  };

  // 연결 해제
  const handleDisconnect = async () => {
    if (!confirm(`${skill.name} 연결을 해제하시겠습니까?\n\n설정과 인증 정보가 삭제됩니다.`)) {
      return;
    }
    
    try {
      setDisconnecting(true);
      setError(null);
      const result = await invoke<string>('disconnect_skill', { skillId: skill.id });
      alert(result);
      onRefresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setDisconnecting(false);
    }
  };

  // 설정 UI 렌더링
  const renderSetupUI = () => {
    if (!isInstalled) return null;
    
    switch (skill.setup.type) {
      case 'api_key':
        return (
          <div className="space-y-3">
            <h4 className="font-medium">API 키 설정</h4>
            {skill.setup.vars.map(varName => (
              <div key={varName} className="flex gap-2">
                <input
                  type="password"
                  placeholder={varName}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="flex-1 bg-surface-darker rounded px-3 py-2"
                />
                <button
                  onClick={() => handleSaveApiKey(varName)}
                  className="px-4 py-2 bg-primary rounded hover:bg-primary-dark"
                >
                  저장
                </button>
              </div>
            ))}
          </div>
        );
      
      case 'login':
        return (
          <div className="space-y-3">
            <h4 className="font-medium">로그인 필요</h4>
            <p className="text-sm text-gray-400">
              터미널에서 로그인을 완료해주세요.
            </p>
            <button
              onClick={() => handleOpenLogin(skill.setup.command)}
              className="px-4 py-2 bg-primary rounded hover:bg-primary-dark"
            >
              로그인 터미널 열기
            </button>
          </div>
        );
      
      case 'mac_permission':
        return (
          <div className="space-y-3">
            <h4 className="font-medium">macOS 권한 필요</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              {skill.setup.permissions.automation.map(app => (
                <li key={app}>• 자동화: {app}</li>
              ))}
              {skill.setup.permissions.full_disk_access && (
                <li>• 전체 디스크 접근 권한</li>
              )}
              {skill.setup.permissions.screen_recording && (
                <li>• 화면 기록</li>
              )}
              {skill.setup.permissions.accessibility && (
                <li>• 손쉬운 사용</li>
              )}
              {skill.setup.permissions.reminders && (
                <li>• 미리 알림</li>
              )}
            </ul>
            <p className="text-xs text-gray-500">
              시스템 설정 → 개인정보 보호 및 보안에서 권한을 허용해주세요.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-dark rounded-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{skill.emoji}</span>
            <div>
              <h3 className="text-xl font-bold">{skill.name}</h3>
              <p className="text-gray-400">{skill.description}</p>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 상태 */}
          <div className="flex gap-3">
            <span className={`px-3 py-1 rounded text-sm ${
              isInstalled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
            }`}>
              {isInstalled ? '✓ 설치됨' : '미설치'}
            </span>
            {isInstalled && (
              <span className={`px-3 py-1 rounded text-sm ${
                isConfigured ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
              }`}>
                {isConfigured ? '✓ 설정 완료' : '설정 필요'}
              </span>
            )}
          </div>

          {/* 설치 정보 */}
          {!isInstalled && skill.install_command && (
            <div className="space-y-3">
              <h4 className="font-medium">설치 명령어</h4>
              <code className="block p-3 bg-surface-darker rounded text-sm">
                {skill.install_command}
              </code>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full px-4 py-2 bg-primary rounded hover:bg-primary-dark disabled:opacity-50"
              >
                {installing ? '설치 중...' : '설치'}
              </button>
            </div>
          )}

          {/* 설정 UI */}
          {renderSetupUI()}

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-600/20 text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* 연결 해제 */}
          {isInstalled && isConfigured && (
            <div className="pt-4 border-t border-gray-700">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full px-4 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
              >
                {disconnecting ? '연결 해제 중...' : '연결 해제'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                설정과 인증 정보가 삭제됩니다. 바이너리는 유지됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-surface-darker rounded hover:bg-surface-light"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. 구현 체크리스트

### 4.1 Rust Backend
- [ ] `src-tauri/src/skills.rs` 생성
- [ ] `src-tauri/src/skill_definitions.rs` 생성 (45개 스킬 데이터)
- [ ] `lib.rs`에 모듈 등록 및 invoke handler 추가
- [ ] `Cargo.toml`에 `lazy_static` 추가

### 4.2 React Frontend
- [ ] `src/types/skills.ts` 생성
- [ ] `src/components/settings/SkillsSettings.tsx` 업데이트
- [ ] `src/components/settings/SkillDetailModal.tsx` 생성
- [ ] Settings 사이드바에 스킬 탭 추가

### 4.3 테스트
- [ ] 스킬 목록 조회 테스트
- [ ] 스킬 설치 테스트 (각 방법별)
- [ ] API 키 설정 테스트
- [ ] 로그인 터미널 열기 테스트
- [ ] 연결 해제 테스트
- [ ] 플랫폼별 필터링 테스트

---

## 5. 참고 문서
- `SKILL_SETUP_REQUIREMENTS.md` — 45개 스킬 설정 상세
- `SKILL_SETUP_MACOS_ONLY.md` — macOS/brew 스킬 상세
- `SKILL_LIST_FILTERED.md` — 스킬 목록
