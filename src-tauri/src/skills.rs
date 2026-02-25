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
    pub install_method: InstallMethod,
    pub install_command: Option<String>,
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

/// 전체 스킬 상태 응답
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsStatusResponse {
    pub skills: HashMap<String, SkillStatus>,
    pub platform: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

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

/// ~ 를 홈 디렉토리로 확장
fn expand_home_path(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    }
    PathBuf::from(path)
}

/// Config 파일/폴더 존재 확인
fn check_config_exists(path: &str) -> bool {
    let expanded = expand_home_path(path);
    expanded.exists()
}

/// OpenClaw 설정 읽기
fn read_openclaw_config() -> Result<serde_json::Value, String> {
    let config_path = dirs::home_dir()
        .ok_or("홈 디렉토리를 찾을 수 없습니다")?
        .join(".openclaw")
        .join("openclaw.json");

    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("JSON 파싱 실패: {}", e))
}

/// OpenClaw 설정 저장
fn save_openclaw_config(config: &serde_json::Value) -> Result<(), String> {
    let config_path = dirs::home_dir()
        .ok_or("홈 디렉토리를 찾을 수 없습니다")?
        .join(".openclaw")
        .join("openclaw.json");

    // 디렉토리 생성
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("JSON 직렬화 실패: {}", e))?;

    std::fs::write(&config_path, content).map_err(|e| format!("설정 파일 저장 실패: {}", e))
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

/// 현재 플랫폼 가져오기
fn get_current_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

/// 현재 플랫폼에서 지원되는 스킬만 필터링
pub fn get_supported_skills() -> Vec<&'static SkillDefinition> {
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

/// 단일 스킬 상태 확인
fn get_skill_status(skill: &SkillDefinition, config: &serde_json::Value) -> SkillStatus {
    // 1. 바이너리 설치 확인
    let installed = if let Some(ref binary) = skill.binary_name {
        check_binary_exists(binary)
    } else {
        matches!(skill.install_method, InstallMethod::Builtin)
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

    SkillStatus {
        id: skill.id.clone(),
        installed,
        configured,
        enabled,
        version: None,
        error: None,
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// 모든 스킬 상태 조회
#[tauri::command]
pub fn get_skills_status() -> Result<SkillsStatusResponse, String> {
    let config = read_openclaw_config()?;

    let mut status_map = HashMap::new();
    for skill in SKILL_DEFINITIONS.iter() {
        if skill.hidden {
            continue;
        }
        let status = get_skill_status(skill, &config);
        status_map.insert(skill.id.clone(), status);
    }

    Ok(SkillsStatusResponse {
        skills: status_map,
        platform: get_current_platform().to_string(),
    })
}

/// 스킬 정의 목록 조회
#[tauri::command]
pub fn get_skill_definitions() -> Vec<SkillDefinition> {
    get_supported_skills().into_iter().cloned().collect()
}

/// 스킬 설치
#[tauri::command]
pub async fn install_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("스킬을 찾을 수 없음: {}", skill_id))?;

    let install_cmd = skill
        .install_command
        .as_ref()
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
    let use_uv = check_binary_exists("uv");

    let actual_cmd = if use_uv {
        cmd.to_string()
    } else {
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

/// 스킬 API 키 설정
#[tauri::command]
pub fn configure_skill_api_key(
    _skill_id: String,
    env_var: String,
    value: String,
) -> Result<(), String> {
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

/// 스킬 로그인 터미널 열기
#[tauri::command]
pub fn open_skill_login_terminal(_skill_id: String, login_command: String) -> Result<(), String> {
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
        let terminals = ["gnome-terminal", "konsole", "xterm"];
        let mut spawned = false;
        for term in terminals {
            if check_binary_exists(term) {
                let cmd = format!("{}; read -p 'Press Enter to close'", login_command);
                let _ = Command::new(term)
                    .args(["--", "sh", "-c", &cmd])
                    .spawn();
                spawned = true;
                break;
            }
        }
        if !spawned {
            return Err("터미널을 찾을 수 없습니다".into());
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

/// 스킬 연결 해제
#[tauri::command]
pub async fn disconnect_skill(skill_id: String) -> Result<String, String> {
    let skill = SKILL_DEFINITIONS
        .iter()
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
            Ok(o) => results.push(format!(
                "로그아웃 실패: {}",
                String::from_utf8_lossy(&o.stderr)
            )),
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
            if let Some(vars) = config
                .get_mut("env")
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
    if let Some(entries) = config
        .get_mut("skills")
        .and_then(|s| s.get_mut("entries"))
        .and_then(|e| e.as_object_mut())
    {
        if entries.remove(&skill_id).is_some() {
            results.push("스킬 항목 제거됨".into());
        }
    }
    save_openclaw_config(&config)?;

    Ok(results.join("\n"))
}

/// 스킬 비활성화
#[tauri::command]
pub fn disable_skill(skill_id: String) -> Result<(), String> {
    let mut config = read_openclaw_config()?;

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

/// 스킬 활성화
#[tauri::command]
pub fn enable_skill(skill_id: String) -> Result<(), String> {
    let mut config = read_openclaw_config()?;

    if config.get("skills").is_none() {
        config["skills"] = serde_json::json!({});
    }
    if config["skills"].get("entries").is_none() {
        config["skills"]["entries"] = serde_json::json!({});
    }

    if config["skills"]["entries"].get(&skill_id).is_none() {
        config["skills"]["entries"][&skill_id] = serde_json::json!({});
    }

    config["skills"]["entries"][&skill_id]["enabled"] = serde_json::Value::Bool(true);

    save_openclaw_config(&config)?;
    Ok(())
}
