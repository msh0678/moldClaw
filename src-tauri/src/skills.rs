use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use crate::skill_definitions::SKILL_DEFINITIONS;

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

/// 바이너리 존재 확인
fn check_binary_exists(name: &str) -> bool {
    #[cfg(windows)]
    let result = Command::new("where").arg(name).output();
    
    #[cfg(not(windows))]
    let result = Command::new("which").arg(name).output();
    
    result.map(|o| o.status.success()).unwrap_or(false)
}

/// 바이너리 버전 확인
fn get_binary_version(name: &str, version_arg: &str) -> Option<String> {
    let output = Command::new(name)
        .arg(version_arg)
        .output()
        .ok()?;
    
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

/// Prerequisite 상태 확인
fn check_prerequisites() -> PrerequisiteStatus {
    PrerequisiteStatus {
        go_installed: check_binary_exists("go"),
        go_version: get_binary_version("go", "version"),
        uv_installed: check_binary_exists("uv"),
        uv_version: get_binary_version("uv", "--version"),
        brew_installed: check_binary_exists("brew"),
        brew_version: get_binary_version("brew", "--version"),
        winget_installed: check_binary_exists("winget"),
        npm_installed: check_binary_exists("npm"),
        npm_version: get_binary_version("npm", "--version"),
    }
}

/// 환경변수 설정 확인
fn check_env_var_configured(config: &serde_json::Value, var_name: &str) -> bool {
    config
        .get("env")
        .and_then(|e| e.get("vars"))
        .and_then(|v| v.get(var_name))
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false)
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
            vars.iter().all(|v| check_env_var_configured(config, v))
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

/// Prerequisite 설치 (go, uv)
#[tauri::command]
pub async fn install_prerequisite(name: String) -> Result<String, String> {
    match name.as_str() {
        "go" => install_go().await,
        "uv" => install_uv().await,
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
        let output = Command::new("brew")
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
    
    #[cfg(not(windows))]
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
    if !check_binary_exists("npm") {
        return Err("npm이 설치되어 있지 않습니다.".into());
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

async fn install_with_uv(cmd: &str) -> Result<String, String> {
    if !check_binary_exists("uv") {
        return Err("uv가 설치되어 있지 않습니다. 먼저 uv를 설치해주세요.".into());
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
        
        #[cfg(not(windows))]
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
