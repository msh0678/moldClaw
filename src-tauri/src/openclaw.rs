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

/// 공식 형식으로 초기 Config 생성 (첫 실행용)
/// Device Identity도 함께 생성
pub async fn create_official_config(
    gateway_port: u16,
    gateway_bind: &str,
) -> Result<String, String> {
    // 1. Device Identity 확보 (가장 먼저!)
    ensure_device_identity()?;
    
    // 2. Gateway 토큰 생성 또는 기존 값 사용
    let existing_config = read_existing_config();
    let gateway_token = existing_config
        .get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .filter(|t| !t.is_empty())
        .map(String::from)
        .unwrap_or_else(generate_gateway_token);
    
    // 3. 기본 config 생성
    let config = create_base_config(gateway_port, gateway_bind, &gateway_token);
    
    // 4. 설정 디렉토리 및 파일 저장
    write_config(&config)?;
    
    // 5. 워크스페이스 초기화
    initialize_workspace().await?;
    
    Ok(gateway_token)
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
    set_nested_value(
        &mut config,
        &["models", "providers", provider, "apiKey"],
        json!(api_key),
    );
    
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
                json!("https://generativelanguage.googleapis.com/v1"),
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
    let profile_id = format!("{}:default", provider);
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "provider"],
        json!(provider),
    );
    set_nested_value(
        &mut config,
        &["auth", "profiles", &profile_id, "mode"],
        json!("token"),
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
            "contextWindow": 128000,
            "maxTokens": 16384
        }),
        "gpt-4o-mini" => json!({
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 16384
        }),
        _ => json!({
            "id": model,
            "name": model,
            "reasoning": false,
            "input": ["text"],
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
            set_nested_value(
                &mut config,
                &["channels", "telegram", "botToken"],
                json!(bot_token),
            );
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
            set_nested_value(
                &mut config,
                &["channels", "discord", "botToken"],
                json!(bot_token),
            );
            set_nested_value(
                &mut config,
                &["channels", "discord", "guilds", "*", "requireMention"],
                json!(require_mention),
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
/// 공식 문서: channels.discord.dm.policy, channels.discord.dm.allowFrom
pub async fn configure_discord(token: &str, dm_policy: &str) -> Result<(), String> {
    let mut config = read_existing_config();

    set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
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

    set_nested_value(&mut config, &["channels", "discord", "token"], json!(token));
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

/// WhatsApp 페어링 시작 (onboard 명령 사용)
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
