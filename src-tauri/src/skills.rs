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
        // 1. 로그인 셸에서 PATH 가져오기 시도
        let shells = ["/bin/zsh", "/bin/bash", "/bin/sh"];
        for shell in &shells {
            if let Ok(output) = std::process::Command::new(shell)
                .args(["-l", "-c", "echo $PATH"])
                .output()
            {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() && path.contains('/') {
                        return path;
                    }
                }
            }
        }

        // 2. Fallback: 알려진 경로 목록 조합
        let home = std::env::var("HOME").unwrap_or_default();
        let known_paths = vec![
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

        let current = std::env::var("PATH").unwrap_or_default();
        let mut all: Vec<String> = known_paths;
        for p in current.split(':') {
            if !p.is_empty() {
                all.push(p.to_string());
            }
        }
        
        // 중복 제거
        let mut seen = std::collections::HashSet::new();
        let deduped: Vec<String> = all.into_iter().filter(|p| seen.insert(p.clone())).collect();
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

/// 바이너리 존재 확인 (macOS: 확장 PATH 사용)
fn check_binary_exists(name: &str) -> bool {
    #[cfg(windows)]
    {
        Command::new("where").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS GUI 앱에서는 확장 PATH로 which 실행
        macos_cmd("which").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("which").arg(name).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
}

/// 바이너리 버전 확인 (macOS: 확장 PATH 사용)
fn get_binary_version(name: &str, version_arg: &str) -> Option<String> {
    #[cfg(target_os = "macos")]
    let output = macos_cmd(name).arg(version_arg).output().ok()?;
    
    #[cfg(not(target_os = "macos"))]
    let output = Command::new(name).arg(version_arg).output().ok()?;
    
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
    // 다양한 brew 경로 시도
    let brew_paths = [
        "brew".to_string(),
        "/opt/homebrew/bin/brew".to_string(),
        "/usr/local/bin/brew".to_string(),
        "/home/linuxbrew/.linuxbrew/bin/brew".to_string(),
    ];
    
    for brew_path in &brew_paths {
        if let Ok(output) = Command::new(brew_path).arg("--version").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                return stdout.lines().next().map(|s| s.trim().to_string());
            }
        }
    }
    
    // 사용자 홈 Linuxbrew
    if let Some(home) = dirs::home_dir() {
        let user_brew = home.join(".linuxbrew/bin/brew");
        if let Ok(output) = Command::new(&user_brew).arg("--version").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                return stdout.lines().next().map(|s| s.trim().to_string());
            }
        }
    }
    
    None
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
        let output = Command::new("winget")
            .args(["install", "--id", "GoLang.Go", "-e", "--accept-source-agreements", "--accept-package-agreements"])
            .output()
            .map_err(|e| format!("winget 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("Go 설치 완료. 앱을 재시작해주세요.".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 확장 PATH로 brew 실행
        let output = macos_cmd("brew")
            .args(["install", "go"])
            .output()
            .map_err(|e| format!("brew 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("Go 설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        Err("Linux에서는 패키지 매니저로 Go를 설치해주세요 (apt, dnf 등)".into())
    }
}

async fn install_uv() -> Result<String, String> {
    #[cfg(windows)]
    {
        let output = Command::new("powershell")
            .args(["-Command", "irm https://astral.sh/uv/install.ps1 | iex"])
            .output()
            .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("uv 설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 확장 PATH로 curl 실행
        let output = macos_sh("curl -LsSf https://astral.sh/uv/install.sh | sh")
            .output()
            .map_err(|e| format!("설치 스크립트 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("uv 설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let output = Command::new("sh")
            .args(["-c", "curl -LsSf https://astral.sh/uv/install.sh | sh"])
            .output()
            .map_err(|e| format!("설치 스크립트 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("uv 설치 완료".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
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
    if !check_binary_exists("go") {
        return Err("Go가 설치되어 있지 않습니다. 먼저 Go를 설치해주세요.".into());
    }

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", cmd])
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
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
    if !check_binary_exists("npm") {
        return Err("npm이 설치되어 있지 않습니다.".into());
    }

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", cmd])
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
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
    if !check_binary_exists("uv") {
        return Err("uv가 설치되어 있지 않습니다. 먼저 uv를 설치해주세요.".into());
    }

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/C", cmd])
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    let output = macos_sh(cmd)
        .output()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
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
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            command.replace("\"", "\\\"")
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
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm", "x-terminal-emulator"];
        let mut success = false;
        
        for term in &terminals {
            let result = match *term {
                "gnome-terminal" => Command::new(term).args(["--", "bash", "-c", &format!("{}; exec bash", command)]).spawn(),
                "konsole" => Command::new(term).args(["-e", "bash", "-c", &format!("{}; exec bash", command)]).spawn(),
                _ => Command::new(term).args(["-e", &format!("bash -c '{}; exec bash'", command)]).spawn(),
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
        let output = Command::new("cmd").args(["/C", logout_cmd]).output();
        
        #[cfg(target_os = "macos")]
        let output = macos_sh(logout_cmd).output();
        
        #[cfg(target_os = "linux")]
        let output = Command::new("sh").args(["-c", logout_cmd]).output();
        
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
