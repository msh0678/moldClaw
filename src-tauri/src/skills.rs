use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use crate::skill_definitions::SKILL_DEFINITIONS;

// ===== macOS PATH 해결 =====
// macOS GUI 앱에서 shell 명령 실행 시 brew, npm 등을 찾을 수 있도록 PATH 확장

#[cfg(target_os = "macos")]
fn get_macos_extended_path() -> String {
    use std::sync::OnceLock;
    static CACHED_PATH: OnceLock<String> = OnceLock::new();

    CACHED_PATH.get_or_init(|| {
        let home = std::env::var("HOME").unwrap_or_default();
        
        // 필수 경로 목록 (항상 포함)
        let essential_paths = vec![
            "/opt/homebrew/bin".to_string(),        // Apple Silicon brew
            "/opt/homebrew/sbin".to_string(),
            "/usr/local/bin".to_string(),           // Intel brew
            "/usr/local/sbin".to_string(),
            format!("{}/go/bin", home),             // Go binaries
            format!("{}/.cargo/bin", home),         // Rust/Cargo
            format!("{}/.local/bin", home),         // pipx, uv 등
            format!("{}/Library/npm/bin", home),    // npm global
            format!("{}/.npm-global/bin", home),
            "/usr/bin".to_string(),
            "/bin".to_string(),
            "/usr/sbin".to_string(),
            "/sbin".to_string(),
        ];
        
        // 1. 로그인 셸에서 PATH 가져오기 시도
        let mut shell_path = String::new();
        let shells = ["/bin/zsh", "/bin/bash", "/bin/sh"];
        for shell in &shells {
            if let Ok(output) = std::process::Command::new(shell)
                .args(["-l", "-c", "echo $PATH"])
                .output()
            {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() && path.contains('/') {
                        shell_path = path;
                        break;
                    }
                }
            }
        }
        
        // 2. 필수 경로 + 셸 PATH 병합 (필수 경로 우선)
        let mut all_paths: Vec<String> = essential_paths;
        for p in shell_path.split(':') {
            if !p.is_empty() {
                all_paths.push(p.to_string());
            }
        }
        
        // 현재 환경 PATH도 추가
        let current = std::env::var("PATH").unwrap_or_default();
        for p in current.split(':') {
            if !p.is_empty() {
                all_paths.push(p.to_string());
            }
        }
        
        // 중복 제거
        let mut seen = std::collections::HashSet::new();
        let deduped: Vec<String> = all_paths.into_iter().filter(|p| seen.insert(p.clone())).collect();
        deduped.join(":")
    }).clone()
}

/// macOS에서 확장 PATH로 명령 실행
#[cfg(target_os = "macos")]
fn macos_sh(script: &str) -> Command {
    let extended_path = get_macos_extended_path();
    let full_script = format!("export PATH=\"{}\"; {}", extended_path, script);
    let mut cmd = Command::new("/bin/sh");
    cmd.args(["-c", &full_script]);
    cmd
}

/// macOS에서 확장 PATH로 프로그램 직접 실행
#[cfg(target_os = "macos")]
fn macos_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.env("PATH", get_macos_extended_path());
    cmd
}

// ===== Linux PATH 해결 =====
// Linux GUI 앱 (Tauri, AppImage 등)에서도 shell profile PATH 상속 안 됨

#[cfg(target_os = "linux")]
fn get_linux_extended_path() -> String {
    use std::sync::OnceLock;
    static CACHED_PATH: OnceLock<String> = OnceLock::new();

    CACHED_PATH.get_or_init(|| {
        let home = std::env::var("HOME").unwrap_or_default();
        
        // 필수 경로 목록 (항상 포함)
        let essential_paths = vec![
            "/home/linuxbrew/.linuxbrew/bin".to_string(),   // 시스템 Linuxbrew
            "/home/linuxbrew/.linuxbrew/sbin".to_string(),
            format!("{}/.linuxbrew/bin", home),              // 사용자 Linuxbrew
            format!("{}/.linuxbrew/sbin", home),
            "/usr/local/bin".to_string(),
            "/usr/local/sbin".to_string(),
            format!("{}/go/bin", home),                      // Go binaries
            format!("{}/.cargo/bin", home),                  // Rust/Cargo
            format!("{}/.local/bin", home),                  // pipx, uv, pip --user
            format!("{}/.npm-global/bin", home),             // npm global
            "/snap/bin".to_string(),                         // Snap packages
            "/usr/bin".to_string(),
            "/bin".to_string(),
            "/usr/sbin".to_string(),
            "/sbin".to_string(),
        ];
        
        // 1. 로그인 셸에서 PATH 가져오기 시도
        let mut shell_path = String::new();
        let shells = ["/bin/bash", "/bin/zsh", "/bin/sh"];
        for shell in &shells {
            if let Ok(output) = std::process::Command::new(shell)
                .args(["-l", "-c", "echo $PATH"])
                .output()
            {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() && path.contains('/') {
                        shell_path = path;
                        break;
                    }
                }
            }
        }
        
        // 2. 필수 경로 + 셸 PATH 병합 (필수 경로 우선)
        let mut all_paths: Vec<String> = essential_paths;
        for p in shell_path.split(':') {
            if !p.is_empty() {
                all_paths.push(p.to_string());
            }
        }
        
        // 현재 환경 PATH도 추가
        let current = std::env::var("PATH").unwrap_or_default();
        for p in current.split(':') {
            if !p.is_empty() {
                all_paths.push(p.to_string());
            }
        }
        
        // 중복 제거
        let mut seen = std::collections::HashSet::new();
        let deduped: Vec<String> = all_paths.into_iter().filter(|p| seen.insert(p.clone())).collect();
        deduped.join(":")
    }).clone()
}

/// Linux에서 확장 PATH로 명령 실행
#[cfg(target_os = "linux")]
fn linux_sh(script: &str) -> Command {
    let extended_path = get_linux_extended_path();
    let full_script = format!("export PATH=\"{}\"; {}", extended_path, script);
    let mut cmd = Command::new("/bin/sh");
    cmd.args(["-c", &full_script]);
    cmd
}

/// Linux에서 확장 PATH로 프로그램 직접 실행
#[cfg(target_os = "linux")]
fn linux_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.env("PATH", get_linux_extended_path());
    cmd
}

// ===== Windows 콘솔 창 숨기기 =====
// Windows에서 Command 실행 시 cmd 창이 뜨지 않도록 CREATE_NO_WINDOW 플래그 사용

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Windows에서 콘솔 창 없이 명령 실행
#[cfg(windows)]
fn windows_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Windows에서 cmd /C로 명령 실행 (콘솔 창 숨김)
#[cfg(windows)]
fn windows_shell(script: &str) -> Command {
    let mut cmd = Command::new("cmd");
    cmd.args(["/C", script]);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// 스킬 설치 방법
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InstallMethod {
    Brew,
    Go,
    Npm,
    Uv,
    Winget,
    Builtin,
    Manual,
}

/// 플랫폼 지원
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformSupport {
    pub windows: bool,
    pub macos: bool,
    pub linux: bool,
}

/// macOS 권한 종류
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MacPermissions {
    pub automation: Vec<String>,
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
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SetupRequirement {
    None,
    ApiKey { vars: Vec<String> },
    Login { command: String },
    Config { path: String },
    MacPermission { permissions: MacPermissions },
    Hardware { description: String },
    Custom { description: String },
}

/// 스킬 정의
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub emoji: String,
    pub category: String,
    
    // 기본 설치 방법 (macOS/Linux)
    pub install_method: InstallMethod,
    pub install_command: Option<String>,
    
    // Windows 전용 설치 방법 (있으면 Windows에서 우선 사용)
    pub windows_install_method: Option<InstallMethod>,
    pub windows_install_command: Option<String>,
    
    pub binary_name: Option<String>,
    pub platform: PlatformSupport,
    pub setup: SetupRequirement,
    pub disconnect: DisconnectConfig,
    pub hidden: bool,
}

/// 스킬 상태
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStatus {
    pub id: String,
    pub installed: bool,
    pub configured: bool,
    pub enabled: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

/// Prerequisite (전제조건) 상태
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrerequisiteStatus {
    pub go_installed: bool,
    pub go_version: Option<String>,
    pub uv_installed: bool,
    pub uv_version: Option<String>,
    pub brew_installed: bool,
    pub brew_version: Option<String>,
    pub winget_installed: bool,
    pub npm_installed: bool,
    pub npm_version: Option<String>,
}

/// 전체 스킬 상태 응답
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsStatusResponse {
    pub skills: HashMap<String, SkillStatus>,
    pub prerequisites: PrerequisiteStatus,
    pub platform: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// 현재 플랫폼 감지
fn get_current_platform() -> &'static str {
    #[cfg(target_os = "windows")]
    return "windows";
    #[cfg(target_os = "macos")]
    return "macos";
    #[cfg(target_os = "linux")]
    return "linux";
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown";
}

/// 바이너리 존재 확인 (모든 플랫폼: 확장 경로 포함)
fn check_binary_exists(name: &str) -> bool {
    #[cfg(windows)]
    {
        // 1. where 명령으로 PATH에서 검색
        if windows_cmd("where").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false) {
            return true;
        }
        
        // 2. 일반 설치 경로들 직접 확인
        if let Some(home) = dirs::home_dir() {
            let common_paths = [
                // uv tool install 경로
                home.join(".local").join("bin").join(format!("{}.exe", name)),
                home.join(".local").join("bin").join(name),
                // go install 경로
                home.join("go").join("bin").join(format!("{}.exe", name)),
                home.join("go").join("bin").join(name),
                // cargo install 경로
                home.join(".cargo").join("bin").join(format!("{}.exe", name)),
                home.join(".cargo").join("bin").join(name),
            ];
            
            for path in &common_paths {
                if path.exists() {
                    return true;
                }
            }
        }
        
        // 3. npm 글로벌 경로 (%APPDATA%\npm)
        if let Ok(appdata) = std::env::var("APPDATA") {
            let npm_paths = [
                std::path::PathBuf::from(&appdata).join("npm").join(format!("{}.cmd", name)),
                std::path::PathBuf::from(&appdata).join("npm").join(format!("{}.exe", name)),
            ];
            for path in &npm_paths {
                if path.exists() {
                    return true;
                }
            }
        }
        
        false
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS GUI 앱에서는 확장 PATH로 which 실행
        macos_cmd("which").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux GUI 앱에서도 확장 PATH로 which 실행
        linux_cmd("which").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
}

/// 바이너리 버전 확인 (macOS/Linux: 확장 PATH 사용)
fn get_binary_version(name: &str, version_arg: &str) -> Option<String> {
    #[cfg(target_os = "macos")]
    let output = macos_cmd(name).arg(version_arg).output().ok()?;
    
    #[cfg(target_os = "linux")]
    let output = linux_cmd(name).arg(version_arg).output().ok()?;
    
    #[cfg(windows)]
    let output = windows_cmd(name).arg(version_arg).output().ok()?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);
        // 첫 번째 줄에서 버전 추출
        combined.lines().next().map(|s| s.trim().to_string())
    } else {
        None
    }
}

/// Homebrew 설치 확인 (macOS/Linux 특수 경로 포함)
fn check_brew_installed() -> bool {
    // 1. which brew 시도
    if check_binary_exists("brew") {
        return true;
    }
    
    // 2. macOS Homebrew 경로 직접 확인
    #[cfg(target_os = "macos")]
    {
        // Apple Silicon
        if std::path::Path::new("/opt/homebrew/bin/brew").exists() {
            return true;
        }
        // Intel Mac
        if std::path::Path::new("/usr/local/bin/brew").exists() {
            return true;
        }
    }
    
    // 3. Linux Linuxbrew 경로 직접 확인
    #[cfg(target_os = "linux")]
    {
        // 시스템 Linuxbrew
        if std::path::Path::new("/home/linuxbrew/.linuxbrew/bin/brew").exists() {
            return true;
        }
        // 사용자 홈 디렉토리 Linuxbrew
        if let Some(home) = dirs::home_dir() {
            if home.join(".linuxbrew/bin/brew").exists() {
                return true;
            }
        }
    }
    
    false
}

/// Homebrew 버전 확인 (특수 경로 포함)
fn get_brew_version() -> Option<String> {
    // Windows에서는 brew 없음
    #[cfg(windows)]
    return None;
    
    #[cfg(not(windows))]
    {
        // 다양한 brew 경로 시도
        let brew_paths = [
            "brew".to_string(),
            "/opt/homebrew/bin/brew".to_string(),
            "/usr/local/bin/brew".to_string(),
            "/home/linuxbrew/.linuxbrew/bin/brew".to_string(),
        ];
        
        for brew_path in &brew_paths {
            #[cfg(target_os = "macos")]
            let output = macos_cmd(&brew_path).arg("--version").output();
            #[cfg(target_os = "linux")]
            let output = linux_cmd(&brew_path).arg("--version").output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    return stdout.lines().next().map(|s| s.trim().to_string());
                }
            }
        }
        
        // 사용자 홈 Linuxbrew
        if let Some(home) = dirs::home_dir() {
            let user_brew = home.join(".linuxbrew/bin/brew");
            let user_brew_str = user_brew.to_string_lossy().to_string();
            
            #[cfg(target_os = "macos")]
            let output = macos_cmd(&user_brew_str).arg("--version").output();
            #[cfg(target_os = "linux")]
            let output = linux_cmd(&user_brew_str).arg("--version").output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    return stdout.lines().next().map(|s| s.trim().to_string());
                }
            }
        }
        
        None
    }
}

/// Prerequisite 상태 확인
fn check_prerequisites() -> PrerequisiteStatus {
    PrerequisiteStatus {
        go_installed: check_binary_exists("go"),
        go_version: get_binary_version("go", "version"),
        uv_installed: check_binary_exists("uv"),
        uv_version: get_binary_version("uv", "--version"),
        brew_installed: check_brew_installed(),
        brew_version: get_brew_version(),
        winget_installed: check_binary_exists("winget"),
        npm_installed: check_binary_exists("npm"),
        npm_version: get_binary_version("npm", "--version"),
    }
}

/// 환경변수/API키 설정 확인
/// OpenClaw는 여러 경로에 API 키를 저장할 수 있음:
/// 1. skills.entries.{skill_id}.apiKey (스킬별 API 키)
/// 2. skills.entries.{skill_id}.env.{var_name} (스킬별 환경변수)
/// 3. 실제 환경 변수
fn check_env_var_configured(config: &serde_json::Value, skill_id: &str, var_name: &str) -> bool {
    // 1. skills.entries.{skill_id}.apiKey 확인
    let has_skill_api_key = config
        .get("skills")
        .and_then(|s| s.get("entries"))
        .and_then(|e| e.get(skill_id))
        .and_then(|s| s.get("apiKey"))
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    
    if has_skill_api_key {
        return true;
    }
    
    // 2. skills.entries.{skill_id}.env.{var_name} 확인
    let has_skill_env = config
        .get("skills")
        .and_then(|s| s.get("entries"))
        .and_then(|e| e.get(skill_id))
        .and_then(|s| s.get("env"))
        .and_then(|e| e.get(var_name))
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    
    if has_skill_env {
        return true;
    }
    
    // 3. 실제 환경 변수 확인
    std::env::var(var_name).map(|s| !s.is_empty()).unwrap_or(false)
}

/// Config 파일/폴더 존재 확인
fn check_config_exists(path: &str) -> bool {
    let expanded = shellexpand::tilde(path);
    std::path::Path::new(expanded.as_ref()).exists()
}

/// OpenClaw 설정 파일 읽기
fn read_openclaw_config() -> Result<serde_json::Value, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".openclaw").join("openclaw.json");
    
    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("설정 파일 파싱 실패: {}", e))
}

/// 현재 플랫폼에서 지원되는 스킬 목록
fn get_supported_skills() -> Vec<&'static SkillDefinition> {
    let platform = get_current_platform();
    
    SKILL_DEFINITIONS
        .iter()
        .filter(|s| !s.hidden)
        .filter(|s| match platform {
            "windows" => s.platform.windows,
            "macos" => s.platform.macos,
            "linux" => s.platform.linux,
            _ => false,
        })
        .collect()
}

/// 스킬의 실제 설치 방법 (플랫폼별)
fn get_effective_install_method(skill: &SkillDefinition) -> InstallMethod {
    #[cfg(windows)]
    {
        skill.windows_install_method.clone().unwrap_or(skill.install_method.clone())
    }
    #[cfg(not(windows))]
    {
        skill.install_method.clone()
    }
}

/// 스킬의 실제 설치 명령어 (플랫폼별)
fn get_effective_install_command(skill: &SkillDefinition) -> Option<&String> {
    #[cfg(windows)]
    {
        skill.windows_install_command.as_ref().or(skill.install_command.as_ref())
    }
    #[cfg(not(windows))]
    {
        skill.install_command.as_ref()
    }
}

/// 단일 스킬 상태 확인
fn get_skill_status(skill: &SkillDefinition, config: &serde_json::Value, prereqs: &PrerequisiteStatus) -> SkillStatus {
    // 1. 바이너리 설치 확인
    let installed = if let Some(ref binary) = skill.binary_name {
        check_binary_exists(binary)
    } else {
        let method = get_effective_install_method(skill);
        matches!(method, InstallMethod::Builtin)
    };

    // 2. 설정 완료 확인
    let configured = match &skill.setup {
        SetupRequirement::None => true,
        SetupRequirement::ApiKey { vars } => {
            vars.iter().all(|v| check_env_var_configured(config, &skill.id, v))
        }
        SetupRequirement::Login { .. } => {
            skill
                .disconnect
                .config_paths
                .iter()
                .any(|p| check_config_exists(p))
        }
        SetupRequirement::Config { path } => check_config_exists(path),
        SetupRequirement::MacPermission { .. } => true, // 런타임에만 확인 가능
        SetupRequirement::Hardware { .. } => true,
        SetupRequirement::Custom { .. } => true,
    };

    // 3. enabled 상태 확인
    let enabled = config
        .get("skills")
        .and_then(|s| s.get("entries"))
        .and_then(|e| e.get(&skill.id))
        .and_then(|s| s.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(true);

    // 4. 에러 확인 (prerequisite 미설치)
    let method = get_effective_install_method(skill);
    let error = match method {
        InstallMethod::Go if !prereqs.go_installed => Some("Go가 설치되어 있지 않습니다".into()),
        InstallMethod::Uv if !prereqs.uv_installed => Some("uv가 설치되어 있지 않습니다".into()),
        InstallMethod::Brew if !prereqs.brew_installed => Some("Homebrew가 설치되어 있지 않습니다".into()),
        InstallMethod::Winget if !prereqs.winget_installed => Some("winget을 사용할 수 없습니다".into()),
        InstallMethod::Npm if !prereqs.npm_installed => Some("npm이 설치되어 있지 않습니다".into()),
        _ => None,
    };

    SkillStatus {
        id: skill.id.clone(),
        installed,
        configured,
        enabled,
        version: None,
        error,
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Prerequisite 상태 조회
#[tauri::command]
pub fn get_prerequisites() -> PrerequisiteStatus {
    check_prerequisites()
}

/// 모든 스킬 상태 조회
#[tauri::command]
pub fn get_skills_status() -> Result<SkillsStatusResponse, String> {
    let config = read_openclaw_config()?;
    let prereqs = check_prerequisites();

    let mut status_map = HashMap::new();
    for skill in SKILL_DEFINITIONS.iter() {
        if skill.hidden {
            continue;
        }
        let status = get_skill_status(skill, &config, &prereqs);
        status_map.insert(skill.id.clone(), status);
    }

    Ok(SkillsStatusResponse {
        skills: status_map,
        prerequisites: prereqs,
        platform: get_current_platform().to_string(),
    })
}

/// 스킬 정의 목록 조회
#[tauri::command]
pub fn get_skill_definitions() -> Vec<SkillDefinition> {
    get_supported_skills().into_iter().cloned().collect()
}

/// Prerequisite 설치 (go, uv, homebrew)
#[tauri::command]
pub async fn install_prerequisite(name: String) -> Result<String, String> {
    match name.as_str() {
        "go" => install_go().await,
        "uv" => install_uv().await,
        "homebrew" => install_homebrew().await,
        _ => Err(format!("알 수 없는 prerequisite: {}", name)),
    }
}

async fn install_go() -> Result<String, String> {
    #[cfg(windows)]
    {
        // Windows: cmd 창 열어서 winget 실행 (사용자가 진행 상황 볼 수 있음)
        let install_cmd = "winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements && echo. && echo Go 설치 완료! 앱을 재시작해주세요. && pause";
        
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", install_cmd])
            .spawn()
            .map_err(|e| format!("cmd 실행 실패: {}", e))?;
        
        Ok("터미널에서 Go 설치가 시작됩니다.\n설치 완료 후 앱을 재시작해주세요.".into())
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: Terminal.app 열어서 brew 실행
        let install_cmd = "brew install go && echo '✅ Go 설치 완료! 이 창을 닫아도 됩니다.'";
        
        let apple_script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            install_cmd.replace('"', r#"\""#)
        );
        
        Command::new("osascript")
            .args(["-e", &apple_script])
            .spawn()
            .map_err(|e| format!("Terminal 실행 실패: {}", e))?;
        
        Ok("터미널에서 Go 설치가 시작됩니다.\n설치 완료 후 앱을 재시작해주세요.".into())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 터미널을 열어서 사용자가 직접 설치 (sudo 비밀번호 필요)
        // 패키지 매니저 감지 후 적절한 명령 생성
        
        let install_cmd = if Command::new("which").arg("apt").output().map(|o| o.status.success()).unwrap_or(false) {
            "sudo apt update && sudo apt install -y golang-go && echo '✅ Go 설치 완료! 이 창을 닫아도 됩니다.' && read -p '아무 키나 누르세요...'"
        } else if Command::new("which").arg("dnf").output().map(|o| o.status.success()).unwrap_or(false) {
            "sudo dnf install -y golang && echo '✅ Go 설치 완료! 이 창을 닫아도 됩니다.' && read -p '아무 키나 누르세요...'"
        } else if Command::new("which").arg("pacman").output().map(|o| o.status.success()).unwrap_or(false) {
            "sudo pacman -S --noconfirm go && echo '✅ Go 설치 완료! 이 창을 닫아도 됩니다.' && read -p '아무 키나 누르세요...'"
        } else if Command::new("which").arg("brew").output().map(|o| o.status.success()).unwrap_or(false) {
            "brew install go && echo '✅ Go 설치 완료! 이 창을 닫아도 됩니다.' && read -p '아무 키나 누르세요...'"
        } else {
            return Err("지원되는 패키지 매니저를 찾을 수 없습니다 (apt, dnf, pacman, brew)".into());
        };
        
        // 터미널 열어서 실행
        let xfce_cmd = format!("bash -c '{}'", install_cmd);
        let terminals: [(&str, Vec<&str>); 4] = [
            ("gnome-terminal", vec!["--", "bash", "-c", install_cmd]),
            ("konsole", vec!["-e", "bash", "-c", install_cmd]),
            ("xfce4-terminal", vec!["-e", &xfce_cmd]),
            ("xterm", vec!["-e", "bash", "-c", install_cmd]),
        ];
        
        for (term, args) in terminals {
            if Command::new("which")
                .arg(term)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                match Command::new(term).args(&args).spawn() {
                    Ok(_) => return Ok("터미널에서 Go 설치가 시작됩니다.\n비밀번호를 입력해주세요.\n설치 완료 후 앱을 재시작해주세요.".into()),
                    Err(_) => continue,
                }
            }
        }
        
        Err("지원되는 터미널을 찾을 수 없습니다 (gnome-terminal, konsole, xfce4-terminal, xterm)".into())
    }
}

async fn install_uv() -> Result<String, String> {
    #[cfg(windows)]
    {
        // Windows: PowerShell 창 열어서 uv 설치
        let install_cmd = "irm https://astral.sh/uv/install.ps1 | iex; Write-Host ''; Write-Host 'uv 설치 완료! 앱을 재시작해주세요.' -ForegroundColor Green; Read-Host '아무 키나 누르세요'";
        
        Command::new("powershell")
            .args(["-Command", &format!("Start-Process powershell -ArgumentList '-NoExit', '-Command', '{}'", install_cmd)])
            .spawn()
            .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
        
        Ok("터미널에서 uv 설치가 시작됩니다.\n설치 완료 후 앱을 재시작해주세요.".into())
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: Terminal.app 열어서 uv 설치
        let install_cmd = "curl -LsSf https://astral.sh/uv/install.sh | sh && echo '✅ uv 설치 완료! 이 창을 닫아도 됩니다.'";
        
        let apple_script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            install_cmd.replace('"', r#"\""#)
        );
        
        Command::new("osascript")
            .args(["-e", &apple_script])
            .spawn()
            .map_err(|e| format!("Terminal 실행 실패: {}", e))?;
        
        Ok("터미널에서 uv 설치가 시작됩니다.\n설치 완료 후 앱을 재시작해주세요.".into())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 터미널 열어서 uv 설치
        let install_cmd = "curl -LsSf https://astral.sh/uv/install.sh | sh && echo '✅ uv 설치 완료! 이 창을 닫아도 됩니다.' && read -p '아무 키나 누르세요...'";
        
        let xfce_cmd = format!("bash -c '{}'", install_cmd);
        let terminals: [(&str, Vec<&str>); 4] = [
            ("gnome-terminal", vec!["--", "bash", "-c", install_cmd]),
            ("konsole", vec!["-e", "bash", "-c", install_cmd]),
            ("xfce4-terminal", vec!["-e", &xfce_cmd]),
            ("xterm", vec!["-e", "bash", "-c", install_cmd]),
        ];
        
        for (term, args) in terminals {
            if Command::new("which")
                .arg(term)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                match Command::new(term).args(&args).spawn() {
                    Ok(_) => return Ok("터미널에서 uv 설치가 시작됩니다.\n설치 완료 후 앱을 재시작해주세요.".into()),
                    Err(_) => continue,
                }
            }
        }
        
        Err("지원되는 터미널을 찾을 수 없습니다 (gnome-terminal, konsole, xfce4-terminal, xterm)".into())
    }
}

/// Homebrew 설치 (macOS/Linux)
/// 주의: sudo 권한이 필요하므로 터미널에서 직접 실행해야 함
async fn install_homebrew() -> Result<String, String> {
    #[cfg(windows)]
    {
        Err("Windows에서는 Homebrew를 지원하지 않습니다. winget을 사용합니다.".into())
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: Terminal.app을 열어서 설치 스크립트 실행
        // sudo 비밀번호 입력이 필요하므로 터미널에서 직접 실행
        let install_script = r#"/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)""#;
        
        let apple_script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            install_script.replace('"', r#"\""#)
        );
        
        Command::new("osascript")
            .args(["-e", &apple_script])
            .spawn()
            .map_err(|e| format!("Terminal 실행 실패: {}", e))?;
        
        Ok("Terminal에서 Homebrew 설치가 시작됩니다. 비밀번호를 입력해주세요.\n설치 완료 후 앱을 재시작해주세요.".into())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 기본 터미널에서 설치 스크립트 실행
        // Linuxbrew는 홈 디렉토리에 설치되어 sudo 불필요할 수 있음
        let install_cmd = r#"/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)""#;
        
        // 다양한 터미널 시도 (gnome-terminal, konsole, xterm 등)
        let xfce_cmd = format!("bash -c '{}'", install_cmd);
        let terminals: [(&str, Vec<&str>); 4] = [
            ("gnome-terminal", vec!["--", "bash", "-c", install_cmd]),
            ("konsole", vec!["-e", "bash", "-c", install_cmd]),
            ("xfce4-terminal", vec!["-e", &xfce_cmd]),
            ("xterm", vec!["-e", "bash", "-c", install_cmd]),
        ];
        
        for (term, args) in terminals {
            if Command::new("which")
                .arg(term)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                match Command::new(term).args(&args).spawn() {
                    Ok(_) => return Ok(format!(
                        "{}에서 Homebrew(Linuxbrew) 설치가 시작됩니다.\n\
                        설치 완료 후 터미널에 표시되는 안내에 따라 PATH를 설정하고,\n\
                        앱을 재시작해주세요.", term
                    )),
                    Err(_) => continue,
                }
            }
        }
        
        Err("터미널을 찾을 수 없습니다. 수동으로 Homebrew를 설치해주세요:\n\
            /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"".into())
    }
}

/// 스킬 설치
#[tauri::command]
pub async fn install_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;

    let install_method = get_effective_install_method(skill);
    let install_cmd = get_effective_install_command(skill)
        .ok_or_else(|| "설치 명령어가 없습니다".to_string())?;

    match install_method {
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

    #[cfg(target_os = "macos")]
    {
        // macOS: 확장 PATH로 brew 명령 실행
        let output = macos_sh(cmd)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok("설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 확장 PATH로 brew 명령 실행
        let output = linux_sh(cmd)
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
    if !check_binary_exists("go") {
        return Err("Go가 설치되어 있지 않습니다. 먼저 Go를 설치해주세요.".into());
    }

    #[cfg(windows)]
    {
        // Windows: 숨김 창에서 실행 + 완료 대기 (go install은 프롬프트 없음)
        let output = windows_shell(cmd)
            .output()
            .map_err(|e| format!("설치 실행 실패: {}", e))?;
        
        if output.status.success() {
            return Ok("설치 완료".into());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!("설치 실패: {}{}", stderr, stdout));
        }
    }

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    let output = linux_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
    if output.status.success() {
        Ok("설치 완료".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

async fn install_with_npm(cmd: &str) -> Result<String, String> {
    if !check_binary_exists("npm") {
        return Err("npm이 설치되어 있지 않습니다.".into());
    }

    #[cfg(windows)]
    {
        // Windows: 숨김 창에서 실행 + 완료 대기 (npm install -g는 프롬프트 없음)
        let output = windows_shell(cmd)
            .output()
            .map_err(|e| format!("설치 실행 실패: {}", e))?;
        
        if output.status.success() {
            return Ok("설치 완료".into());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!("설치 실패: {}{}", stderr, stdout));
        }
    }

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    let output = linux_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
    if output.status.success() {
        Ok("설치 완료".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

async fn install_with_uv(cmd: &str) -> Result<String, String> {
    if !check_binary_exists("uv") {
        return Err("uv가 설치되어 있지 않습니다. 먼저 uv를 설치해주세요.".into());
    }

    #[cfg(windows)]
    {
        // Windows: 숨김 창에서 실행 + 완료 대기 (uv tool install은 프롬프트 없음)
        let output = windows_shell(cmd)
            .output()
            .map_err(|e| format!("설치 실행 실패: {}", e))?;
        
        if output.status.success() {
            return Ok("설치 완료".into());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!("설치 실패: {}{}", stderr, stdout));
        }
    }

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    let output = linux_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
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
        // winget 명령에 자동 확인 플래그 추가 (없으면)
        let full_cmd = if cmd.contains("--accept") {
            cmd.to_string()
        } else {
            format!("{} --accept-source-agreements --accept-package-agreements", cmd)
        };
        
        // Windows: 숨김 창에서 실행 + 완료 대기
        let output = windows_shell(&full_cmd)
            .output()
            .map_err(|e| format!("설치 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("설치 완료".into())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            Err(format!("설치 실패: {}{}", stderr, stdout))
        }
    }
}

/// 스킬 API 키 설정
#[tauri::command]
pub async fn configure_skill_api_key(skill_id: String, api_keys: HashMap<String, String>) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".openclaw").join("openclaw.json");
    
    // 기존 설정 읽기
    let mut config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("설정 파일 파싱 실패: {}", e))?
    } else {
        serde_json::json!({})
    };
    
    // env.vars에 API 키 추가
    let env = config.as_object_mut()
        .ok_or("설정이 객체가 아닙니다")?
        .entry("env")
        .or_insert(serde_json::json!({}));
    
    let vars = env.as_object_mut()
        .ok_or("env가 객체가 아닙니다")?
        .entry("vars")
        .or_insert(serde_json::json!({}));
    
    for (key, value) in api_keys {
        vars.as_object_mut()
            .ok_or("vars가 객체가 아닙니다")?
            .insert(key, serde_json::Value::String(value));
    }
    
    // 설정 파일 저장
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("설정 직렬화 실패: {}", e))?;
    
    std::fs::write(&config_path, content)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
    
    // TOOLS.md 업데이트 (실패해도 무시)
    crate::openclaw::update_tools_md().ok();
    
    Ok(format!("{} API 키 설정 완료", skill_id))
}

/// 스킬 로그인 터미널 열기
#[tauri::command]
pub async fn open_skill_login_terminal(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;

    let command = match &skill.setup {
        SetupRequirement::Login { command } => command.clone(),
        _ => return Err("로그인이 필요한 스킬이 아닙니다".into()),
    };

    #[cfg(target_os = "macos")]
    {
        // 확장 PATH 포함하여 명령 실행 (homebrew 경로 보장)
        let extended_path = get_macos_extended_path();
        let full_command = format!("export PATH='{}'; {}", extended_path, command);
        
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            full_command.replace("\"", "\\\"").replace("'", "'\\''")
        );
        
        Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| format!("터미널 실행 실패: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &command])
            .spawn()
            .map_err(|e| format!("터미널 실행 실패: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // 확장 PATH 가져오기 (linuxbrew 등 포함)
        let extended_path = get_linux_extended_path();
        // PATH 설정 후 명령 실행
        let full_command = format!("export PATH='{}'; {}; exec bash", extended_path, command);
        
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm", "x-terminal-emulator"];
        let mut success = false;
        
        for term in &terminals {
            let result = match *term {
                "gnome-terminal" => Command::new(term).args(["--", "bash", "-c", &full_command]).spawn(),
                "konsole" => Command::new(term).args(["-e", "bash", "-c", &full_command]).spawn(),
                "xfce4-terminal" => Command::new(term).args(["-e", &format!("bash -c '{}'", full_command)]).spawn(),
                _ => Command::new(term).args(["-e", &format!("bash -c '{}'", full_command)]).spawn(),
            };
            
            if result.is_ok() {
                success = true;
                break;
            }
        }
        
        if !success {
            return Err("터미널 에뮬레이터를 찾을 수 없습니다".into());
        }
    }

    Ok(format!("터미널에서 {} 로그인을 진행해주세요", skill_id))
}

/// 스킬 연결 해제
#[tauri::command]
pub async fn disconnect_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;

    let mut results = Vec::new();

    // 1. 로그아웃 명령어 실행
    if let Some(ref logout_cmd) = skill.disconnect.logout_command {
        #[cfg(windows)]
        let output = windows_shell(logout_cmd).output();
        
        #[cfg(target_os = "macos")]
        let output = macos_sh(logout_cmd).output();
        
        #[cfg(target_os = "linux")]
        let output = linux_sh(logout_cmd).output();
        
        match output {
            Ok(o) if o.status.success() => results.push("로그아웃 완료".to_string()),
            Ok(o) => results.push(format!("로그아웃 실패: {}", String::from_utf8_lossy(&o.stderr))),
            Err(e) => results.push(format!("로그아웃 명령 실행 실패: {}", e)),
        }
    }

    // 2. Config 폴더/파일 삭제
    for path in &skill.disconnect.config_paths {
        let expanded = shellexpand::tilde(path);
        let path_buf = PathBuf::from(expanded.as_ref());
        
        if path_buf.exists() {
            let result = if path_buf.is_dir() {
                std::fs::remove_dir_all(&path_buf)
            } else {
                std::fs::remove_file(&path_buf)
            };
            
            match result {
                Ok(_) => results.push(format!("{} 삭제됨", path)),
                Err(e) => results.push(format!("{} 삭제 실패: {}", path, e)),
            }
        }
    }

    // 3. 환경변수 제거 (openclaw.json에서)
    if !skill.disconnect.env_vars.is_empty() {
        let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
        let config_path = home.join(".openclaw").join("openclaw.json");
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
            
            let mut config: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("설정 파일 파싱 실패: {}", e))?;
            
            if let Some(env) = config.get_mut("env") {
                if let Some(vars) = env.get_mut("vars") {
                    if let Some(vars_obj) = vars.as_object_mut() {
                        for var in &skill.disconnect.env_vars {
                            if vars_obj.remove(var).is_some() {
                                results.push(format!("{} 환경변수 제거됨", var));
                            }
                        }
                    }
                }
            }
            
            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("설정 직렬화 실패: {}", e))?;
            
            std::fs::write(&config_path, content)
                .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
            
            // TOOLS.md 업데이트 (실패해도 무시)
            crate::openclaw::update_tools_md().ok();
        }
    }

    // 4. macOS 권한 안내 (자동 취소 불가)
    if let Some(ref _perms) = skill.disconnect.mac_permissions {
        #[cfg(target_os = "macos")]
        results.push("macOS 시스템 설정에서 권한을 수동으로 취소해주세요".to_string());
    }

    if results.is_empty() {
        Ok("연결 해제 완료 (삭제할 항목 없음)".into())
    } else {
        Ok(results.join("\n"))
    }
}

/// 스킬 비활성화
#[tauri::command]
pub async fn disable_skill(skill_id: String) -> Result<String, String> {
    update_skill_enabled(&skill_id, false)
}

/// 스킬 활성화
#[tauri::command]
pub async fn enable_skill(skill_id: String) -> Result<String, String> {
    update_skill_enabled(&skill_id, true)
}

fn update_skill_enabled(skill_id: &str, enabled: bool) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".openclaw").join("openclaw.json");
    
    let mut config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("설정 파일 파싱 실패: {}", e))?
    } else {
        serde_json::json!({})
    };
    
    // skills.entries.{skill_id}.enabled 설정
    let skills = config.as_object_mut()
        .ok_or("설정이 객체가 아닙니다")?
        .entry("skills")
        .or_insert(serde_json::json!({}));
    
    let entries = skills.as_object_mut()
        .ok_or("skills가 객체가 아닙니다")?
        .entry("entries")
        .or_insert(serde_json::json!({}));
    
    let skill_entry = entries.as_object_mut()
        .ok_or("entries가 객체가 아닙니다")?
        .entry(skill_id)
        .or_insert(serde_json::json!({}));
    
    skill_entry.as_object_mut()
        .ok_or("skill entry가 객체가 아닙니다")?
        .insert("enabled".to_string(), serde_json::Value::Bool(enabled));
    
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("설정 직렬화 실패: {}", e))?;
    
    std::fs::write(&config_path, content)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
    
    Ok(format!("{} {}", skill_id, if enabled { "활성화됨" } else { "비활성화됨" }))
}

// ============================================================================
// 스킬 마법사 지원 함수들
// ============================================================================

/// 스킬 설정 파일 존재 여부 확인 (폴링용)
#[tauri::command]
pub fn poll_skill_config(skill_id: String) -> Result<bool, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;
    
    // config_paths에서 파일/폴더 존재 여부 확인
    for path in &skill.disconnect.config_paths {
        let expanded = shellexpand::tilde(path);
        let path_buf = PathBuf::from(expanded.as_ref());
        if path_buf.exists() {
            return Ok(true);
        }
    }
    
    Ok(false)
}

/// Bear Notes 토큰 저장
#[tauri::command]
pub fn save_bear_token(token: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_dir = home.join(".config").join("grizzly");
    let token_path = config_dir.join("token");
    
    // 디렉토리 생성
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    
    // 토큰 저장
    std::fs::write(&token_path, token.trim())
        .map_err(|e| format!("토큰 저장 실패: {}", e))?;
    
    Ok("Bear 토큰이 저장되었습니다".into())
}

/// Camsnap 카메라 설정
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct CamsnapCamera {
    pub name: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

/// Camsnap 카메라 목록 조회
#[tauri::command]
pub fn get_camsnap_cameras() -> Result<Vec<CamsnapCamera>, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".config").join("camsnap").join("config.yaml");
    
    if !config_path.exists() {
        return Ok(vec![]);
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
    
    // YAML 파싱
    let config: serde_yaml::Value = serde_yaml::from_str(&content)
        .map_err(|e| format!("YAML 파싱 실패: {}", e))?;
    
    let cameras = config.get("cameras")
        .and_then(|c| c.as_sequence())
        .map(|seq| {
            seq.iter().filter_map(|cam| {
                Some(CamsnapCamera {
                    name: cam.get("name")?.as_str()?.to_string(),
                    url: cam.get("url")?.as_str()?.to_string(),
                    username: cam.get("username").and_then(|u| u.as_str()).map(String::from),
                    password: cam.get("password").and_then(|p| p.as_str()).map(String::from),
                })
            }).collect()
        })
        .unwrap_or_default();
    
    Ok(cameras)
}

/// Camsnap 카메라 추가
#[tauri::command]
pub fn save_camsnap_camera(camera: CamsnapCamera) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_dir = home.join(".config").join("camsnap");
    let config_path = config_dir.join("config.yaml");
    
    // 디렉토리 생성
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    
    // 기존 카메라 목록 로드
    let mut cameras = get_camsnap_cameras().unwrap_or_default();
    
    // 같은 이름의 카메라가 있으면 업데이트, 없으면 추가
    if let Some(existing) = cameras.iter_mut().find(|c| c.name == camera.name) {
        *existing = camera.clone();
    } else {
        cameras.push(camera.clone());
    }
    
    // YAML로 저장
    let config = serde_yaml::to_string(&serde_json::json!({ "cameras": cameras }))
        .map_err(|e| format!("YAML 직렬화 실패: {}", e))?;
    
    std::fs::write(&config_path, config)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
    
    Ok(format!("카메라 '{}' 저장됨", camera.name))
}

/// Camsnap 카메라 삭제
#[tauri::command]
pub fn delete_camsnap_camera(name: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".config").join("camsnap").join("config.yaml");
    
    let mut cameras = get_camsnap_cameras().unwrap_or_default();
    let original_len = cameras.len();
    cameras.retain(|c| c.name != name);
    
    if cameras.len() == original_len {
        return Err(format!("카메라 '{}' 를 찾을 수 없습니다", name));
    }
    
    // YAML로 저장
    let config = serde_yaml::to_string(&serde_json::json!({ "cameras": cameras }))
        .map_err(|e| format!("YAML 직렬화 실패: {}", e))?;
    
    std::fs::write(&config_path, config)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
    
    Ok(format!("카메라 '{}' 삭제됨", name))
}

/// Obsidian Vault 경로 저장
#[tauri::command]
pub fn save_obsidian_vault(vault_path: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_dir = home.join(".config").join("obsidian-cli");
    let config_path = config_dir.join("config.yaml");
    
    // 경로 검증
    let vault = PathBuf::from(&vault_path);
    if !vault.exists() || !vault.is_dir() {
        return Err("유효하지 않은 Vault 경로입니다".into());
    }
    
    // 디렉토리 생성
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    
    // YAML로 저장
    let config = format!("default_vault: {}\n", vault_path);
    std::fs::write(&config_path, config)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;
    
    Ok(format!("Obsidian Vault 설정 완료: {}", vault_path))
}

/// Obsidian Vault 경로 조회
#[tauri::command]
pub fn get_obsidian_vault() -> Result<Option<String>, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let config_path = home.join(".config").join("obsidian-cli").join("config.yaml");
    
    if !config_path.exists() {
        return Ok(None);
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
    
    let config: serde_yaml::Value = serde_yaml::from_str(&content)
        .map_err(|e| format!("YAML 파싱 실패: {}", e))?;
    
    let vault = config.get("default_vault")
        .and_then(|v| v.as_str())
        .map(String::from);
    
    Ok(vault)
}

// (open_skill_login_terminal은 위에 이미 정의됨)
