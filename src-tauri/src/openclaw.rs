use std::process::Command;
use std::path::PathBuf;
use std::fs;
use serde_json::{json, Value};
use chrono::Utc;

// Device Identity 생성에 필요한 imports
use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;
use sha2::{Sha256, Digest};
use base64::{engine::general_purpose::STANDARD, Engine};

/// OpenClaw 버전 (config meta에 사용)
const OPENCLAW_VERSION: &str = "2026.2.10";

/// OpenClaw 명령 실행 헬퍼 (시스템 PATH 사용)
fn run_openclaw_command(args: &[&str]) -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new("cmd")
            .args(["/C", &format!("openclaw {}", args.join(" "))])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("openclaw 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(format!("openclaw 오류: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new("openclaw")
            .args(args)
            .output()
            .map_err(|e| format!("openclaw 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(format!("openclaw 오류: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
}

/// OpenClaw 버전 확인
pub fn get_openclaw_version_sync() -> Option<String> {
    run_openclaw_command(&["--version"]).ok()
}

/// 채널 플러그인 활성화 (Discord 제외 - 기본 활성화)
/// Telegram, WhatsApp, Signal 등은 먼저 plugins enable 필요
pub fn enable_channel_plugin(channel: &str) -> Result<(), String> {
    // Discord만 기본 활성화되어 있어 skip
    // WhatsApp은 plugins enable 필요 (multi-account 구조지만 플러그인 자체는 활성화 필요)
    if channel == "discord" {
        return Ok(());
    }
    
    run_openclaw_command(&["plugins", "enable", channel])
        .map(|_| ())
        .map_err(|e| format!("플러그인 활성화 실패 ({}): {}", channel, e))
}

/// 채널 추가 (openclaw channels add --channel <name>)
pub fn add_channel(channel: &str) -> Result<(), String> {
    run_openclaw_command(&["channels", "add", "--channel", channel])
        .map(|_| ())
        .map_err(|e| format!("채널 추가 실패 ({}): {}", channel, e))
}

/// Windows CMD 실행 헬퍼 (CREATE_NO_WINDOW 플래그 포함)
#[cfg(windows)]
fn run_cmd_silent(args: &[&str]) -> std::io::Result<std::process::Output> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    std::process::Command::new("cmd")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
}

#[cfg(not(windows))]
fn run_cmd_silent(args: &[&str]) -> std::io::Result<std::process::Output> {
    std::process::Command::new("sh")
        .args(["-c", &args[1..].join(" ")])
        .output()
}

/// OpenClaw 설치 (npm install -g openclaw)
pub async fn install_openclaw() -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new("cmd")
            .args(["/C", "npm install -g openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw 설치 완료!".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new("npm")
            .args(["install", "-g", "openclaw"])
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw 설치 완료!".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
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

/// Identity 디렉토리 경로
fn get_identity_dir() -> PathBuf {
    get_openclaw_dir().join("identity")
}

/// Device Identity 파일 경로
fn get_device_identity_path() -> PathBuf {
    get_identity_dir().join("device.json")
}

// =============================================================================
// Device Identity 생성 (OpenClaw 공식 형식 준수)
// 참조: DEVICE_IDENTITY_SPEC.md
// =============================================================================

/// Ed25519 SPKI prefix (RFC 8410)
const ED25519_SPKI_PREFIX: [u8; 12] = [
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
];

/// Ed25519 PKCS#8 prefix
const ED25519_PKCS8_PREFIX: [u8; 16] = [
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20
];

/// Device Identity 구조체
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceIdentity {
    pub version: u8,
    pub device_id: String,
    pub public_key_pem: String,
    pub private_key_pem: String,
    pub created_at_ms: u64,
}

/// 새 Device Identity 생성 (Ed25519 키 쌍)
fn generate_device_identity() -> DeviceIdentity {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();
    
    // Public key를 SPKI 형식으로 인코딩
    let public_bytes = verifying_key.as_bytes();
    let mut spki = Vec::with_capacity(ED25519_SPKI_PREFIX.len() + 32);
    spki.extend_from_slice(&ED25519_SPKI_PREFIX);
    spki.extend_from_slice(public_bytes);
    let public_key_pem = format!(
        "-----BEGIN PUBLIC KEY-----\n{}\n-----END PUBLIC KEY-----\n",
        STANDARD.encode(&spki)
    );
    
    // Private key를 PKCS#8 형식으로 인코딩
    let private_bytes = signing_key.to_bytes();
    let mut pkcs8 = Vec::with_capacity(ED25519_PKCS8_PREFIX.len() + 32);
    pkcs8.extend_from_slice(&ED25519_PKCS8_PREFIX);
    pkcs8.extend_from_slice(&private_bytes);
    let private_key_pem = format!(
        "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----\n",
        STANDARD.encode(&pkcs8)
    );
    
    // deviceId = SHA256(raw public key bytes) → hex
    let mut hasher = Sha256::new();
    hasher.update(public_bytes);
    let device_id = hex::encode(hasher.finalize());
    
    let created_at_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    DeviceIdentity {
        version: 1,
        device_id,
        public_key_pem,
        private_key_pem,
        created_at_ms,
    }
}

/// 기존 Device Identity 읽기 (없거나 유효하지 않으면 None)
fn read_existing_device_identity() -> Option<DeviceIdentity> {
    let path = get_device_identity_path();
    if !path.exists() {
        return None;
    }
    
    let content = fs::read_to_string(&path).ok()?;
    let identity: DeviceIdentity = serde_json::from_str(&content).ok()?;
    
    // 버전 확인
    if identity.version != 1 {
        return None;
    }
    
    // 필수 필드 확인
    if identity.device_id.is_empty() 
        || identity.public_key_pem.is_empty() 
        || identity.private_key_pem.is_empty() 
    {
        return None;
    }
    
    Some(identity)
}

/// Device Identity 저장 (권한 0o600)
fn write_device_identity(identity: &DeviceIdentity) -> Result<(), String> {
    let identity_dir = get_identity_dir();
    fs::create_dir_all(&identity_dir)
        .map_err(|e| format!("identity 디렉토리 생성 실패: {}", e))?;
    
    let path = get_device_identity_path();
    let content = serde_json::to_string_pretty(identity)
        .map_err(|e| format!("JSON 직렬화 실패: {}", e))?;
    
    fs::write(&path, &content)
        .map_err(|e| format!("device.json 저장 실패: {}", e))?;
    
    // Unix에서 파일 권한 설정 (Windows는 무시)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
    }
    
    Ok(())
}

/// Device Identity 확보 (기존 것 사용 또는 새로 생성)
pub fn ensure_device_identity() -> Result<DeviceIdentity, String> {
    // 1. 기존 identity 확인
    if let Some(existing) = read_existing_device_identity() {
        return Ok(existing);
    }
    
    // 2. 새로 생성
    let identity = generate_device_identity();
    write_device_identity(&identity)?;
    
    Ok(identity)
}

// =============================================================================
// 공식 Config 생성 (OpenClaw onboard 형식 준수)
// 참조: OPENCLAW_CONFIG_SPEC.md
// =============================================================================

/// Gateway 토큰 생성 (32바이트 랜덤 → base64url)
pub fn generate_gateway_token() -> String {
    use rand::Rng;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/// 공식 형식의 기본 Config 구조 생성
/// OpenClaw onboard가 생성하는 것과 동일한 형식
fn create_base_config(
    gateway_port: u16,
    gateway_bind: &str,
    gateway_token: &str,
) -> Value {
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let workspace_path = get_workspace_dir();
    let workspace_str = workspace_path.to_string_lossy().to_string();
    
    json!({
        // 메타데이터 (OpenClaw 자동 관리 필드)
        "meta": {
            "lastTouchedVersion": OPENCLAW_VERSION,
            "lastTouchedAt": now
        },
        
        // 온보딩 정보
        "wizard": {
            "lastRunAt": now,
            "lastRunVersion": OPENCLAW_VERSION,
            "lastRunCommand": "onboard",
            "lastRunMode": "local"
        },
        
        // Gateway 설정 (필수!)
        "gateway": {
            "mode": "local",              // 필수: 로컬 실행 모드
            "port": gateway_port,
            "bind": gateway_bind,
            "auth": {
                "mode": "token",
                "token": gateway_token
            },
            // 위험한 노드 명령어 거부 목록 (OpenClaw 기본값)
            "nodes": {
                "denyCommands": [
                    "camera.snap",
                    "camera.clip",
                    "screen.record",
                    "calendar.add",
                    "contacts.add",
                    "reminders.add"
                ]
            }
        },
        
        // 에이전트 기본 설정
        "agents": {
            "defaults": {
                "workspace": workspace_str
            }
        }
    })
}

/// 공식 형식으로 Config 생성/업데이트
/// - 기존 config가 없으면: 새로 생성
/// - 기존 config가 있으면: 필수 필드만 업데이트 (기존 설정 보존)
/// Device Identity도 함께 확보
pub async fn create_official_config(
    gateway_port: u16,
    gateway_bind: &str,
) -> Result<String, String> {
    // 1. Device Identity 확보 (가장 먼저!)
    ensure_device_identity()?;
    
    // 2. 기존 config 읽기
    let mut config = read_existing_config();
    let is_new_config = config.as_object().map(|o| o.is_empty()).unwrap_or(true);
    
    // 3. Gateway 토큰 생성 또는 기존 값 사용
    let gateway_token = config
        .get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .filter(|t| !t.is_empty())
        .map(String::from)
        .unwrap_or_else(generate_gateway_token);
    
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let workspace_path = get_workspace_dir();
    let workspace_str = workspace_path.to_string_lossy().to_string();
    
    if is_new_config {
        // 4a. 새 config 생성 (첫 실행)
        config = create_base_config(gateway_port, gateway_bind, &gateway_token);
    } else {
        // 4b. 기존 config 업데이트 (필수 필드만, 기존 설정 보존)
        
        // meta 업데이트
        set_nested_value(&mut config, &["meta", "lastTouchedVersion"], json!(OPENCLAW_VERSION));
        set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
        
        // wizard 업데이트
        set_nested_value(&mut config, &["wizard", "lastRunAt"], json!(now));
        set_nested_value(&mut config, &["wizard", "lastRunVersion"], json!(OPENCLAW_VERSION));
        set_nested_value(&mut config, &["wizard", "lastRunCommand"], json!("onboard"));
        set_nested_value(&mut config, &["wizard", "lastRunMode"], json!("local"));
        
        // gateway 필수 설정 (mode는 반드시 local이어야 함)
        set_nested_value(&mut config, &["gateway", "mode"], json!("local"));
        set_nested_value(&mut config, &["gateway", "port"], json!(gateway_port));
        set_nested_value(&mut config, &["gateway", "bind"], json!(gateway_bind));
        set_nested_value(&mut config, &["gateway", "auth", "mode"], json!("token"));
        set_nested_value(&mut config, &["gateway", "auth", "token"], json!(gateway_token));
        
        // workspace 설정 (없으면 추가)
        if config.get("agents")
            .and_then(|a| a.get("defaults"))
            .and_then(|d| d.get("workspace"))
            .is_none()
        {
            set_nested_value(&mut config, &["agents", "defaults", "workspace"], json!(workspace_str));
        }
        
        // 위험한 노드 명령어 거부 목록 (없으면 추가)
        if config.get("gateway")
            .and_then(|g| g.get("nodes"))
            .and_then(|n| n.get("denyCommands"))
            .is_none()
        {
            set_nested_value(&mut config, &["gateway", "nodes", "denyCommands"], json!([
                "camera.snap",
                "camera.clip",
                "screen.record",
                "calendar.add",
                "contacts.add",
                "reminders.add"
            ]));
        }
    }
    
    // 5. 설정 저장
    write_config(&config)?;
    
    // 6. 워크스페이스 초기화
    initialize_workspace().await?;
    
    Ok(gateway_token)
}

// =============================================================================
// API 키/토큰 자동 감지 (OpenClaw 공식 형식 준수)
// =============================================================================

/// API 키/토큰 형식에 따라 auth.profiles.mode 자동 결정
/// 
/// ## 토큰 형식별 mode:
/// - Anthropic OAuth 토큰: `sk-ant-oat01-xxx` (80자+) → "token"
/// - Anthropic API 키: `sk-ant-api-xxx` 등 → "api_key"  
/// - OpenAI API 키: `sk-xxx`, `sk-proj-xxx` → "api_key"
/// - Google API 키: `AIza...` → "api_key"
/// - 기타 모든 경우 → "api_key" (기본값)
fn detect_auth_mode(provider: &str, api_key: &str) -> &'static str {
    match provider {
        "anthropic" => {
            // Anthropic OAuth 토큰: sk-ant-oat01- (최소 80자)
            if api_key.starts_with("sk-ant-oat01-") && api_key.len() >= 80 {
                "token"
            } else {
                "api_key"
            }
        }
        // OpenAI, Google 등 다른 프로바이더는 모두 api_key
        _ => "api_key"
    }
}

/// Config에 모델 설정 추가 (기존 설정 보존)
pub async fn add_model_to_config(
    provider: &str,
    model: &str,
    api_key: &str,
) -> Result<(), String> {
    let mut config = read_existing_config();
    
    // 기존 config가 없으면 기본 config 먼저 생성
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다. 먼저 create_official_config를 호출하세요.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    set_nested_value(&mut config, &["meta", "lastTouchedVersion"], json!(OPENCLAW_VERSION));
    
    // wizard 정보 업데이트
    set_nested_value(&mut config, &["wizard", "lastRunAt"], json!(now));
    set_nested_value(&mut config, &["wizard", "lastRunCommand"], json!("configure"));
    
    // 모델 프로바이더 설정
    // API 키가 비어있으면 기존 값 유지 (재설정 시 키 증발 방지)
    if !api_key.is_empty() {
        set_nested_value(
            &mut config,
            &["models", "providers", provider, "apiKey"],
            json!(api_key),
        );
    }
    
    // 프로바이더별 baseUrl 설정
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
                json!("https://generativelanguage.googleapis.com/v1beta"),
            );
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "api"],
                json!("google-generative-ai"),
            );
        }
        _ => {}
    }
    
    // 모델 정보 추가
    let model_info = create_model_info(model);
    set_nested_value(
        &mut config,
        &["models", "providers", provider, "models"],
        json!([model_info]),
    );
    
    // agents.defaults.model.primary 설정
    let model_string = format!("{}/{}", provider, model);
    set_nested_value(
        &mut config,
        &["agents", "defaults", "model", "primary"],
        json!(model_string),
    );
    
    // auth.profiles 추가
    // 토큰 형식에 따라 mode 자동 결정
    let auth_mode = detect_auth_mode(provider, api_key);
    let profile_id = format!("{}:default", provider);
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "provider"],
        json!(provider),
    );
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "mode"],
        json!(auth_mode),
    );
    
    write_config(&config)?;
    Ok(())
}

/// 모델 정보 JSON 생성
fn create_model_info(model: &str) -> Value {
    match model {
        "claude-sonnet-4-20250514" => json!({
            "id": "claude-sonnet-4-20250514",
            "name": "Claude Sonnet 4",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
        }),
        "claude-haiku-4-5-20251001" => json!({
            "id": "claude-haiku-4-5-20251001", 
            "name": "Claude Haiku 4.5",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
        }),
        "claude-opus-4-20250514" => json!({
            "id": "claude-opus-4-20250514",
            "name": "Claude Opus 4",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
        }),
        "gpt-4o" => json!({
            "id": "gpt-4o",
            "name": "GPT-4o",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 16384
        }),
        "gpt-4o-mini" => json!({
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 16384
        }),
        _ => json!({
            "id": model,
            "name": model,
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 8192
        })
    }
}

/// 채널(메신저) 설정 추가 (기존 설정 보존)
pub async fn add_channel_to_config(
    channel: &str,
    bot_token: &str,
    dm_policy: &str,
    allow_from: &[String],
    group_policy: &str,
    require_mention: bool,
) -> Result<(), String> {
    let mut config = read_existing_config();
    
    // 기존 config가 없으면 에러
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다. 먼저 create_official_config를 호출하세요.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // 채널별 설정
    match channel {
        "telegram" => {
            // Telegram은 botToken 사용 (OpenClaw 공식 형식)
            set_nested_value(
                &mut config,
                &["channels", "telegram", "enabled"],
                json!(true),
            );
            // 토큰이 비어있으면 기존 값 유지
            if !bot_token.is_empty() {
                set_nested_value(
                    &mut config,
                    &["channels", "telegram", "botToken"],
                    json!(bot_token),
                );
            }
            set_nested_value(
                &mut config,
                &["channels", "telegram", "dmPolicy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "telegram", "allowFrom"],
                json!(allow_from),
            );
            set_nested_value(
                &mut config,
                &["channels", "telegram", "groupPolicy"],
                json!(group_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "telegram", "groups", "*", "requireMention"],
                json!(require_mention),
            );
        }
        "discord" => {
            // Discord는 "token" 사용 (botToken 아님!)
            set_nested_value(
                &mut config,
                &["channels", "discord", "enabled"],
                json!(true),
            );
            // 토큰이 비어있으면 기존 값 유지
            if !bot_token.is_empty() {
                set_nested_value(
                    &mut config,
                    &["channels", "discord", "token"],
                    json!(bot_token),
                );
            }
            set_nested_value(
                &mut config,
                &["channels", "discord", "groupPolicy"],
                json!(group_policy),
            );
            // DM 설정
            set_nested_value(
                &mut config,
                &["channels", "discord", "dm", "enabled"],
                json!(true),
            );
            set_nested_value(
                &mut config,
                &["channels", "discord", "dm", "policy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "discord", "dm", "allowFrom"],
                json!(allow_from),
            );
            // Guild 설정
            set_nested_value(
                &mut config,
                &["channels", "discord", "guilds", "*", "requireMention"],
                json!(require_mention),
            );
        }
        "whatsapp" => {
            // WhatsApp은 accounts 구조 사용 (OpenClaw 공식 형식)
            // 토큰 없음 - QR 인증 사용
            set_nested_value(
                &mut config,
                &["channels", "whatsapp", "accounts", "default", "enabled"],
                json!(true),
            );
            set_nested_value(
                &mut config,
                &["channels", "whatsapp", "accounts", "default", "dmPolicy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "whatsapp", "accounts", "default", "allowFrom"],
                json!(allow_from),
            );
            set_nested_value(
                &mut config,
                &["channels", "whatsapp", "accounts", "default", "groupPolicy"],
                json!(group_policy),
            );
        }
        "slack" => {
            // Slack은 botToken + appToken 필요
            set_nested_value(
                &mut config,
                &["channels", "slack", "enabled"],
                json!(true),
            );
            // botToken (bot_token 파라미터 사용)
            if !bot_token.is_empty() {
                set_nested_value(
                    &mut config,
                    &["channels", "slack", "botToken"],
                    json!(bot_token),
                );
            }
            set_nested_value(
                &mut config,
                &["channels", "slack", "groupPolicy"],
                json!(group_policy),
            );
            // DM 설정
            set_nested_value(
                &mut config,
                &["channels", "slack", "dm", "policy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "slack", "dm", "allowFrom"],
                json!(allow_from),
            );
            set_nested_value(
                &mut config,
                &["channels", "slack", "requireMention"],
                json!(require_mention),
            );
        }
        "googlechat" => {
            // Google Chat은 Service Account 필요 (별도 처리)
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "enabled"],
                json!(true),
            );
            // DM 설정 (중첩 구조 - OpenClaw 공식 스키마)
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "dm", "enabled"],
                json!(true),
            );
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "dm", "policy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "dm", "allowFrom"],
                json!(allow_from),
            );
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "groupPolicy"],
                json!(group_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "googlechat", "requireMention"],
                json!(require_mention),
            );
        }
        "mattermost" => {
            // Mattermost는 url + botToken 필요
            set_nested_value(
                &mut config,
                &["channels", "mattermost", "enabled"],
                json!(true),
            );
            if !bot_token.is_empty() {
                set_nested_value(
                    &mut config,
                    &["channels", "mattermost", "botToken"],
                    json!(bot_token),
                );
            }
            set_nested_value(
                &mut config,
                &["channels", "mattermost", "dmPolicy"],
                json!(dm_policy),
            );
            set_nested_value(
                &mut config,
                &["channels", "mattermost", "allowFrom"],
                json!(allow_from),
            );
            set_nested_value(
                &mut config,
                &["channels", "mattermost", "groupPolicy"],
                json!(group_policy),
            );
        }
        _ => {}
    }
    
    write_config(&config)?;
    Ok(())
}

/// 기존 설정 읽기 (없으면 빈 객체)
pub fn read_existing_config() -> Value {
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
                json!("https://generativelanguage.googleapis.com/v1beta"),
            );
            set_nested_value(
                &mut config,
                &["models", "providers", provider, "api"],
                json!("google-generative-ai"),
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

    // auth.profiles 추가 (토큰 형식에 따라 mode 자동 결정)
    let auth_mode = detect_auth_mode(provider, api_key);
    let profile_id = format!("{}:default", provider);
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "provider"],
        json!(provider),
    );
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "mode"],
        json!(auth_mode),
    );

    write_config(&config)?;
    Ok(())
}

/// Gateway 설정 (포트, 바인드, 인증)
pub async fn configure_gateway(port: u16, bind: &str, auth_token: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    // gateway.mode: local (로컬 실행 모드 - 필수!)
    set_nested_value(&mut config, &["gateway", "mode"], json!("local"));
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

    // gateway.mode: local (로컬 실행 모드 - 필수!)
    set_nested_value(&mut config, &["gateway", "mode"], json!("local"));
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

## ⏰ Reminders & Scheduling (중요!)

알림, 리마인더, 예약 작업은 **반드시 OpenClaw cron job**을 사용하세요.

### 필수 규칙:
- ✅ **cron 도구 사용**: 모든 알림/리마인더는 `cron` 도구로 예약
- ❌ **Windows 스케줄러 사용 금지**: OS 스케줄러 직접 사용하지 마세요
- ❌ **Heartbeat으로 리마인더 구현 금지**: heartbeat은 주기적 체크용, 리마인더용 아님

### 예시:
- "내일 9시에 알려줘" → `cron` 도구로 예약
- "30분 후에 리마인드" → `cron` 도구로 예약
- "매일 아침 날씨 알려줘" → `cron` 도구로 반복 작업 설정

이 규칙을 따르면 moldClaw UI에서 알림을 관리할 수 있습니다.
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
    // 1. 플러그인 활성화 (Discord 제외한 채널은 필수)
    enable_channel_plugin("telegram")?;
    
    // 2. 채널 추가 (openclaw channels add --channel telegram)
    add_channel("telegram")?;
    
    // 3. Config 설정
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "telegram", "enabled"], json!(true));
    // 토큰이 비어있으면 기존 값 유지
    if !token.is_empty() {
        set_nested_value(&mut config, &["channels", "telegram", "botToken"], json!(token));
    }
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
    // 1. 플러그인 활성화
    enable_channel_plugin("telegram")?;
    
    // 2. 채널 추가
    add_channel("telegram")?;
    
    // 3. Config 설정
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "telegram", "enabled"], json!(true));
    // 토큰이 비어있으면 기존 값 유지
    if !token.is_empty() {
        set_nested_value(&mut config, &["channels", "telegram", "botToken"], json!(token));
    }
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
/// 공식 문서: channels.discord.dm.policy, channels.discord.dm.allowFrom
pub async fn configure_discord(token: &str, dm_policy: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "discord", "enabled"], json!(true));
    // 토큰이 비어있으면 기존 값 유지
    if !token.is_empty() {
        set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
    }
    set_nested_value(&mut config, &["channels", "discord", "dm", "enabled"], json!(true));
    set_nested_value(&mut config, &["channels", "discord", "dm", "policy"], json!(dm_policy));
    
    // allowFrom 설정 (open일 때는 ["*"])
    if dm_policy == "open" {
        set_nested_value(&mut config, &["channels", "discord", "dm", "allowFrom"], json!(["*"]));
    }

    write_config(&config)?;
    Ok(())
}

/// Discord 전체 설정
/// 공식 문서 형식:
/// - channels.discord.dm.policy
/// - channels.discord.dm.allowFrom
/// - channels.discord.guilds.*
pub async fn configure_discord_full(
    token: &str,
    dm_policy: &str,
    allow_from: Vec<String>,
    _group_policy: &str,  // Discord는 guilds로 관리
    _group_allow_from: Vec<String>,  // 미사용
    require_mention: bool,
) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "discord", "enabled"], json!(true));
    // 토큰이 비어있으면 기존 값 유지
    if !token.is_empty() {
        set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
    }
    set_nested_value(&mut config, &["channels", "discord", "dm", "enabled"], json!(true));
    set_nested_value(&mut config, &["channels", "discord", "dm", "policy"], json!(dm_policy));
    
    // dm.allowFrom 설정
    if dm_policy == "open" {
        set_nested_value(&mut config, &["channels", "discord", "dm", "allowFrom"], json!(["*"]));
    } else if !allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "discord", "dm", "allowFrom"], json!(allow_from));
    }
    
    // guilds 설정 (Discord 그룹은 guilds로 관리)
    set_nested_value(&mut config, &["channels", "discord", "guilds", "*", "requireMention"], json!(require_mention));

    write_config(&config)?;
    Ok(())
}

/// WhatsApp 설정 (페어링 모드)
/// WhatsApp은 QR 코드 페어링 방식 (토큰 없음)
pub async fn configure_whatsapp(dm_policy: &str) -> Result<(), String> {
    // 1. 플러그인 활성화 (WhatsApp은 기본 비활성화)
    enable_channel_plugin("whatsapp")?;
    
    // 2. 채널 추가 (openclaw channels add --channel whatsapp)
    add_channel("whatsapp")?;
    
    // 3. Config 설정 (multi-account 구조 사용)
    let mut config = read_existing_config();

    // WhatsApp은 multi-account 구조: channels.whatsapp.accounts.default
    set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "enabled"], json!(true));
    set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "dmPolicy"], json!(dm_policy));

    // 기본 그룹 설정 (멘션 필요)
    set_nested_value(
        &mut config,
        &["channels", "whatsapp", "accounts", "default", "groups", "*", "requireMention"],
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
    // 1. 플러그인 활성화
    enable_channel_plugin("whatsapp")?;
    
    // 2. 채널 추가
    add_channel("whatsapp")?;
    
    // 3. Config 설정 (multi-account 구조 사용)
    let mut config = read_existing_config();

    // WhatsApp은 multi-account 구조: channels.whatsapp.accounts.default
    set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "enabled"], json!(true));
    set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "dmPolicy"], json!(dm_policy));
    
    // allowFrom
    if !allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "allowFrom"], json!(allow_from));
    }
    
    // 그룹 정책 (최상위 레벨)
    set_nested_value(&mut config, &["channels", "whatsapp", "groupPolicy"], json!(group_policy));
    
    // groupAllowFrom
    if !group_allow_from.is_empty() {
        set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupAllowFrom"], json!(group_allow_from));
    }
    
    // 그룹 설정
    set_nested_value(
        &mut config,
        &["channels", "whatsapp", "accounts", "default", "groups", "*", "requireMention"],
        json!(require_mention),
    );

    write_config(&config)?;
    Ok(())
}

/// Gateway 시작 (Windows: cmd 경유로 숨김 창 실행)
pub async fn start_gateway() -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // 중요: 'openclaw'만 쓰면 .ps1이 메모장에서 열림
        // cmd /C 경유로 실행해야 openclaw.cmd가 실행됨
        let ps_command = r#"
            Start-Process -FilePath 'cmd' -ArgumentList '/C', 'openclaw gateway' -WindowStyle Hidden
        "#;
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_command])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Gateway 시작 실패: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Gateway 시작 실패: {}", stderr));
        }
        
        Ok(())
    }
    
    #[cfg(not(windows))]
    {
        // Unix: nohup으로 백그라운드 실행
        let output = Command::new("sh")
            .args(["-c", "nohup openclaw gateway > /dev/null 2>&1 &"])
            .output()
            .map_err(|e| format!("Gateway 시작 실패: {}", e))?;
        
        if !output.status.success() {
            return Err("Gateway 시작 실패".to_string());
        }
        
        Ok(())
    }
}

/// Gateway 시작 (foreground 모드 - service 불필요)
pub async fn install_and_start_service() -> Result<String, String> {
    // 1. 먼저 상태 확인 - 이미 실행 중이면 OK
    if let Ok(status) = get_status().await {
        if status == "running" {
            return Ok("Gateway가 이미 실행 중입니다".to_string());
        }
    }
    
    // 2. Gateway 시작
    start_gateway().await?;
    
    // 3. 상태 확인 (최대 15초 대기 - Gateway 시작에 10초 정도 걸림)
    for i in 0..15 {
        std::thread::sleep(std::time::Duration::from_millis(1000));
        if let Ok(status) = get_status().await {
            if status == "running" {
                return Ok("Gateway가 시작되었습니다".to_string());
            }
        }
    }
    
    Err("Gateway 시작에 실패했습니다. 다시 시도해주세요.".to_string())
}

/// Gateway 상태 확인 (Rust 네이티브 TCP 연결 - 가장 빠르고 신뢰성 높음)
pub async fn get_status() -> Result<String, String> {
    use std::net::TcpStream;
    use std::time::Duration;
    
    let port = get_gateway_port();
    let addr = format!("127.0.0.1:{}", port);
    
    eprintln!("[get_status] Checking port {} with addr: {}", port, addr);
    
    // TCP 연결 시도 (타임아웃 1초)
    match TcpStream::connect_timeout(
        &addr.parse().unwrap(),
        Duration::from_secs(1)
    ) {
        Ok(_) => {
            eprintln!("[get_status] Connection SUCCESS -> running");
            Ok("running".to_string())
        },
        Err(e) => {
            eprintln!("[get_status] Connection FAILED: {} -> stopped", e);
            Ok("stopped".to_string())
        },
    }
}

/// WhatsApp 페어링 시작 (onboard 명령 사용) - 레거시
pub async fn start_whatsapp_pairing() -> Result<String, String> {
    // OpenClaw onboard를 non-interactive로 실행하고 WhatsApp 설정
    run_openclaw_command(&[
        "onboard",
        "--non-interactive",
        "--accept-risk",
        "--flow", "quickstart",
        "--skip-channels",
        "--skip-skills",
        "--skip-health",
    ])
    .map(|_| "WhatsApp 연결 준비 완료. QR 코드를 확인하세요.".to_string())
}

/// WhatsApp QR 로그인 (openclaw channels login)
/// 터미널 창에서 QR 코드를 표시하고, 인증 완료까지 대기
pub async fn login_whatsapp() -> Result<String, String> {
    // 1. 플러그인 활성화 (WhatsApp은 기본 비활성화)
    enable_channel_plugin("whatsapp")?;
    
    // 2. 채널 추가 (이미 있으면 무시)
    let _ = add_channel("whatsapp");
    
    // 3. QR 로그인 실행
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;
        
        // 새 콘솔 창에서 실행 (QR 코드 표시용)
        // 에러 시 pause로 메시지 확인 가능
        let mut child = Command::new("cmd")
            .args(["/C", "openclaw channels login --channel whatsapp || (echo. && echo [오류 발생] 위 메시지를 확인하세요 && pause)"])
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
            .map_err(|e| format!("WhatsApp 로그인 실행 실패: {}", e))?;
        
        // 프로세스 완료 대기 (사용자가 QR 스캔할 때까지)
        let status = child.wait()
            .map_err(|e| format!("프로세스 대기 실패: {}", e))?;
        
        if status.success() {
            Ok("WhatsApp 인증 완료!".to_string())
        } else {
            Err("WhatsApp 인증이 취소되었거나 실패했습니다. 콘솔 창의 오류 메시지를 확인하세요.".to_string())
        }
    }
    
    #[cfg(not(windows))]
    {
        // Linux/Mac: 새 터미널 창에서 실행
        // 각 터미널의 "명령 완료까지 대기" 옵션 사용
        let terminals = [
            // gnome-terminal: --wait 옵션으로 명령 완료까지 대기
            ("gnome-terminal", vec!["--wait", "--", "openclaw", "channels", "login", "--channel", "whatsapp"]),
            // konsole: --hold로 창 유지, -e로 명령 실행
            ("konsole", vec!["--hold", "-e", "openclaw", "channels", "login", "--channel", "whatsapp"]),
            // xfce4-terminal: --hold로 창 유지
            ("xfce4-terminal", vec!["--hold", "-e", "openclaw channels login --channel whatsapp"]),
            // xterm: -hold로 창 유지
            ("xterm", vec!["-hold", "-e", "openclaw", "channels", "login", "--channel", "whatsapp"]),
        ];
        
        for (term, args) in terminals.iter() {
            if let Ok(mut child) = Command::new(term).args(args).spawn() {
                let status = child.wait()
                    .map_err(|e| format!("프로세스 대기 실패: {}", e))?;
                
                if status.success() {
                    return Ok("WhatsApp 인증 완료!".to_string());
                } else {
                    return Err("WhatsApp 인증이 취소되었거나 실패했습니다. 터미널 창이 닫혔다면 다시 시도해주세요.".to_string());
                }
            }
        }
        
        Err("터미널을 찾을 수 없습니다. 수동으로 'openclaw channels login --channel whatsapp'을 실행하세요.".to_string())
    }
}

/// WhatsApp 인증 상태 확인 (creds.json 존재 여부)
pub fn check_whatsapp_linked() -> bool {
    let creds_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("credentials").join("whatsapp").join("default").join("creds.json"))
        .unwrap_or_default();
    
    creds_path.exists() && creds_path.is_file()
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
    
    // 동적 인자 빌드
    let args: Vec<&str> = vec![
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
    ];
    
    run_openclaw_command(&args)
        .map(|output| format!("OpenClaw 설정 완료!\n{}", output))
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
    match run_openclaw_command(&["doctor"]) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Configuration validation failed: {}", e)),
    }
}

/// 현재 설정 요약 가져오기
/// 현재 config를 프론트엔드 FullConfig 형식으로 반환
pub fn get_full_config() -> Value {
    let config = read_existing_config();
    
    // Model 정보 추출
    let model = if let Some(model_str) = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("model"))
    {
        // model이 객체인 경우 (primary 필드)
        let model_id = if let Some(primary) = model_str.get("primary").and_then(|p| p.as_str()) {
            primary.to_string()
        } else if let Some(s) = model_str.as_str() {
            s.to_string()
        } else {
            String::new()
        };
        
        if !model_id.is_empty() {
            // provider 추출 (model_id에서 / 앞 부분)
            let parts: Vec<&str> = model_id.split('/').collect();
            let provider = parts.first().unwrap_or(&"").to_string();
            let model_name = parts.get(1).unwrap_or(&model_id.as_str()).to_string();
            
            // API 키 확인 (auth.profiles에서)
            let has_api_key = config.get("auth")
                .and_then(|a| a.get("profiles"))
                .map(|p| !p.as_object().map(|o| o.is_empty()).unwrap_or(true))
                .unwrap_or(false);
            
            Some(json!({
                "provider": provider,
                "model": model_name,
                "apiKey": if has_api_key { "***" } else { "" }
            }))
        } else {
            None
        }
    } else {
        None
    };
    
    // Messenger 정보 추출
    let messenger = {
        let channels = config.get("channels");
        
        let (msg_type, token, dm_policy, allow_from, group_policy, require_mention) = 
            if let Some(tg) = channels.and_then(|c| c.get("telegram")) {
                (
                    "telegram",
                    tg.get("botToken").and_then(|t| t.as_str()).unwrap_or(""),
                    tg.get("dmPolicy").and_then(|d| d.as_str()).unwrap_or("pairing"),
                    tg.get("allowFrom").and_then(|a| a.as_array()).map(|arr| 
                        arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                    ).unwrap_or_default(),
                    tg.get("groupPolicy").and_then(|g| g.as_str()).unwrap_or("allowlist"),
                    tg.get("groups").and_then(|g| g.get("*")).and_then(|s| s.get("requireMention")).and_then(|r| r.as_bool()).unwrap_or(true),
                )
            } else if let Some(dc) = channels.and_then(|c| c.get("discord")) {
                (
                    "discord",
                    dc.get("token").and_then(|t| t.as_str()).unwrap_or(""),
                    dc.get("dm").and_then(|d| d.get("policy")).and_then(|p| p.as_str()).unwrap_or("pairing"),
                    dc.get("dm").and_then(|d| d.get("allowFrom")).and_then(|a| a.as_array()).map(|arr| 
                        arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                    ).unwrap_or_default(),
                    dc.get("groupPolicy").and_then(|g| g.as_str()).unwrap_or("allowlist"),
                    true, // Discord는 guilds 설정으로 관리
                )
            } else if let Some(wa) = channels.and_then(|c| c.get("whatsapp")) {
                (
                    "whatsapp",
                    "", // WhatsApp은 토큰 없음
                    wa.get("dmPolicy").and_then(|d| d.as_str()).unwrap_or("pairing"),
                    wa.get("allowFrom").and_then(|a| a.as_array()).map(|arr| 
                        arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                    ).unwrap_or_default(),
                    wa.get("groupPolicy").and_then(|g| g.as_str()).unwrap_or("allowlist"),
                    wa.get("groups").and_then(|g| g.get("*")).and_then(|s| s.get("requireMention")).and_then(|r| r.as_bool()).unwrap_or(true),
                )
            } else {
                ("", "", "pairing", vec![], "allowlist", true)
            };
        
        json!({
            "type": if msg_type.is_empty() { Value::Null } else { json!(msg_type) },
            "token": if token.is_empty() { "" } else { "***" },  // 토큰은 마스킹
            "dmPolicy": dm_policy,
            "allowFrom": allow_from,
            "groupPolicy": group_policy,
            "groupAllowFrom": [],
            "requireMention": require_mention
        })
    };
    
    // Gateway 정보
    let gateway = {
        let gw = config.get("gateway");
        json!({
            "port": gw.and_then(|g| g.get("port")).and_then(|p| p.as_u64()).unwrap_or(18789),
            "bind": gw.and_then(|g| g.get("bind")).and_then(|b| b.as_str()).unwrap_or("loopback"),
            "authMode": gw.and_then(|g| g.get("auth")).and_then(|a| a.get("mode")).and_then(|m| m.as_str()).unwrap_or("token"),
            "token": "***",  // 마스킹
            "password": ""
        })
    };
    
    // Integrations (env에서)
    let integrations = config.get("env")
        .and_then(|e| e.get("vars"))
        .cloned()
        .unwrap_or(json!({}));
    
    json!({
        "model": model,
        "messenger": messenger,
        "gateway": gateway,
        "integrations": integrations
    })
}

// ===== 부분 읽기 함수들 (재설정용) =====

/// 현재 모델 설정만 읽기
pub fn get_model_config() -> Value {
    let config = read_existing_config();
    
    if let Some(model_val) = config.get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("model"))
    {
        // model이 객체인 경우 (primary 필드)
        let model_id = if let Some(primary) = model_val.get("primary").and_then(|p| p.as_str()) {
            primary.to_string()
        } else if let Some(s) = model_val.as_str() {
            s.to_string()
        } else {
            return json!(null);
        };
        
        if model_id.is_empty() {
            return json!(null);
        }
        
        // provider/model 파싱
        let parts: Vec<&str> = model_id.split('/').collect();
        let provider = parts.first().unwrap_or(&"").to_string();
        let model_name = if parts.len() > 1 {
            parts[1..].join("/")
        } else {
            model_id.clone()
        };
        
        // API 키 존재 여부
        let has_api_key = config.get("auth")
            .and_then(|a| a.get("profiles"))
            .map(|p| !p.as_object().map(|o| o.is_empty()).unwrap_or(true))
            .unwrap_or(false);
        
        json!({
            "provider": provider,
            "model": model_name,
            "hasApiKey": has_api_key
        })
    } else {
        json!(null)
    }
}

/// 현재 메신저 설정만 읽기
pub fn get_messenger_config() -> Value {
    let config = read_existing_config();
    let channels = config.get("channels");
    
    // Telegram 확인
    if let Some(tg) = channels.and_then(|c| c.get("telegram")) {
        if tg.get("enabled").and_then(|e| e.as_bool()).unwrap_or(true) {
            return json!({
                "type": "telegram",
                "hasToken": tg.get("botToken").and_then(|t| t.as_str()).map(|s| !s.is_empty()).unwrap_or(false),
                "dmPolicy": tg.get("dmPolicy").and_then(|d| d.as_str()).unwrap_or("pairing"),
                "allowFrom": tg.get("allowFrom").and_then(|a| a.as_array()).map(|arr| 
                    arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                ).unwrap_or_default(),
                "groupPolicy": tg.get("groupPolicy").and_then(|g| g.as_str()).unwrap_or("allowlist"),
                "requireMention": tg.get("groups").and_then(|g| g.get("*")).and_then(|s| s.get("requireMention")).and_then(|r| r.as_bool()).unwrap_or(true)
            });
        }
    }
    
    // Discord 확인
    if let Some(dc) = channels.and_then(|c| c.get("discord")) {
        if dc.get("enabled").and_then(|e| e.as_bool()).unwrap_or(true) {
            return json!({
                "type": "discord",
                "hasToken": dc.get("token").and_then(|t| t.as_str()).map(|s| !s.is_empty()).unwrap_or(false),
                "dmPolicy": dc.get("dm").and_then(|d| d.get("policy")).and_then(|p| p.as_str()).unwrap_or("pairing"),
                "allowFrom": dc.get("dm").and_then(|d| d.get("allowFrom")).and_then(|a| a.as_array()).map(|arr| 
                    arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                ).unwrap_or_default(),
                "groupPolicy": dc.get("groupPolicy").and_then(|g| g.as_str()).unwrap_or("allowlist"),
                "requireMention": true
            });
        }
    }
    
    // WhatsApp 확인 (multi-account 구조: accounts.default.enabled)
    if let Some(wa) = channels.and_then(|c| c.get("whatsapp")) {
        // WhatsApp은 accounts.default.enabled를 체크해야 함
        let wa_enabled = wa.get("accounts")
            .and_then(|a| a.get("default"))
            .and_then(|d| d.get("enabled"))
            .and_then(|e| e.as_bool())
            .unwrap_or(false);  // 명시적으로 enabled가 없으면 false
        
        if wa_enabled {
            let default_account = wa.get("accounts").and_then(|a| a.get("default"));
            return json!({
                "type": "whatsapp",
                "hasToken": false,  // WhatsApp은 토큰 없음
                "isLinked": check_whatsapp_linked(),
                "dmPolicy": default_account.and_then(|d| d.get("dmPolicy")).and_then(|p| p.as_str()).unwrap_or("pairing"),
                "allowFrom": default_account.and_then(|d| d.get("allowFrom")).and_then(|a| a.as_array()).map(|arr| 
                    arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                ).unwrap_or_default(),
                "groupPolicy": default_account.and_then(|d| d.get("groupPolicy")).and_then(|g| g.as_str()).unwrap_or("allowlist"),
                "requireMention": default_account.and_then(|d| d.get("groups")).and_then(|g| g.get("*")).and_then(|s| s.get("requireMention")).and_then(|r| r.as_bool()).unwrap_or(true)
            });
        }
    }
    
    json!(null)
}

/// 현재 부가기능(통합) 설정만 읽기
pub fn get_integrations_config() -> Value {
    let config = read_existing_config();
    
    config.get("env")
        .and_then(|e| e.get("vars"))
        .cloned()
        .unwrap_or(json!({}))
}

// ===== 부분 업데이트 함수들 (재설정용) =====

/// 모델 설정만 업데이트 (기존 config에 패치)
pub async fn update_model_config(provider: &str, model: &str, api_key: &str) -> Result<(), String> {
    // 기존 add_model_to_config 재사용
    add_model_to_config(provider, model, api_key).await
}

/// 메신저 설정만 업데이트 (기존 config에 패치)
/// 토큰이 비어있으면 해당 채널을 비활성화 (삭제 모드)
pub async fn update_messenger_config(
    channel: &str,
    token: &str,
    dm_policy: &str,
    allow_from: &[String],
    group_policy: &str,
    group_allow_from: &[String],
    require_mention: bool,
) -> Result<(), String> {
    // 토큰이 비어있으면 삭제(비활성화) 모드
    let is_delete_mode = token.is_empty();
    
    let mut config = read_existing_config();
    
    // config가 없으면 에러
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // 삭제 모드: 해당 채널만 비활성화
    if is_delete_mode {
        match channel {
            "telegram" => {
                set_nested_value(&mut config, &["channels", "telegram", "enabled"], json!(false));
            }
            "discord" => {
                set_nested_value(&mut config, &["channels", "discord", "enabled"], json!(false));
            }
            "whatsapp" => {
                set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "enabled"], json!(false));
            }
            "slack" => {
                set_nested_value(&mut config, &["channels", "slack", "enabled"], json!(false));
            }
            "googlechat" => {
                set_nested_value(&mut config, &["channels", "googlechat", "enabled"], json!(false));
            }
            "mattermost" => {
                set_nested_value(&mut config, &["channels", "mattermost", "enabled"], json!(false));
            }
            _ => {}
        }
        write_config(&config)?;
        return Ok(());
    }
    
    // 활성화 모드: 플러그인 활성화 + 채널 추가 (에러 무시)
    let _ = enable_channel_plugin(channel);
    let _ = add_channel(channel);
    
    // 새 채널 설정
    match channel {
        "telegram" => {
            set_nested_value(&mut config, &["channels", "telegram", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "telegram", "botToken"], json!(token));
            set_nested_value(&mut config, &["channels", "telegram", "dmPolicy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "telegram", "allowFrom"], json!(allow_from));
            }
            set_nested_value(&mut config, &["channels", "telegram", "groupPolicy"], json!(group_policy));
            if !group_allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "telegram", "groupAllowFrom"], json!(group_allow_from));
            }
            set_nested_value(&mut config, &["channels", "telegram", "groups", "*", "requireMention"], json!(require_mention));
        }
        "discord" => {
            set_nested_value(&mut config, &["channels", "discord", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
            set_nested_value(&mut config, &["channels", "discord", "dm", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "discord", "dm", "policy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "discord", "dm", "allowFrom"], json!(allow_from));
            }
            set_nested_value(&mut config, &["channels", "discord", "groupPolicy"], json!(group_policy));
            // Discord는 guilds 설정으로 그룹 허용 목록 관리 (groupAllowFrom은 guilds.*.users로 매핑)
            // 간단한 구현: 전역 guilds.* 설정에 users 추가
            if !group_allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "discord", "guilds", "*", "users"], json!(group_allow_from));
            }
        }
        "whatsapp" => {
            // WhatsApp은 QR 인증 - 토큰 대신 enabled만 설정
            // multi-account 구조: 모든 설정을 accounts.default 레벨에
            set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "dmPolicy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "allowFrom"], json!(allow_from));
            }
            set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groups", "*", "requireMention"], json!(require_mention));
            // groupPolicy도 계정 레벨에 설정 (OpenClaw 스키마 준수)
            set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupPolicy"], json!(group_policy));
            if !group_allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupAllowFrom"], json!(group_allow_from));
            }
        }
        "slack" => {
            set_nested_value(&mut config, &["channels", "slack", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "slack", "botToken"], json!(token));
            set_nested_value(&mut config, &["channels", "slack", "groupPolicy"], json!(group_policy));
            set_nested_value(&mut config, &["channels", "slack", "dm", "policy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "slack", "dm", "allowFrom"], json!(allow_from));
            }
            // Slack은 channels 설정으로 채널 허용 목록 관리
            if !group_allow_from.is_empty() {
                // 각 채널 ID를 channels 설정에 추가
                for channel_id in group_allow_from {
                    set_nested_value(&mut config, &["channels", "slack", "channels", channel_id, "enabled"], json!(true));
                }
            }
            set_nested_value(&mut config, &["channels", "slack", "requireMention"], json!(require_mention));
        }
        "googlechat" => {
            set_nested_value(&mut config, &["channels", "googlechat", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "googlechat", "dm", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "googlechat", "dm", "policy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "googlechat", "dm", "allowFrom"], json!(allow_from));
            }
            set_nested_value(&mut config, &["channels", "googlechat", "groupPolicy"], json!(group_policy));
            if !group_allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "googlechat", "groupAllowFrom"], json!(group_allow_from));
            }
            set_nested_value(&mut config, &["channels", "googlechat", "requireMention"], json!(require_mention));
        }
        "mattermost" => {
            set_nested_value(&mut config, &["channels", "mattermost", "enabled"], json!(true));
            set_nested_value(&mut config, &["channels", "mattermost", "botToken"], json!(token));
            set_nested_value(&mut config, &["channels", "mattermost", "dmPolicy"], json!(dm_policy));
            if !allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "mattermost", "allowFrom"], json!(allow_from));
            }
            set_nested_value(&mut config, &["channels", "mattermost", "groupPolicy"], json!(group_policy));
            if !group_allow_from.is_empty() {
                set_nested_value(&mut config, &["channels", "mattermost", "groupAllowFrom"], json!(group_allow_from));
            }
        }
        _ => return Err(format!("지원하지 않는 채널: {}", channel)),
    }
    
    // 저장
    write_config(&config)?;
    Ok(())
}

/// 부가기능(통합) 설정만 업데이트 (기존 config에 패치)
/// 빈 값("")은 해당 키를 삭제함
pub async fn update_integrations_config(integrations: Value) -> Result<(), String> {
    let mut config = read_existing_config();
    
    // config가 없으면 에러
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // integrations를 env.vars에 머지 (빈 값은 삭제)
    if let Some(vars) = integrations.as_object() {
        for (key, value) in vars {
            if let Some(v) = value.as_str() {
                if v.is_empty() {
                    // 빈 값이면 해당 키 삭제
                    if let Some(env) = config.get_mut("env") {
                        if let Some(env_vars) = env.get_mut("vars") {
                            if let Some(obj) = env_vars.as_object_mut() {
                                obj.remove(key);
                            }
                        }
                    }
                } else {
                    // 값이 있으면 설정
                    set_nested_value(&mut config, &["env", "vars", key], json!(v));
                }
            }
        }
    }
    
    // 저장
    write_config(&config)?;
    Ok(())
}

/// Config 존재 여부 확인
pub fn has_config() -> bool {
    let config = read_existing_config();
    !config.as_object().map(|o| o.is_empty()).unwrap_or(true)
}

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

/// Config에서 Gateway 토큰 읽기
pub fn get_gateway_token() -> Option<String> {
    let config = read_existing_config();
    config.get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

/// Gateway 포트 읽기 (기본값: 18789)
pub fn get_gateway_port() -> u16 {
    let config = read_existing_config();
    config.get("gateway")
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
        .map(|p| p as u16)
        .unwrap_or(18789)
}

/// Dashboard URL 생성 (토큰 포함)
pub fn get_dashboard_url() -> String {
    let port = get_gateway_port();
    let base_url = format!("http://127.0.0.1:{}", port);
    
    if let Some(token) = get_gateway_token() {
        format!("{}/#token={}", base_url, token)
    } else {
        base_url
    }
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

/// Gateway 중지 (foreground 프로세스 직접 종료)
pub async fn stop_gateway() -> Result<(), String> {
    // gateway status로 실행 중인지 확인
    let status = get_status().await?;
    if status != "running" {
        eprintln!("Gateway already stopped");
        return Ok(());
    }

    let port = get_gateway_port();
    eprintln!("Stopping gateway on port {}...", port);

    // foreground 프로세스는 `gateway stop`으로 안 멈춤
    // 직접 포트 사용 프로세스를 종료해야 함

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // 방법 1: Get-NetTCPConnection으로 PID 찾아서 종료
        // 주의: $pid는 PowerShell 예약 변수이므로 $processId 사용
        let ps_cmd = format!(
            r#"
            $found = $false
            $connections = Get-NetTCPConnection -LocalPort {} -State Listen -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {{
                $processId = $conn.OwningProcess
                if ($processId -gt 0) {{
                    Write-Host "Killing PID: $processId"
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $found = $true
                }}
            }}
            if (-not $found) {{
                # Fallback: netstat로 PID 찾기
                $output = netstat -ano | findstr "LISTENING" | findstr ":{} "
                foreach ($line in $output -split "`n") {{
                    if ($line -match '\s+(\d+)\s*$') {{
                        $processId = $Matches[1]
                        if ($processId -gt 0) {{
                            Write-Host "Killing PID from netstat: $processId"
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        }}
                    }}
                }}
            }}
            "#,
            port, port
        );
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            eprintln!("Stop output: {}", stdout);
            if !stderr.is_empty() {
                eprintln!("Stop stderr: {}", stderr);
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        // Unix: 포트 사용 프로세스 찾아서 종료
        let kill_cmd = format!(
            "lsof -ti :{} | xargs -r kill -9 2>/dev/null || fuser -k {}/tcp 2>/dev/null",
            port, port
        );
        
        let _ = Command::new("sh")
            .args(["-c", &kill_cmd])
            .output();
    }

    // 2초 대기 후 확인
    std::thread::sleep(std::time::Duration::from_millis(2000));
    let final_status = get_status().await?;
    if final_status != "running" {
        eprintln!("Gateway stopped successfully");
        Ok(())
    } else {
        Err("Gateway 종료 실패".to_string())
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


/// 실제 설치 경로 반환 (npm global)
pub async fn get_install_path() -> Result<String, String> {
    #[cfg(windows)]
    {
        // Windows: npm global prefix 확인
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new("cmd")
            .args(["/C", "npm config get prefix"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("npm 경로 확인 실패: {}", e))?;
        
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(format!("{}\\node_modules\\openclaw", prefix))
        } else {
            // 기본 경로 반환 (APPDATA 환경변수 사용)
            let appdata = std::env::var("APPDATA")
                .unwrap_or_else(|_| {
                    let userprofile = std::env::var("USERPROFILE")
                        .unwrap_or_else(|_| "C:\\Users\\Default".to_string());
                    format!("{}\\AppData\\Roaming", userprofile)
                });
            Ok(format!("{}\\npm\\node_modules\\openclaw", appdata))
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new("npm")
            .args(["config", "get", "prefix"])
            .output()
            .map_err(|e| format!("npm 경로 확인 실패: {}", e))?;
        
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(format!("{}/lib/node_modules/openclaw", prefix))
        } else {
            Ok("/usr/local/lib/node_modules/openclaw".to_string())
        }
    }
}

/// 브라우저 컨트롤 설치
pub async fn install_browser_control() -> Result<String, String> {
    eprintln!("브라우저 컨트롤 설정 시작...");
    
    // OpenClaw CLI로 프로필 생성 (cdpPort 자동 할당)
    // 직접 config 수정하지 않고 CLI 사용이 가장 안전
    
    // 1. chrome 프로필 생성 시도 (extension 드라이버)
    let chrome_result = run_openclaw_command(&[
        "browser", "create-profile", 
        "--name", "chrome",
        "--color", "#4285F4"
    ]);
    
    match &chrome_result {
        Ok(output) => eprintln!("chrome 프로필 생성: {}", output),
        Err(e) => {
            // 이미 존재하면 OK
            if !e.contains("exists") && !e.contains("already") {
                eprintln!("chrome 프로필 생성 실패: {}", e);
            }
        }
    }
    
    // 2. clawd 프로필 생성 시도 (OpenClaw 관리 브라우저)
    let clawd_result = run_openclaw_command(&[
        "browser", "create-profile",
        "--name", "clawd", 
        "--color", "#FF4500"
    ]);
    
    match &clawd_result {
        Ok(output) => eprintln!("clawd 프로필 생성: {}", output),
        Err(e) => {
            if !e.contains("exists") && !e.contains("already") {
                eprintln!("clawd 프로필 생성 실패: {}", e);
            }
        }
    }
    
    // 3. browser.enabled, defaultProfile 설정
    let mut config = read_existing_config();
    set_nested_value(&mut config, &["browser", "enabled"], json!(true));
    set_nested_value(&mut config, &["browser", "defaultProfile"], json!("chrome"));
    write_config(&config)?;
    
    // 4. Chrome 확장 프로그램 설치
    let _ = run_openclaw_command(&["browser", "extension", "install"]);
    
    // 5. 확장 프로그램 경로 확인
    match run_openclaw_command(&["browser", "extension", "path"]) {
        Ok(path) => {
            Ok(format!(
                "브라우저 설정 완료!\n\nChrome 확장 프로그램 설치:\n1. Chrome에서 chrome://extensions 열기\n2. '개발자 모드' 활성화\n3. '압축 해제된 확장 프로그램 로드' 클릭\n4. 경로 선택: {}\n\n설치 후 탭에서 OpenClaw 아이콘 클릭하여 연결",
                path.trim()
            ))
        }
        Err(_) => {
            Ok("브라우저 설정 완료! Chrome 확장 프로그램은 'openclaw browser extension install' 명령으로 설치할 수 있습니다.".to_string())
        }
    }
}

/// Slack App Token 설정 (Socket Mode용)
pub async fn set_slack_app_token(app_token: &str) -> Result<(), String> {
    if app_token.is_empty() {
        return Err("App Token이 비어있습니다.".to_string());
    }
    
    let mut config = read_existing_config();
    
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // Slack appToken 설정
    set_nested_value(
        &mut config,
        &["channels", "slack", "appToken"],
        json!(app_token),
    );
    
    write_config(&config)?;
    Ok(())
}

/// Google Chat Service Account 파일 경로 설정
pub async fn set_googlechat_service_account(file_path: &str) -> Result<(), String> {
    if file_path.is_empty() {
        return Err("파일 경로가 비어있습니다.".to_string());
    }
    
    // 파일 존재 확인
    if !std::path::Path::new(file_path).exists() {
        return Err(format!("파일을 찾을 수 없습니다: {}", file_path));
    }
    
    let mut config = read_existing_config();
    
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // Google Chat serviceAccountFile 설정
    set_nested_value(
        &mut config,
        &["channels", "googlechat", "serviceAccountFile"],
        json!(file_path),
    );
    
    write_config(&config)?;
    Ok(())
}

/// Mattermost URL 설정
pub async fn set_mattermost_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL이 비어있습니다.".to_string());
    }
    
    let mut config = read_existing_config();
    
    if config.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        return Err("Config가 없습니다.".to_string());
    }
    
    // meta.lastTouchedAt 업데이트
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    set_nested_value(&mut config, &["meta", "lastTouchedAt"], json!(now));
    
    // Mattermost Base URL 설정 (OpenClaw 공식 스키마)
    set_nested_value(
        &mut config,
        &["channels", "mattermost", "baseUrl"],
        json!(url),
    );
    
    write_config(&config)?;
    Ok(())
}

// ============================================
// Gmail 연동 (gog/gogcli)
// ============================================

/// Embedded OAuth credentials (GCP project: openclawgmailtest)
const GOG_CREDENTIALS_JSON: &str = r#"{"installed":{"client_id":"667788984287-pes4eot8vjrcp1ffa40nvrcfrte9m9b3.apps.googleusercontent.com","project_id":"openclawgmailtest","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost"]}}"#;

/// gog 바이너리 경로 반환 (Windows: %LOCALAPPDATA%\moldClaw\gog.exe)
fn gog_binary_path() -> PathBuf {
    #[cfg(windows)]
    {
        let local_app_data = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| {
                let home = std::env::var("USERPROFILE").unwrap_or_default();
                format!("{}\\AppData\\Local", home)
            });
        PathBuf::from(local_app_data).join("moldClaw").join("gog.exe")
    }
    
    #[cfg(not(windows))]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join(".local").join("bin").join("gog")
    }
}

/// gog credentials 디렉토리 경로
fn gog_config_dir() -> PathBuf {
    #[cfg(windows)]
    {
        let local_app_data = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| {
                let home = std::env::var("USERPROFILE").unwrap_or_default();
                format!("{}\\AppData\\Local", home)
            });
        PathBuf::from(local_app_data).join("gog")
    }
    
    #[cfg(not(windows))]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join(".config").join("gog")
    }
}

/// OAuth credentials 자동 설정 (embedded JSON 사용)
fn setup_gog_credentials() -> Result<(), String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Err("gog가 설치되어 있지 않습니다.".to_string());
    }
    
    // 임시 파일에 credentials JSON 저장
    let temp_dir = std::env::temp_dir();
    let creds_path = temp_dir.join("moldclaw_gog_credentials.json");
    
    fs::write(&creds_path, GOG_CREDENTIALS_JSON)
        .map_err(|e| format!("credentials 파일 생성 실패: {}", e))?;
    
    // gog auth credentials <file> 실행
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new(&gog_path)
            .args(["auth", "credentials", creds_path.to_str().unwrap()])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("gog auth credentials 실행 실패: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // 이미 설정된 경우도 OK
            if !stderr.contains("already") {
                return Err(format!("credentials 설정 실패: {}", stderr));
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new(&gog_path)
            .args(["auth", "credentials", creds_path.to_str().unwrap()])
            .output()
            .map_err(|e| format!("gog auth credentials 실행 실패: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if !stderr.contains("already") {
                return Err(format!("credentials 설정 실패: {}", stderr));
            }
        }
    }
    
    // 임시 파일 삭제
    let _ = fs::remove_file(&creds_path);
    
    Ok(())
}

/// gog 설치 여부 확인
pub fn check_gog_installed() -> bool {
    let gog_path = gog_binary_path();
    gog_path.exists()
}

/// gog 버전 확인
pub async fn get_gog_version() -> Result<String, String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Err("gog가 설치되어 있지 않습니다.".to_string());
    }
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new(&gog_path)
            .arg("--version")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("gog 실행 실패: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new(&gog_path)
            .arg("--version")
            .output()
            .map_err(|e| format!("gog 실행 실패: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    }
}

/// gog 자동 설치 (GitHub releases에서 다운로드)
pub async fn install_gog() -> Result<String, String> {
    let gog_path = gog_binary_path();
    
    // 이미 설치되어 있으면 스킵
    if gog_path.exists() {
        return Ok("gog가 이미 설치되어 있습니다.".to_string());
    }
    
    // 디렉토리 생성
    if let Some(parent) = gog_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        // Windows: ZIP 다운로드 후 압축 해제
        let download_url = "https://github.com/steipete/gogcli/releases/download/v0.11.0/gogcli_0.11.0_windows_amd64.zip";
        let temp_dir = std::env::temp_dir();
        let zip_path = temp_dir.join("gog_temp.zip");
        let extract_dir = temp_dir.join("gog_extract");
        
        // 다운로드 (curl 사용)
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let download = Command::new("curl")
            .args(["-L", "-o", zip_path.to_str().unwrap(), download_url])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("다운로드 실패: {}", e))?;
        
        if !download.status.success() {
            return Err("gog 다운로드 실패".to_string());
        }
        
        // PowerShell로 압축 해제
        let _ = fs::remove_dir_all(&extract_dir);
        fs::create_dir_all(&extract_dir)
            .map_err(|e| format!("압축 해제 디렉토리 생성 실패: {}", e))?;
        
        let extract = Command::new("powershell")
            .args([
                "-NoProfile", "-Command",
                &format!(
                    "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                    zip_path.display(),
                    extract_dir.display()
                )
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("압축 해제 실패: {}", e))?;
        
        if !extract.status.success() {
            return Err(format!("압축 해제 실패: {}", String::from_utf8_lossy(&extract.stderr)));
        }
        
        // gog.exe 복사
        let extracted_exe = extract_dir.join("gog.exe");
        if extracted_exe.exists() {
            fs::copy(&extracted_exe, &gog_path)
                .map_err(|e| format!("gog.exe 복사 실패: {}", e))?;
        } else {
            // 서브디렉토리 확인
            for entry in fs::read_dir(&extract_dir).map_err(|e| e.to_string())? {
                if let Ok(entry) = entry {
                    let sub_exe = entry.path().join("gog.exe");
                    if sub_exe.exists() {
                        fs::copy(&sub_exe, &gog_path)
                            .map_err(|e| format!("gog.exe 복사 실패: {}", e))?;
                        break;
                    }
                }
            }
        }
        
        // 정리
        let _ = fs::remove_file(&zip_path);
        let _ = fs::remove_dir_all(&extract_dir);
        
        if gog_path.exists() {
            Ok("gog 설치 완료".to_string())
        } else {
            Err("gog.exe를 찾을 수 없습니다.".to_string())
        }
    }
    
    #[cfg(not(windows))]
    {
        // macOS/Linux: tar.gz 다운로드
        let (os, arch) = if cfg!(target_os = "macos") {
            ("darwin", if cfg!(target_arch = "aarch64") { "arm64" } else { "amd64" })
        } else {
            ("linux", if cfg!(target_arch = "aarch64") { "arm64" } else { "amd64" })
        };
        
        let download_url = format!(
            "https://github.com/steipete/gogcli/releases/download/v0.11.0/gogcli_0.11.0_{}_{}.tar.gz",
            os, arch
        );
        
        let temp_dir = std::env::temp_dir();
        let tar_path = temp_dir.join("gog_temp.tar.gz");
        
        // 다운로드
        let download = Command::new("curl")
            .args(["-L", "-o", tar_path.to_str().unwrap(), &download_url])
            .output()
            .map_err(|e| format!("다운로드 실패: {}", e))?;
        
        if !download.status.success() {
            return Err("gog 다운로드 실패".to_string());
        }
        
        // 압축 해제
        if let Some(parent) = gog_path.parent() {
            let extract = Command::new("tar")
                .args(["-xzf", tar_path.to_str().unwrap(), "-C", parent.to_str().unwrap()])
                .output()
                .map_err(|e| format!("압축 해제 실패: {}", e))?;
            
            if !extract.status.success() {
                return Err("압축 해제 실패".to_string());
            }
            
            // 실행 권한 부여
            let _ = Command::new("chmod")
                .args(["+x", gog_path.to_str().unwrap()])
                .output();
        }
        
        // 정리
        let _ = fs::remove_file(&tar_path);
        
        if gog_path.exists() {
            Ok("gog 설치 완료".to_string())
        } else {
            Err("gog 바이너리를 찾을 수 없습니다.".to_string())
        }
    }
}

/// gog OAuth 인증 시작 (브라우저 열림, 백그라운드 실행)
pub async fn start_gog_auth() -> Result<String, String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Err("gog가 설치되어 있지 않습니다. 먼저 설치해주세요.".to_string());
    }
    
    // 먼저 OAuth credentials 설정 (embedded JSON 사용)
    setup_gog_credentials()?;
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // gog auth login 실행 (백그라운드, 바로 반환)
        Command::new(&gog_path)
            .args(["auth", "login"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("gog auth 실행 실패: {}", e))?;
        
        Ok("브라우저 열림".to_string())
    }
    
    #[cfg(not(windows))]
    {
        // gog auth login 실행 (백그라운드, 바로 반환)
        Command::new(&gog_path)
            .args(["auth", "login"])
            .spawn()
            .map_err(|e| format!("gog auth 실행 실패: {}", e))?;
        
        Ok("브라우저 열림".to_string())
    }
}

/// gog 인증 상태 확인
pub async fn check_gog_auth() -> Result<String, String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Err("gog가 설치되어 있지 않습니다.".to_string());
    }
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new(&gog_path)
            .args(["auth", "list"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("gog auth list 실패: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("@") {
            // 이메일 주소 추출
            for line in stdout.lines() {
                if line.contains("@") {
                    return Ok(line.trim().to_string());
                }
            }
        }
        Err("인증된 계정이 없습니다.".to_string())
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new(&gog_path)
            .args(["auth", "list"])
            .output()
            .map_err(|e| format!("gog auth list 실패: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("@") {
            for line in stdout.lines() {
                if line.contains("@") {
                    return Ok(line.trim().to_string());
                }
            }
        }
        Err("인증된 계정이 없습니다.".to_string())
    }
}

/// Gmail 폴링 설정 (gog 인증 완료 기록만 - hooks 불필요)
/// 폴링 방식은 hooks 웹훅이 필요 없음 (on-demand gog 호출)
pub async fn setup_gmail_polling(account: &str, _interval_minutes: u32) -> Result<(), String> {
    // 폴링 방식에서는 hooks 설정이 필요 없음
    // gog auth만 완료되어 있으면 OpenClaw가 on-demand로 gog 호출 가능
    // 
    // 나중에 필요하면 별도 설정 파일이나 다른 config 섹션에 저장 가능
    // 현재는 gog auth 상태만으로 Gmail 연동 여부 판단
    
    // account 정보 로깅 (디버깅용)
    println!("[Gmail] 폴링 설정 완료: {}", account);
    
    Ok(())
}

/// Gmail 연동 해제
pub async fn disconnect_gmail() -> Result<(), String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Ok(()); // gog 없으면 이미 연결 안 된 상태
    }
    
    // 먼저 현재 연결된 계정 확인
    #[cfg(windows)]
    let list_output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&gog_path)
            .args(["auth", "list"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    };
    
    #[cfg(not(windows))]
    let list_output = Command::new(&gog_path)
        .args(["auth", "list"])
        .output();
    
    let account = if let Ok(output) = list_output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        stdout.lines()
            .find(|line| line.contains("@"))
            .and_then(|line| line.split_whitespace().next())
            .map(|s| s.to_string())
    } else {
        None
    };
    
    // 계정이 있으면 제거
    if let Some(email) = account {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            
            let _ = Command::new(&gog_path)
                .args(["auth", "remove", &email, "--force"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
        
        #[cfg(not(windows))]
        {
            let _ = Command::new(&gog_path)
                .args(["auth", "remove", &email, "--force"])
                .output();
        }
        
        println!("[Gmail] 연결 해제 완료: {}", email);
    }
    
    Ok(())
}

/// Gmail 연동 상태 확인 (gog auth 상태만 체크)
pub async fn get_gmail_status() -> Result<Value, String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Ok(json!({
            "connected": false,
            "account": "",
        }));
    }
    
    // gog auth list 실행
    #[cfg(windows)]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&gog_path)
            .args(["auth", "list"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    };
    
    #[cfg(not(windows))]
    let output = Command::new(&gog_path)
        .args(["auth", "list"])
        .output();
    
    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // 이메일 주소 찾기
        for line in stdout.lines() {
            if line.contains("@") {
                let account = line.split_whitespace().next().unwrap_or("").trim().to_string();
                if !account.is_empty() {
                    return Ok(json!({
                        "connected": true,
                        "account": account,
                    }));
                }
            }
        }
    }
    
    Ok(json!({
        "connected": false,
        "account": "",
    }))
}

/// 번들된 OAuth credentials를 gog에 등록
/// moldClaw 앱에 포함된 credentials.json을 gog auth credentials로 등록
pub async fn register_gog_credentials(credentials_path: &str) -> Result<(), String> {
    let gog_path = gog_binary_path();
    if !gog_path.exists() {
        return Err("gog가 설치되어 있지 않습니다.".to_string());
    }
    
    // credentials 파일 존재 확인
    let cred_path = std::path::Path::new(credentials_path);
    if !cred_path.exists() {
        return Err(format!("Credentials 파일을 찾을 수 없습니다: {}", credentials_path));
    }
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = Command::new(&gog_path)
            .args(["auth", "credentials", credentials_path])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("gog auth credentials 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // 이미 등록된 경우도 성공으로 처리
            if stderr.contains("already") || stderr.is_empty() {
                Ok(())
            } else {
                Err(format!("Credentials 등록 실패: {}", stderr))
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = Command::new(&gog_path)
            .args(["auth", "credentials", credentials_path])
            .output()
            .map_err(|e| format!("gog auth credentials 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("already") || stderr.is_empty() {
                Ok(())
            } else {
                Err(format!("Credentials 등록 실패: {}", stderr))
            }
        }
    }
}

/// gog credentials가 등록되어 있는지 확인
pub fn check_gog_credentials() -> bool {
    // gog의 credentials 저장 위치 확인
    #[cfg(windows)]
    {
        let app_data = std::env::var("APPDATA").unwrap_or_default();
        let cred_path = std::path::PathBuf::from(app_data)
            .join("gogcli")
            .join("credentials.json");
        cred_path.exists()
    }
    
    #[cfg(not(windows))]
    {
        // XDG_CONFIG_HOME 또는 ~/.config/gogcli/credentials.json
        let config_home = std::env::var("XDG_CONFIG_HOME")
            .unwrap_or_else(|_| {
                let home = std::env::var("HOME").unwrap_or_default();
                format!("{}/.config", home)
            });
        let cred_path = std::path::PathBuf::from(config_home)
            .join("gogcli")
            .join("credentials.json");
        cred_path.exists()
    }
}
