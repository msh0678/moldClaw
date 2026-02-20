mod openclaw;

#[cfg(windows)]
mod windows_helper;

use tauri::Emitter;

// ===== 환경 체크 =====

#[tauri::command]
fn check_node_installed() -> bool {
    #[cfg(windows)]
    {
        windows_helper::get_node_version().is_some()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("node")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[tauri::command]
fn get_node_version() -> Option<String> {
    #[cfg(windows)]
    {
        windows_helper::get_node_version()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("node")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
}

#[tauri::command]
fn check_openclaw_installed() -> bool {
    #[cfg(windows)]
    {
        windows_helper::is_openclaw_installed()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("openclaw")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[tauri::command]
fn get_openclaw_version() -> Option<String> {
    #[cfg(windows)]
    {
        windows_helper::get_openclaw_version()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("openclaw")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
}

// ===== 설치 =====

/// OpenClaw 설치 (npm install -g openclaw) - 에러 자동 복구 포함
#[tauri::command]
async fn install_openclaw() -> Result<String, String> {
    #[cfg(windows)]
    {
        // 에러 핸들링 및 자동 복구 시스템 사용
        windows_helper::install_openclaw_with_recovery()
    }
    #[cfg(not(windows))]
    {
        let output = std::process::Command::new("npm")
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

// ===== 설정 =====

#[tauri::command]
async fn configure_model(provider: String, model: String, api_key: String) -> Result<(), String> {
    openclaw::configure_model(&provider, &model, &api_key).await
}

#[tauri::command]
async fn configure_gateway(port: u16, bind: String, auth_token: String, auth_password: String) -> Result<(), String> {
    openclaw::configure_gateway_full(port, &bind, &auth_token, &auth_password).await
}

#[tauri::command]
async fn initialize_workspace() -> Result<String, String> {
    openclaw::initialize_workspace().await
}

#[tauri::command]
async fn configure_telegram(token: String, dm_policy: String) -> Result<(), String> {
    openclaw::configure_telegram(&token, &dm_policy).await
}

#[tauri::command]
async fn configure_telegram_full(
    token: String,
    dm_policy: String,
    allow_from: Vec<String>,
    group_policy: String,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    openclaw::configure_telegram_full(&token, &dm_policy, allow_from, &group_policy, group_allow_from, require_mention).await
}

#[tauri::command]
async fn configure_discord(token: String, dm_policy: String) -> Result<(), String> {
    openclaw::configure_discord(&token, &dm_policy).await
}

#[tauri::command]
async fn configure_discord_full(
    token: String,
    dm_policy: String,
    allow_from: Vec<String>,
    group_policy: String,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    openclaw::configure_discord_full(&token, &dm_policy, allow_from, &group_policy, group_allow_from, require_mention).await
}

#[tauri::command]
async fn configure_whatsapp(dm_policy: String) -> Result<(), String> {
    openclaw::configure_whatsapp(&dm_policy).await
}

#[tauri::command]
async fn configure_whatsapp_full(
    dm_policy: String,
    allow_from: Vec<String>,
    group_policy: String,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    openclaw::configure_whatsapp_full(&dm_policy, allow_from, &group_policy, group_allow_from, require_mention).await
}

// ===== Gateway 제어 =====

#[tauri::command]
async fn start_gateway() -> Result<(), String> {
    openclaw::start_gateway().await
}

#[tauri::command]
async fn install_and_start_service() -> Result<String, String> {
    openclaw::install_and_start_service().await
}

#[tauri::command]
async fn get_gateway_status() -> Result<String, String> {
    openclaw::get_status().await
}

#[tauri::command]
async fn start_whatsapp_pairing() -> Result<String, String> {
    openclaw::start_whatsapp_pairing().await
}

#[tauri::command]
async fn stop_gateway() -> Result<(), String> {
    openclaw::stop_gateway().await
}

#[tauri::command]
async fn restart_gateway() -> Result<String, String> {
    openclaw::restart_gateway().await
}

/// OpenClaw 삭제 (npm uninstall -g openclaw)
#[tauri::command]
async fn uninstall_openclaw() -> Result<String, String> {
    eprintln!("OpenClaw 삭제 시작...");
    
    // 먼저 Gateway 종료
    let _ = openclaw::stop_gateway().await;
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = std::process::Command::new("cmd")
            .args(["/C", "npm uninstall -g openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            eprintln!("OpenClaw 삭제 완료");
            Ok("OpenClaw가 성공적으로 삭제되었습니다.".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("삭제 실패: {}", stderr))
        }
    }
    
    #[cfg(not(windows))]
    {
        let output = std::process::Command::new("npm")
            .args(["uninstall", "-g", "openclaw"])
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            eprintln!("OpenClaw 삭제 완료");
            Ok("OpenClaw가 성공적으로 삭제되었습니다.".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("삭제 실패: {}", stderr))
        }
    }
}

/// 앱 종료 전 정리 작업
#[tauri::command]
async fn cleanup_before_exit() -> Result<(), String> {
    eprintln!("moldClaw 종료 준비 중...");
    
    // OpenClaw 설치 여부 먼저 확인 (빠른 체크)
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let check = std::process::Command::new("cmd")
            .args(["/C", "where openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        // openclaw가 없으면 바로 종료
        if check.is_err() || !check.unwrap().status.success() {
            eprintln!("OpenClaw 미설치 - 바로 종료");
            return Ok(());
        }
    }
    
    #[cfg(not(windows))]
    {
        let check = std::process::Command::new("which")
            .arg("openclaw")
            .output();
        
        if check.is_err() || !check.unwrap().status.success() {
            eprintln!("OpenClaw 미설치 - 바로 종료");
            return Ok(());
        }
    }
    
    // Gateway 종료 시도 (타임아웃 3초)
    eprintln!("Gateway 종료 시도...");
    let cleanup = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        openclaw::stop_gateway()
    ).await;
    
    match cleanup {
        Ok(_) => eprintln!("Gateway 종료 완료"),
        Err(_) => eprintln!("Gateway 종료 타임아웃 - 무시하고 종료"),
    }
    
    Ok(())
}

// ===== Onboard =====

#[tauri::command]
async fn run_full_onboard(
    provider: String,
    api_key: String,
    gateway_port: u16,
    gateway_bind: String,
) -> Result<String, String> {
    openclaw::run_full_onboard(&provider, &api_key, gateway_port, &gateway_bind).await
}

#[tauri::command]
async fn validate_config() -> Result<bool, String> {
    openclaw::validate_config().await
}

#[tauri::command]
async fn get_config_summary() -> Result<String, String> {
    openclaw::get_config_summary().await
}

#[tauri::command]
fn generate_token() -> String {
    openclaw::generate_token()
}

#[tauri::command]
async fn is_onboarding_completed() -> Result<bool, String> {
    openclaw::is_onboarding_completed().await
}

// ===== 유틸 =====

#[tauri::command]
fn get_os_type() -> String {
    openclaw::get_os_type()
}

#[tauri::command]
fn get_node_install_url() -> String {
    openclaw::get_node_install_url()
}

#[tauri::command]
async fn set_env_config(key: String, value: String) -> Result<(), String> {
    openclaw::set_env_config(&key, &value).await
}

#[tauri::command]
async fn get_configured_integrations() -> Result<Vec<String>, String> {
    openclaw::get_configured_integrations().await
}

#[tauri::command]
async fn apply_default_security_settings() -> Result<(), String> {
    openclaw::apply_default_security_settings().await
}

#[tauri::command]
async fn get_install_path() -> Result<String, String> {
    openclaw::get_install_path().await
}

#[tauri::command]
async fn install_browser_control() -> Result<String, String> {
    openclaw::install_browser_control().await
}

/// Dashboard URL 가져오기 (토큰 포함)
#[tauri::command]
fn get_dashboard_url() -> String {
    openclaw::get_dashboard_url()
}

// ===== 새 UI 관련 명령어들 =====

/// Cron jobs 목록 조회
#[tauri::command]
async fn get_cron_jobs() -> Result<String, String> {
    // OpenClaw Gateway API를 통해 cron jobs 조회
    let config = openclaw::read_existing_config();
    let port = config.get("gateway")
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
        .unwrap_or(18789) as u16;
    let auth_token = config.get("gateway")
        .and_then(|g| g.get("authToken"))
        .and_then(|t| t.as_str())
        .unwrap_or("");
    
    // Gateway API 호출
    let url = format!("http://127.0.0.1:{}/api/cron", port);
    let client = reqwest::Client::new();
    
    let mut request = client.get(&url);
    if !auth_token.is_empty() {
        request = request.header("Authorization", format!("Bearer {}", auth_token));
    }
    
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(body) => {
                        // API 응답을 파싱해서 jobs 배열로 변환
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&body) {
                            // OpenClaw cron API 응답 구조에 맞게 변환
                            let jobs = parsed.get("jobs").cloned().unwrap_or(serde_json::json!([]));
                            Ok(serde_json::json!({ "jobs": jobs }).to_string())
                        } else {
                            Ok(serde_json::json!({ "jobs": [], "raw": body }).to_string())
                        }
                    }
                    Err(e) => Ok(serde_json::json!({
                        "jobs": [],
                        "error": format!("응답 읽기 실패: {}", e)
                    }).to_string())
                }
            } else {
                Ok(serde_json::json!({
                    "jobs": [],
                    "error": format!("API 오류: {}", response.status())
                }).to_string())
            }
        }
        Err(e) => {
            // Gateway가 실행 중이 아니거나 연결 실패
            Ok(serde_json::json!({
                "jobs": [],
                "error": format!("Gateway 연결 실패: {}", e)
            }).to_string())
        }
    }
}

/// Cron job 삭제
#[tauri::command]
async fn delete_cron_job(job_id: String) -> Result<(), String> {
    eprintln!("Cron job 삭제: {}", job_id);
    // TODO: 실제 삭제 구현
    Ok(())
}

/// Cron job 토글
#[tauri::command]
async fn toggle_cron_job(job_id: String, enabled: bool) -> Result<(), String> {
    eprintln!("Cron job 토글: {} -> {}", job_id, enabled);
    // TODO: 실제 토글 구현
    Ok(())
}

/// 워크스페이스 파일 목록 조회
#[tauri::command]
async fn get_workspace_files() -> Result<String, String> {
    let workspace_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("workspace"))
        .unwrap_or_default();
    
    let mut files = Vec::new();
    
    if workspace_path.exists() {
        if let Ok(entries) = std::fs::read_dir(&workspace_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                let metadata = entry.metadata().ok();
                
                files.push(serde_json::json!({
                    "name": entry.file_name().to_string_lossy(),
                    "path": path.to_string_lossy(),
                    "size": metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                    "modified": metadata.as_ref()
                        .and_then(|m| m.modified().ok())
                        .map(|t| {
                            let duration = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                            chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                                .unwrap_or_default()
                        })
                        .unwrap_or_default(),
                    "isDirectory": path.is_dir()
                }));
            }
        }
    }
    
    Ok(serde_json::json!({
        "path": workspace_path.to_string_lossy(),
        "files": files
    }).to_string())
}

/// 파일 열기
#[tauri::command]
async fn open_file(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("파일 열기 실패: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("파일 열기 실패: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("파일 열기 실패: {}", e))?;
    }
    Ok(())
}

/// 워크스페이스 폴더 열기
#[tauri::command]
async fn open_workspace_folder() -> Result<(), String> {
    let workspace_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("workspace"))
        .unwrap_or_default();
    
    open_file(workspace_path.to_string_lossy().to_string()).await
}

/// 대화 기록 조회
#[tauri::command]
async fn get_conversations() -> Result<String, String> {
    // TODO: 실제 대화 기록 조회 구현
    Ok(serde_json::json!({
        "conversations": []
    }).to_string())
}

/// Gateway 로그 조회
#[tauri::command]
async fn get_gateway_logs() -> Result<String, String> {
    // TODO: 실제 로그 조회 구현
    Ok(serde_json::json!({
        "logs": []
    }).to_string())
}

/// Gateway 로그 삭제
#[tauri::command]
async fn clear_gateway_logs() -> Result<(), String> {
    // TODO: 실제 로그 삭제 구현
    Ok(())
}

/// 채널 상태 조회
#[tauri::command]
async fn get_channel_status() -> Result<String, String> {
    // config 파일에서 설정된 채널 읽기
    let config_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("openclaw.json"))
        .unwrap_or_default();
    
    let mut channels = Vec::new();
    
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(ch) = config.get("channels") {
                    if ch.get("telegram").is_some() {
                        channels.push(serde_json::json!({
                            "name": "Telegram",
                            "icon": "✈️",
                            "connected": true
                        }));
                    }
                    if ch.get("discord").is_some() {
                        channels.push(serde_json::json!({
                            "name": "Discord",
                            "icon": "🎮",
                            "connected": true
                        }));
                    }
                    if ch.get("whatsapp").is_some() {
                        channels.push(serde_json::json!({
                            "name": "WhatsApp",
                            "icon": "💚",
                            "connected": true
                        }));
                    }
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "channels": channels
    }).to_string())
}

/// 사용량 통계 조회
#[tauri::command]
async fn get_usage_stats() -> Result<String, String> {
    // TODO: 실제 사용량 통계 구현
    Ok(serde_json::json!({
        "usage": null,
        "recentActivity": []
    }).to_string())
}

// ===== Windows 전용 명령어 =====

/// Windows 필수 프로그램 상태 확인
#[cfg(windows)]
#[tauri::command]
fn check_prerequisites() -> windows_helper::PrerequisiteStatus {
    windows_helper::check_prerequisites()
}

#[cfg(not(windows))]
#[tauri::command]
fn check_prerequisites() -> serde_json::Value {
    serde_json::json!({
        "node_installed": true,
        "node_version": null,
        "node_compatible": true,
        "npm_installed": true,
        "vc_redist_installed": true,  // Windows 전용, 다른 OS에서는 항상 true
        "disk_space_gb": 100.0,
        "disk_space_ok": true,
        "antivirus_detected": null
    })
}

/// Node.js 설치 (winget 사용)
#[cfg(windows)]
#[tauri::command]
fn install_nodejs() -> Result<String, String> {
    windows_helper::install_nodejs_with_winget_visible()
}

/// 에러 분석 (디버깅용)
#[cfg(windows)]
#[tauri::command]
fn analyze_install_error(error_message: String) -> serde_json::Value {
    let analysis = windows_helper::analyze_error(&error_message);
    serde_json::json!({
        "error_type": format!("{:?}", analysis.error_type),
        "description": analysis.description,
        "solution": analysis.solution,
        "auto_fixable": analysis.auto_fixable
    })
}

#[cfg(not(windows))]
#[tauri::command]
fn analyze_install_error(_error_message: String) -> serde_json::Value {
    serde_json::json!({
        "error_type": "Unknown",
        "description": "에러 분석은 Windows에서만 지원됩니다.",
        "solution": "에러 메시지를 확인해주세요.",
        "auto_fixable": false
    })
}

/// Visual C++ Redistributable 설치
#[cfg(windows)]
#[tauri::command]
fn install_vc_redist() -> Result<String, String> {
    windows_helper::install_vc_redist()
}

#[cfg(not(windows))]
#[tauri::command]
fn install_vc_redist() -> Result<String, String> {
    Err("이 기능은 Windows에서만 사용 가능합니다".to_string())
}

#[cfg(not(windows))]
#[tauri::command]
fn install_nodejs() -> Result<String, String> {
    Err("이 기능은 Windows에서만 사용 가능합니다".to_string())
}

/// 환경 변수 새로고침
#[cfg(windows)]
#[tauri::command]
fn refresh_path() {
    windows_helper::refresh_environment_variables();
}

#[cfg(not(windows))]
#[tauri::command]
fn refresh_path() {
    // Unix에서는 필요 없음
}

/// 필수 프로그램 설치 + 재시작 필요 여부 확인
/// 반환: { needs_restart: bool, message: String }
#[tauri::command]
fn install_prerequisites() -> Result<serde_json::Value, String> {
    let mut needs_restart = false;
    let mut messages: Vec<String> = Vec::new();
    
    #[cfg(windows)]
    {
        let prereq_status = windows_helper::check_prerequisites();
        
        // 1. Node.js 확인 및 설치
        if !prereq_status.node_compatible {
            if prereq_status.node_installed {
                messages.push(format!(
                    "⚠️ Node.js {}가 설치되어 있지만, 22.12.0 이상이 필요합니다.",
                    prereq_status.node_version.clone().unwrap_or_default()
                ));
            }
            messages.push("Node.js LTS 설치 중... (관리자 권한 승인 창이 나타나면 '예'를 클릭하세요)".to_string());
            match windows_helper::install_nodejs_with_winget_visible() {
                Ok(msg) => {
                    messages.push(format!("✓ {}", msg));
                    
                    // 설치 후 환경변수 새로고침하고 인식 확인 (최대 10초, 1초마다 체크)
                    messages.push("환경변수 새로고침 중...".to_string());
                    
                    let mut detected_version: Option<String> = None;
                    for attempt in 1..=10 {
                        // 매 시도마다 환경변수 새로고침
                        windows_helper::refresh_environment_variables();
                        std::thread::sleep(std::time::Duration::from_secs(1));
                        
                        // Node.js 인식 확인
                        if let Some(version) = windows_helper::get_node_version() {
                            if windows_helper::is_node_version_compatible(&version) {
                                detected_version = Some(version);
                                eprintln!("Node.js 인식 성공 ({}초 후)", attempt);
                                break;
                            }
                        }
                        eprintln!("Node.js 인식 대기 중... ({}/10)", attempt);
                    }
                    
                    if let Some(version) = detected_version {
                        // ✅ 인식 성공 → 재시작 불필요
                        messages.push(format!("✓ Node.js {} 정상 인식됨", version));
                    } else {
                        // ❌ 10초 후에도 인식 실패 → 재시작 필요
                        // 혹시 버전은 있지만 호환 안 되는 경우 체크
                        if let Some(version) = windows_helper::get_node_version() {
                            messages.push(format!("⚠️ Node.js {} 인식됨, 하지만 22.12.0 이상 필요", version));
                        } else {
                            messages.push("⚠️ Node.js가 설치되었지만 현재 프로세스에서 인식되지 않습니다.".to_string());
                        }
                        messages.push("moldClaw를 재시작해야 합니다.".to_string());
                        needs_restart = true;
                    }
                }
                Err(e) => return Err(format!("Node.js 설치 실패: {}", e)),
            }
        } else {
            messages.push(format!(
                "✓ Node.js {}가 이미 설치되어 있습니다.",
                prereq_status.node_version.clone().unwrap_or_default()
            ));
        }
        
        // 2. Visual C++ Redistributable 확인 및 설치
        if !prereq_status.vc_redist_installed {
            messages.push("Visual C++ Redistributable 설치 중... (관리자 권한 승인 창이 나타나면 '예'를 클릭하세요)".to_string());
            match windows_helper::install_vc_redist() {
                Ok(msg) => {
                    messages.push(format!("✓ {}", msg));
                    // VC++ 설치는 재시작 불필요
                }
                Err(e) => {
                    // VC++ 설치 실패는 경고만 (OpenClaw 설치 시 다시 시도)
                    messages.push(format!("⚠️ Visual C++ 설치 실패: {} (OpenClaw 설치 시 재시도)", e));
                }
            }
        } else {
            messages.push("✓ Visual C++ Redistributable이 이미 설치되어 있습니다.".to_string());
        }
        
        // 3. 디스크 공간 확인
        if !prereq_status.disk_space_ok {
            messages.push(format!(
                "⚠️ 디스크 공간 부족: {:.1}GB (권장: 2GB 이상)",
                prereq_status.disk_space_gb
            ));
        }
        
        // 4. 백신 감지 알림
        if let Some(ref av) = prereq_status.antivirus_detected {
            messages.push(format!(
                "ℹ️ 백신 감지됨: {}. 설치 실패 시 실시간 감시 일시 중지가 필요할 수 있습니다.",
                av
            ));
        }
    }
    
    #[cfg(not(windows))]
    {
        // Unix에서는 시스템 패키지 매니저 사용 안내
        if !check_node_installed() {
            return Err("Node.js가 설치되어 있지 않습니다. 시스템 패키지 매니저로 설치해주세요.".to_string());
        }
        messages.push("✓ Node.js가 설치되어 있습니다.".to_string());
    }
    
    Ok(serde_json::json!({
        "needs_restart": needs_restart,
        "message": messages.join("\n")
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // 환경 체크
            check_node_installed,
            get_node_version,
            check_openclaw_installed,
            get_openclaw_version,
            // 설치
            install_openclaw,
            install_prerequisites,
            // 설정
            configure_model,
            configure_gateway,
            initialize_workspace,
            configure_telegram,
            configure_telegram_full,
            configure_discord,
            configure_discord_full,
            configure_whatsapp,
            configure_whatsapp_full,
            // Gateway 제어
            start_gateway,
            install_and_start_service,
            get_gateway_status,
            start_whatsapp_pairing,
            stop_gateway,
            restart_gateway,
            // Onboard
            run_full_onboard,
            validate_config,
            get_config_summary,
            generate_token,
            is_onboarding_completed,
            // 유틸
            get_os_type,
            get_node_install_url,
            set_env_config,
            get_configured_integrations,
            apply_default_security_settings,
            get_install_path,
            install_browser_control,
            get_dashboard_url,
            // Windows 전용
            check_prerequisites,
            install_nodejs,
            refresh_path,
            analyze_install_error,
            install_vc_redist,
            // 삭제/종료
            uninstall_openclaw,
            cleanup_before_exit,
            // 새 UI 관련
            get_cron_jobs,
            delete_cron_job,
            toggle_cron_job,
            get_workspace_files,
            open_file,
            open_workspace_folder,
            get_conversations,
            get_gateway_logs,
            clear_gateway_logs,
            get_channel_status,
            get_usage_stats,
        ])
        .setup(|_app| {
            eprintln!("moldClaw 시작됨");
            eprintln!("winget 기반 설치 모드 (node-portable 번들 없음)");
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                eprintln!("moldClaw 종료 중...");
                
                // OpenClaw 설치 여부 확인 후 Gateway 종료 (동기적)
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    
                    // openclaw 설치 여부 빠른 체크
                    let check = std::process::Command::new("cmd")
                        .args(["/C", "where openclaw"])
                        .creation_flags(CREATE_NO_WINDOW)
                        .output();
                    
                    if check.is_ok() && check.unwrap().status.success() {
                        eprintln!("OpenClaw 발견 - Gateway 종료 시도");
                        
                        // foreground 프로세스는 gateway stop으로 안 멈춤
                        // 직접 포트 사용 프로세스 종료
                        let kill_cmd = r#"
                            $configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
                            $port = 18789
                            if (Test-Path $configPath) {
                                try {
                                    $config = Get-Content $configPath | ConvertFrom-Json
                                    if ($config.gateway.port) { $port = $config.gateway.port }
                                } catch { }
                            }
                            # Get-NetTCPConnection으로 PID 찾아서 종료
                            $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
                            foreach ($conn in $connections) {
                                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                            }
                        "#;
                        
                        let _ = std::process::Command::new("powershell")
                            .args(["-NoProfile", "-Command", kill_cmd])
                            .creation_flags(CREATE_NO_WINDOW)
                            .output();
                    }
                }
                
                #[cfg(not(windows))]
                {
                    // Linux/Mac: openclaw 설치 여부 체크
                    let check = std::process::Command::new("which")
                        .arg("openclaw")
                        .output();
                    
                    if check.is_ok() && check.unwrap().status.success() {
                        let _ = std::process::Command::new("openclaw")
                            .args(["gateway", "stop"])
                            .output();
                        
                        // 강제 종료
                        let _ = std::process::Command::new("pkill")
                            .args(["-9", "-f", "openclaw.*gateway"])
                            .output();
                    }
                }
                
                eprintln!("moldClaw 종료 완료");
                // 창이 정상적으로 닫힘 (prevent_close 안 함)
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
