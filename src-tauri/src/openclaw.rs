use std::process::Command;
use std::path::PathBuf;
use std::fs;
use serde_json::{json, Value};
use crate::openclaw_manager::get_manager;

/// Node.js 설치 여부 확인 (번들된 Node.js 사용)
pub async fn is_node_installed() -> Result<bool, String> {
    match get_manager() {
        Ok(manager) => Ok(manager.check_node_bundled().await),
        Err(e) => {
            eprintln!("Manager 초기화 실패: {}", e);
            Ok(false)
        }
    }
}

/// Node.js 버전 확인
pub async fn get_node_version() -> Result<String, String> {
    let manager = get_manager()?;
    manager.get_node_version().await
}

/// OpenClaw 설치 여부 확인
pub async fn is_openclaw_installed() -> Result<bool, String> {
    let manager = get_manager()?;
    Ok(manager.check_openclaw_installed().await)
}

/// OpenClaw 버전 확인
pub async fn get_openclaw_version() -> Result<String, String> {
    let output = Command::new("openclaw")
        .arg("--version")
        .output()
        .map_err(|e| format!("OpenClaw 확인 실패: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("OpenClaw이 설치되어 있지 않습니다".to_string())
    }
}

/// OpenClaw 설치 (번들된 npm 사용)
pub async fn install_openclaw() -> Result<String, String> {
    let manager = get_manager()?;
    manager.install_openclaw().await
}

/// OpenClaw 설정 디렉토리
fn get_openclaw_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".openclaw")
}

/// OpenClaw 설정 파일 경로
fn get_config_path() -> PathBuf {
    get_openclaw_dir().join("openclaw.json")
}

/// Workspace 디렉토리 경로
fn get_workspace_dir() -> PathBuf {
    get_openclaw_dir().join("workspace")
}

/// 기존 설정 읽기 (없으면 빈 객체)
fn read_existing_config() -> Value {
    let config_path = get_config_path();
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            // JSON5 파싱 시도 (주석 등 허용)
            if let Ok(parsed) = json5::from_str::<Value>(&content) {
                return parsed;
            }
            // 일반 JSON 파싱 시도
            if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
                return parsed;
            }
        }
    }
    json!({})
}

/// 설정 파일 저장 (JSON5 형식, 들여쓰기)
fn write_config(config: &Value) -> Result<(), String> {
    let config_dir = get_openclaw_dir();
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("설정 디렉토리 생성 실패: {}", e))?;

    // 저장 전에 설정 검증 및 수정
    let mut config = config.clone();
    fix_config_structure(&mut config);

    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("JSON 직렬화 실패: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("설정 파일 저장 실패: {}", e))?;

    Ok(())
}

/// 설정 구조 검증 및 수정
fn fix_config_structure(config: &mut Value) {
    // agents.defaults.model이 string인 경우 객체로 변환
    if let Some(agents) = config.get_mut("agents") {
        if let Some(defaults) = agents.get_mut("defaults") {
            if let Some(model_val) = defaults.get_mut("model") {
                if let Value::String(model_str) = model_val {
                    let model_str_clone = model_str.clone();
                    *model_val = json!({
                        "primary": model_str_clone
                    });
                }
            }
        }
    }
}

/// 중첩 JSON 객체에 값 설정 (deep merge)
fn set_nested_value(config: &mut Value, path: &[&str], value: Value) {
    if path.is_empty() {
        return;
    }

    let mut current = config;
    for (i, key) in path.iter().enumerate() {
        if i == path.len() - 1 {
            // 마지막 키: 값 설정
            if let Value::Object(map) = current {
                map.insert(key.to_string(), value.clone());
            }
        } else {
            // 중간 키: 객체 확보
            if let Value::Object(map) = current {
                // 키가 없거나, 있지만 객체가 아닌 경우 객체로 교체
                let needs_object = !map.contains_key(*key) || !map[*key].is_object();
                
                if needs_object {
                    map.insert(key.to_string(), json!({}));
                }
                current = map.get_mut(*key).unwrap();
            }
        }
    }
}

/// 모델 설정 (사용자 API 키) - JSON5 형식
pub async fn configure_model(provider: &str, model: &str, api_key: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    // models.providers.<provider>.apiKey 설정
    set_nested_value(
        &mut config,
        &["models", "providers", provider, "apiKey"],
        json!(api_key),
    );

    // models.providers.<provider>.baseUrl 설정 (필요한 경우)
    match provider {
        "anthropic" => {
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "baseUrl"],
                json!("https://api.anthropic.com"),
            );
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "api"],
                json!("anthropic-messages"),
            );
        }
        "openai" => {
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "baseUrl"],
                json!("https://api.openai.com/v1"),
            );
        }
        "google" => {
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "baseUrl"],
                json!("https://generativelanguage.googleapis.com/v1"),
            );
        }
        _ => {}
    }

    // models.providers.<provider>.models 배열 추가 (현재 선택된 모델 정보)
    let model_info = match model {
        "claude-sonnet-4-20250514" => json!({
            "id": "claude-sonnet-4-20250514",
            "name": "Claude Sonnet 4"
        }),
        "claude-haiku-4-5-20251001" => json!({
            "id": "claude-haiku-4-5-20251001", 
            "name": "Claude Haiku 4.5"
        }),
        "claude-opus-4-20250514" => json!({
            "id": "claude-opus-4-20250514",
            "name": "Claude Opus 4"
        }),
        "gpt-4o" => json!({
            "id": "gpt-4o",
            "name": "GPT-4o"
        }),
        "gpt-4o-mini" => json!({
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini"
        }),
        _ => json!({
            "id": model,
            "name": model
        })
    };
    
    set_nested_value(
        &mut config,
        &["models", "providers", provider, "models"],
        json!([model_info]),
    );

    // agents.defaults.model.primary 설정 (올바른 경로)
    let model_string = format!("{}/{}", provider, model);
    set_nested_value(
        &mut config,
        &["agents", "defaults", "model", "primary"],
        json!(model_string),
    );

    // agents.defaults.workspace 설정 (없으면 추가)
    let workspace_path = get_workspace_dir();
    let workspace_str = workspace_path.to_string_lossy().to_string();
    
    if config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("workspace"))
        .is_none()
    {
        set_nested_value(
            &mut config,
            &["agents", "defaults", "workspace"],
            json!(workspace_str),
        );
    }

    // tools.exec 설정 추가 (명령어 자동 실행)
    set_nested_value(
        &mut config,
        &["tools", "exec", "security"],
        json!("full"),
    );
    set_nested_value(
        &mut config,
        &["tools", "exec", "ask"],
        json!("off"),
    );

    write_config(&config)?;
    Ok(())
}

/// Gateway 설정 (포트, 바인드, 인증)
pub async fn configure_gateway(port: u16, bind: &str, auth_token: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["gateway", "port"], json!(port));
    set_nested_value(&mut config, &["gateway", "bind"], json!(bind));
    
    if !auth_token.is_empty() {
        set_nested_value(&mut config, &["gateway", "auth", "token"], json!(auth_token));
    }

    write_config(&config)?;
    Ok(())
}

/// Gateway 전체 설정 (토큰 또는 비밀번호 인증)
pub async fn configure_gateway_full(
    port: u16,
    bind: &str,
    auth_token: &str,
    auth_password: &str,
) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["gateway", "port"], json!(port));
    set_nested_value(&mut config, &["gateway", "bind"], json!(bind));
    
    if !auth_token.is_empty() {
        set_nested_value(&mut config, &["gateway", "auth", "mode"], json!("token"));
        set_nested_value(&mut config, &["gateway", "auth", "token"], json!(auth_token));
    } else if !auth_password.is_empty() {
        set_nested_value(&mut config, &["gateway", "auth", "mode"], json!("password"));
        set_nested_value(&mut config, &["gateway", "auth", "password"], json!(auth_password));
    }

    write_config(&config)?;
    Ok(())
}

/// Workspace 초기화 (디렉토리 + 기본 파일 생성)
pub async fn initialize_workspace() -> Result<String, String> {
    let workspace_dir = get_workspace_dir();
    fs::create_dir_all(&workspace_dir)
        .map_err(|e| format!("워크스페이스 디렉토리 생성 실패: {}", e))?;

    // 기본 AGENTS.md 생성 (없는 경우에만)
    let agents_md = workspace_dir.join("AGENTS.md");
    if !agents_md.exists() {
        let content = r#"# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Every Session

Before doing anything else:
1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context

## Memory

You wake up fresh each session. These files are your continuity:
- **Daily notes:** `memory/YYYY-MM-DD.md`
- **Long-term:** `MEMORY.md`

Capture what matters. Decisions, context, things to remember.
"#;
        fs::write(&agents_md, content)
            .map_err(|e| format!("AGENTS.md 생성 실패: {}", e))?;
    }

    // 기본 SOUL.md 생성 (없는 경우에만)
    let soul_md = workspace_dir.join("SOUL.md");
    if !soul_md.exists() {
        let content = r#"# SOUL.md - Who You Are

**Be genuinely helpful, not performatively helpful.** Skip the filler words — just help.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring.

**Be resourceful before asking.** Try to figure it out first. Then ask if stuck.

**Earn trust through competence.** Be careful with external actions. Be bold with internal ones.

## Boundaries
- Private things stay private. Period.
- When in doubt, ask before acting externally.

## Vibe
Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters.
"#;
        fs::write(&soul_md, content)
            .map_err(|e| format!("SOUL.md 생성 실패: {}", e))?;
    }

    // memory 디렉토리 생성
    let memory_dir = workspace_dir.join("memory");
    fs::create_dir_all(&memory_dir)
        .map_err(|e| format!("memory 디렉토리 생성 실패: {}", e))?;

    Ok(workspace_dir.to_string_lossy().to_string())
}

/// Telegram 설정 (botToken + 정책)
pub async fn configure_telegram(token: &str, dm_policy: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "telegram", "botToken"], json!(token));
    set_nested_value(&mut config, &["channels", "telegram", "dmPolicy"], json!(dm_policy));

    // 기본 그룹 설정 (멘션 필요)
    set_nested_value(
        &mut config,
        &["channels", "telegram", "groups", "*", "requireMention"],
        json!(true),
    );

    write_config(&config)?;
    Ok(())
}

/// Telegram 전체 설정 (allowFrom, groupPolicy 등 포함)
pub async fn configure_telegram_full(
    token: &str,
    dm_policy: &str,
    allow_from: Vec<String>,
    group_policy: &str,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "telegram", "botToken"], json!(token));
    set_nested_value(&mut config, &["channels", "telegram", "dmPolicy"], json!(dm_policy));
    
    // allowFrom
    if !allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "telegram", "allowFrom"], json!(allow_from));
    }
    
    // 그룹 정책
    set_nested_value(&mut config, &["channels", "telegram", "groupPolicy"], json!(group_policy));
    
    // groupAllowFrom
    if !group_allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "telegram", "groupAllowFrom"], json!(group_allow_from));
    }
    
    // 그룹 설정
    set_nested_value(
        &mut config,
        &["channels", "telegram", "groups", "*", "requireMention"],
        json!(require_mention),
    );

    write_config(&config)?;
    Ok(())
}

/// Discord 설정 (token + 정책)
pub async fn configure_discord(token: &str, dm_policy: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
    set_nested_value(&mut config, &["channels", "discord", "dmPolicy"], json!(dm_policy));
    
    // allowFrom 설정 (open일 때는 ["*"])
    if dm_policy == "open" {
        set_nested_value(&mut config, &["channels", "discord", "allowFrom"], json!(["*"]));
    }

    write_config(&config)?;
    Ok(())
}

/// Discord 전체 설정 (allowFrom, groupPolicy 등 포함)
pub async fn configure_discord_full(
    token: &str,
    dm_policy: &str,
    allow_from: Vec<String>,
    group_policy: &str,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
    set_nested_value(&mut config, &["channels", "discord", "dmPolicy"], json!(dm_policy));
    
    // allowFrom 설정
    if dm_policy == "open" {
        set_nested_value(&mut config, &["channels", "discord", "allowFrom"], json!(["*"]));
    } else if !allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "discord", "allowFrom"], json!(allow_from));
    }
    
    // 그룹 정책
    set_nested_value(&mut config, &["channels", "discord", "groupPolicy"], json!(group_policy));
    
    // groupAllowFrom (Discord는 최상위 레벨)
    if !group_allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "discord", "groupAllowFrom"], json!(group_allow_from));
    }
    
    // guilds 설정
    set_nested_value(&mut config, &["channels", "discord", "guilds", "*", "requireMention"], json!(require_mention));

    write_config(&config)?;
    Ok(())
}

/// WhatsApp 설정 (페어링 모드)
pub async fn configure_whatsapp(dm_policy: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "whatsapp", "dmPolicy"], json!(dm_policy));

    // 기본 그룹 설정 (멘션 필요)
    set_nested_value(
        &mut config,
        &["channels", "whatsapp", "groups", "*", "requireMention"],
        json!(true),
    );

    write_config(&config)?;
    Ok(())
}

/// WhatsApp 전체 설정 (allowFrom, groupPolicy 등 포함)
pub async fn configure_whatsapp_full(
    dm_policy: &str,
    allow_from: Vec<String>,
    group_policy: &str,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "whatsapp", "dmPolicy"], json!(dm_policy));
    
    // allowFrom
    if !allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "whatsapp", "allowFrom"], json!(allow_from));
    }
    
    // 그룹 정책
    set_nested_value(&mut config, &["channels", "whatsapp", "groupPolicy"], json!(group_policy));
    
    // groupAllowFrom
    if !group_allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "whatsapp", "groupAllowFrom"], json!(group_allow_from));
    }
    
    // 그룹 설정
    set_nested_value(
        &mut config,
        &["channels", "whatsapp", "groups", "*", "requireMention"],
        json!(require_mention),
    );

    write_config(&config)?;
    Ok(())
}

/// Gateway 시작 (번들된 OpenClaw 사용)
pub async fn start_gateway() -> Result<(), String> {
    let manager = get_manager()?;
    manager.start_gateway().await
}

/// Gateway 시작 (daemon 모드 - 서비스 설치)
pub async fn install_and_start_service() -> Result<String, String> {
    // 먼저 일반 gateway start 시도
    let start_output = Command::new("openclaw")
        .args(["gateway", "start"])
        .output()
        .map_err(|e| format!("Gateway 시작 명령 실패: {}", e))?;

    if start_output.status.success() {
        return Ok("Gateway가 시작되었습니다".to_string());
    }

    // 실패 시 백그라운드로 실행
    Command::new("openclaw")
        .args(["gateway", "start"])
        .spawn()
        .map_err(|e| format!("Gateway 백그라운드 시작 실패: {}", e))?;

    // 잠시 대기 후 상태 확인
    std::thread::sleep(std::time::Duration::from_millis(2000));
    
    let status = get_status().await?;
    if status == "running" {
        Ok("Gateway가 시작되었습니다".to_string())
    } else {
        Err("Gateway 시작에 실패했습니다".to_string())
    }
}

/// Gateway 상태 확인
pub async fn get_status() -> Result<String, String> {
    match get_manager() {
        Ok(manager) => manager.get_status().await,
        Err(_) => Ok("stopped".to_string()),
    }
}

/// WhatsApp 페어링 시작 (onboard 명령 사용)
pub async fn start_whatsapp_pairing() -> Result<String, String> {
    // OpenClaw onboard를 non-interactive로 실행하고 WhatsApp 설정
    let output = Command::new("openclaw")
        .args([
            "onboard",
            "--non-interactive",
            "--accept-risk",
            "--flow", "quickstart",
            "--skip-channels",  // 채널은 별도 설정
            "--skip-skills",
            "--skip-health",
        ])
        .output()
        .map_err(|e| format!("onboard 실행 실패: {}", e))?;

    if output.status.success() {
        Ok("WhatsApp 연결 준비 완료. QR 코드를 확인하세요.".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("onboard 실패: {}", stderr))
    }
}

/// 전체 onboard 실행 (non-interactive)
pub async fn run_full_onboard(
    provider: &str,
    api_key: &str,
    gateway_port: u16,
    gateway_bind: &str,
) -> Result<String, String> {
    // API 키 플래그 결정
    let api_key_flag = match provider {
        "anthropic" => "--anthropic-api-key",
        "openai" => "--openai-api-key",
        "google" => "--gemini-api-key",
        "openrouter" => "--openrouter-api-key",
        _ => return Err(format!("지원하지 않는 프로바이더: {}", provider)),
    };

    let port_str = gateway_port.to_string();
    
    let output = Command::new("openclaw")
        .args([
            "onboard",
            "--non-interactive",
            "--accept-risk",
            "--flow", "quickstart",
            api_key_flag, api_key,
            "--gateway-port", &port_str,
            "--gateway-bind", gateway_bind,
            "--gateway-auth", "token",
            "--skip-channels",
            "--skip-skills",
            "--skip-health",
            "--install-daemon",
        ])
        .output()
        .map_err(|e| format!("onboard 실행 실패: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(format!("OpenClaw 설정 완료!\n{}", stdout))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // onboard가 실패해도 수동 설정으로 fallback
        Err(format!("onboard 실패 (수동 설정 시도): {}", stderr))
    }
}

/// 설정 검증
pub async fn validate_config() -> Result<bool, String> {
    // 먼저 설정 파일이 올바른 구조인지 확인
    let config = read_existing_config();
    
    // agents.defaults.model이 객체인지 확인
    if let Some(agents) = config.get("agents") {
        if let Some(defaults) = agents.get("defaults") {
            if let Some(model) = defaults.get("model") {
                if !model.is_object() {
                    return Err("agents.defaults.model must be an object with 'primary' field".to_string());
                }
                if model.get("primary").is_none() {
                    return Err("agents.defaults.model.primary is missing".to_string());
                }
            }
        }
    }

    // OpenClaw doctor 실행
    let output = Command::new("openclaw")
        .args(["doctor"])
        .output()
        .map_err(|e| format!("doctor 실행 실패: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Configuration validation failed: {}", stderr));
    }

    Ok(output.status.success())
}

/// 현재 설정 요약 가져오기
pub async fn get_config_summary() -> Result<String, String> {
    let config = read_existing_config();
    
    let mut summary = String::new();
    
    // Model
    if let Some(model) = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("model"))
        .and_then(|m| m.as_str())
    {
        summary.push_str(&format!("모델: {}\n", model));
    }
    
    // Workspace
    if let Some(workspace) = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("workspace"))
        .and_then(|w| w.as_str())
    {
        summary.push_str(&format!("워크스페이스: {}\n", workspace));
    }
    
    // Gateway
    if let Some(port) = config.get("gateway")
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
    {
        summary.push_str(&format!("Gateway 포트: {}\n", port));
    }
    
    // Channels
    if config.get("channels").and_then(|c| c.get("telegram")).is_some() {
        summary.push_str("Telegram: 설정됨\n");
    }
    if config.get("channels").and_then(|c| c.get("discord")).is_some() {
        summary.push_str("Discord: 설정됨\n");
    }
    if config.get("channels").and_then(|c| c.get("whatsapp")).is_some() {
        summary.push_str("WhatsApp: 설정됨\n");
    }
    
    if summary.is_empty() {
        summary = "설정 없음".to_string();
    }
    
    Ok(summary)
}

/// 랜덤 토큰 생성
pub fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("moldclaw-{:x}", timestamp)
}

/// OS 타입 반환
pub fn get_os_type() -> String {
    if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else {
        "linux".to_string()
    }
}

/// 온보딩 완료 여부 확인
pub async fn is_onboarding_completed() -> Result<bool, String> {
    let config = read_existing_config();
    
    // 기본적인 설정들이 모두 있는지 확인
    let has_model = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("model"))
        .and_then(|m| m.get("primary"))
        .is_some();
    
    let has_api_key = config.get("models")
        .and_then(|m| m.get("providers"))
        .map(|p| p.as_object().unwrap().len() > 0)
        .unwrap_or(false);
    
    let has_gateway = config.get("gateway")
        .and_then(|g| g.get("port"))
        .is_some();
    
    let has_workspace = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("workspace"))
        .is_some();
    
    // 최소한의 필수 설정이 있으면 온보딩 완료로 간주
    Ok(has_model && has_api_key && has_gateway && has_workspace)
}

/// Gateway 중지
pub async fn stop_gateway() -> Result<(), String> {
    // gateway status로 실행 중인지 확인
    let status = get_status().await?;
    if status != "running" {
        return Ok(());
    }

    // 1. openclaw gateway stop 시도
    let stop_output = Command::new("openclaw")
        .args(["gateway", "stop"])
        .output();

    if let Ok(output) = stop_output {
        if output.status.success() {
            // 2초 대기 후 확인
            std::thread::sleep(std::time::Duration::from_millis(2000));
            let new_status = get_status().await?;
            if new_status != "running" {
                return Ok(());
            }
        }
    }

    // 2. 강제 종료: openclaw-gateway 프로세스 직접 종료
    let kill_gateway = Command::new("pkill")
        .args(["-9", "-f", "openclaw-gateway"])
        .output();

    // 3. openclaw 메인 프로세스도 종료 (필요시)
    let _ = Command::new("pkill")
        .args(["-f", "openclaw$"])
        .output();

    match kill_gateway {
        Ok(_) => {
            // 1초 대기 후 다시 확인
            std::thread::sleep(std::time::Duration::from_millis(1000));
            let final_status = get_status().await?;
            if final_status != "running" {
                Ok(())
            } else {
                Err("Gateway 강제 종료 실패".to_string())
            }
        },
        Err(e) => Err(format!("Gateway 중지 실패: {}", e)),
    }
}

/// Gateway 재시작
pub async fn restart_gateway() -> Result<String, String> {
    stop_gateway().await?;
    
    // 잠시 대기
    std::thread::sleep(std::time::Duration::from_millis(1000));
    
    // 다시 시작
    match install_and_start_service().await {
        Ok(result) => Ok(result),
        Err(_) => {
            start_gateway().await?;
            Ok("Gateway가 재시작되었습니다".to_string())
        }
    }
}

/// Node.js 설치 URL
pub fn get_node_install_url() -> String {
    let os = get_os_type();
    match os.as_str() {
        "windows" => "https://nodejs.org/dist/v22.22.0/node-v22.22.0-x64.msi".to_string(),
        "macos" => "https://nodejs.org/dist/v22.22.0/node-v22.22.0.pkg".to_string(),
        _ => "https://nodejs.org/en/download".to_string(),
    }
}

/// 환경변수/API 키 설정 (openclaw.json의 env 섹션에 저장)
pub async fn set_env_config(key: &str, value: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    // env.vars 섹션에 저장
    set_nested_value(&mut config, &["env", "vars", key], json!(value));

    // 특정 키는 적절한 위치에도 저장
    match key {
        // 웹 검색
        "BRAVE_API_KEY" => {
            set_nested_value(&mut config, &["tools", "web", "search", "apiKey"], json!(value));
        }
        // Firecrawl
        "FIRECRAWL_API_KEY" => {
            set_nested_value(&mut config, &["tools", "web", "fetch", "firecrawl", "apiKey"], json!(value));
        }
        // ElevenLabs TTS
        "ELEVENLABS_API_KEY" => {
            set_nested_value(&mut config, &["messages", "tts", "elevenlabs", "apiKey"], json!(value));
        }
        // Slack
        "SLACK_BOT_TOKEN" => {
            set_nested_value(&mut config, &["channels", "slack", "botToken"], json!(value));
        }
        "SLACK_APP_TOKEN" => {
            set_nested_value(&mut config, &["channels", "slack", "appToken"], json!(value));
        }
        // Mattermost
        "MATTERMOST_BOT_TOKEN" => {
            set_nested_value(&mut config, &["channels", "mattermost", "botToken"], json!(value));
        }
        "MATTERMOST_URL" => {
            set_nested_value(&mut config, &["channels", "mattermost", "baseUrl"], json!(value));
        }
        // Google Chat
        "GOOGLE_CHAT_SERVICE_ACCOUNT_FILE" => {
            set_nested_value(&mut config, &["channels", "googlechat", "serviceAccountFile"], json!(value));
        }
        // 모델 프로바이더 API 키들
        "OPENROUTER_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "openrouter", "apiKey"], json!(value));
        }
        "GROQ_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "groq", "apiKey"], json!(value));
        }
        "MINIMAX_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "minimax", "apiKey"], json!(value));
        }
        "MOONSHOT_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "moonshot", "apiKey"], json!(value));
        }
        "ZAI_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "zai", "apiKey"], json!(value));
        }
        "KIMI_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "kimi-coding", "apiKey"], json!(value));
        }
        "SYNTHETIC_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "synthetic", "apiKey"], json!(value));
        }
        "VENICE_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "venice", "apiKey"], json!(value));
        }
        "XIAOMI_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "xiaomi", "apiKey"], json!(value));
        }
        "VERCEL_GATEWAY_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "vercel-gateway", "apiKey"], json!(value));
        }
        "OPENCODE_API_KEY" => {
            set_nested_value(&mut config, &["models", "providers", "opencode", "apiKey"], json!(value));
        }
        _ => {}
    }

    write_config(&config)?;
    Ok(())
}

/// 여러 환경변수 한번에 설정
pub async fn set_env_configs(configs: Vec<(String, String)>) -> Result<(), String> {
    for (key, value) in configs {
        set_env_config(&key, &value).await?;
    }
    Ok(())
}

/// 설정된 환경변수 목록 가져오기
pub async fn get_configured_integrations() -> Result<Vec<String>, String> {
    let config = read_existing_config();
    let mut configured = Vec::new();

    // env.vars에서 확인
    if let Some(env) = config.get("env") {
        if let Some(vars) = env.get("vars") {
            if let Some(obj) = vars.as_object() {
                for key in obj.keys() {
                    configured.push(key.clone());
                }
            }
        }
    }

    Ok(configured)
}

/// 기본 보안 설정 적용 (tools.exec 자동 실행 포함)
pub async fn apply_default_security_settings() -> Result<(), String> {
    let mut config = read_existing_config();

    // tools.exec 설정 (명령어 자동 실행)
    set_nested_value(
        &mut config,
        &["tools", "exec", "security"],
        json!("full"),
    );
    set_nested_value(
        &mut config,
        &["tools", "exec", "ask"],
        json!("off"),
    );

    write_config(&config)?;
    Ok(())
}


/// 실제 설치 경로 반환
pub async fn get_install_path() -> Result<String, String> {
    let manager = get_manager()?;
    Ok(manager.get_install_dir().to_string_lossy().to_string())
}

/// 브라우저 컨트롤 설치
pub async fn install_browser_control() -> Result<String, String> {
    let manager = get_manager()?;
    
    eprintln!("브라우저 컨트롤 설정 시작...");
    
    // 먼저 OpenClaw가 브라우저 제어를 지원하는지 확인
    let browser_check = manager.run_openclaw(vec!["browser", "status"]).await;
    
    match browser_check {
        Ok(status_output) => {
            eprintln!("브라우저 상태: {}", status_output);
            
            // browser control server 설치 시도
            let install_result = if status_output.contains("not found") || status_output.contains("error") {
                // browser control server가 없으면 설치 시도
                match manager.run_openclaw(vec!["browser", "control", "install"]).await {
                    Ok(output) => Ok(output),
                    Err(_) => {
                        // 대체 명령: browser start
                        eprintln!("browser control install 실패, browser start 시도");
                        manager.run_openclaw(vec!["browser", "start"]).await
                    }
                }
            } else {
                Ok("브라우저 제어가 이미 활성화되어 있습니다.".to_string())
            };
            
            // 설정 파일에 브라우저 설정 추가
            let mut config = read_existing_config();
            
            // browser 섹션이 없으면 생성
            if !config.get("browser").is_some() {
                set_nested_value(&mut config, &["browser"], json!({}));
            }
            
            // Chrome profile 사용 설정
            set_nested_value(
                &mut config,
                &["browser", "target"],
                json!("host"),  // sandbox가 아닌 host에서 실행
            );
            
            // Chrome 확장 릴레이를 위한 설정
            set_nested_value(
                &mut config,
                &["browser", "profiles", "chrome", "enabled"],
                json!(true),
            );
            
            write_config(&config)?;
            
            match install_result {
                Ok(_) => Ok("브라우저 제어가 활성화되었습니다. Chrome 확장 프로그램을 설치해주세요.".to_string()),
                Err(e) => {
                    // 실패해도 설정은 저장됨
                    Ok(format!("브라우저 제어 서버 설치는 실패했지만 설정은 완료되었습니다. 나중에 수동으로 설치할 수 있습니다: {}", e))
                }
            }
        }
        Err(e) => {
            eprintln!("브라우저 상태 확인 실패: {}", e);
            
            // 그래도 설정은 저장
            let mut config = read_existing_config();
            if !config.get("browser").is_some() {
                set_nested_value(&mut config, &["browser"], json!({}));
            }
            set_nested_value(&mut config, &["browser", "target"], json!("host"));
            set_nested_value(&mut config, &["browser", "profiles", "chrome", "enabled"], json!(true));
            write_config(&config)?;
            
            Ok("브라우저 설정이 저장되었습니다. OpenClaw를 다시 시작한 후 브라우저 제어를 사용할 수 있습니다.".to_string())
        }
    }
}
