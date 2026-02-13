mod openclaw;
mod openclaw_manager;
mod resource_resolver;
mod openclaw_installer_alt;
mod openclaw_global_installer;
mod openclaw_extractor;

#[tauri::command]
async fn check_node_installed() -> Result<bool, String> {
    openclaw::is_node_installed().await
}

#[tauri::command]
async fn get_node_version() -> Result<String, String> {
    openclaw::get_node_version().await
}

#[tauri::command]
async fn check_openclaw_installed() -> Result<bool, String> {
    openclaw::is_openclaw_installed().await
}

#[tauri::command]
async fn get_openclaw_version() -> Result<String, String> {
    openclaw::get_openclaw_version().await
}

#[tauri::command]
async fn install_openclaw() -> Result<String, String> {
    openclaw::install_openclaw().await
}

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
async fn is_onboarding_completed() -> Result<bool, String> {
    openclaw::is_onboarding_completed().await
}

#[tauri::command]
async fn stop_gateway() -> Result<(), String> {
    openclaw::stop_gateway().await
}

#[tauri::command]
async fn restart_gateway() -> Result<String, String> {
    openclaw::restart_gateway().await
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // 환경 체크
            check_node_installed,
            get_node_version,
            check_openclaw_installed,
            get_openclaw_version,
            install_openclaw,
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
            // 통합 설정
            set_env_config,
            get_configured_integrations,
            // 보안 설정
            apply_default_security_settings,
            // 경로 정보
            get_install_path,
            // 브라우저 컨트롤
            install_browser_control,
        ])
        .setup(|app| {
            // OpenClaw 관리자 초기화
            openclaw_manager::init_manager(&app.handle())
                .map_err(|e| format!("OpenClaw 관리자 초기화 실패: {}", e))?;
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("moldClaw 종료 중... OpenClaw Gateway 정리 시작");
                
                // 1. 정상 종료 시도 (먼저)
                println!("1. OpenClaw Gateway 정상 종료 시도...");
                
                #[cfg(windows)]
                {
                    // Windows: cmd를 통해 실행
                    let stop_result = std::process::Command::new("cmd")
                        .args(["/C", "openclaw", "gateway", "stop"])
                        .output();
                        
                    if let Ok(output) = stop_result {
                        if output.status.success() {
                            println!("   ✓ Gateway 정상 종료 성공");
                        } else {
                            println!("   ✗ Gateway 정상 종료 실패");
                        }
                    }
                    
                    // 2초 대기
                    std::thread::sleep(std::time::Duration::from_millis(2000));
                    
                    // 2. Windows: taskkill 사용
                    println!("2. 남은 프로세스 강제 종료...");
                    
                    // taskkill 시도 (관리자 권한 없어도 자신의 프로세스는 종료 가능)
                    let _ = std::process::Command::new("cmd")
                        .args(["/C", "taskkill /F /IM openclaw.exe 2>nul"])
                        .output();
                    
                    let _ = std::process::Command::new("cmd")
                        .args(["/C", "taskkill /F /IM openclaw-gateway.exe 2>nul"])
                        .output();
                    
                    let _ = std::process::Command::new("cmd")
                        .args(["/C", "taskkill /F /IM node.exe /FI \"WINDOWTITLE eq *openclaw*\" 2>nul"])
                        .output();
                    
                    // wmic는 Windows 11에서 deprecated, 조건부 사용
                    if let Ok(output) = std::process::Command::new("cmd")
                        .args(["/C", "wmic /?"])
                        .output() {
                        if output.status.success() {
                            let _ = std::process::Command::new("cmd")
                                .args(["/C", "wmic process where \"name like '%openclaw%'\" delete"])
                                .output();
                        }
                    }
                }
                
                #[cfg(not(windows))]
                {
                    let stop_result = std::process::Command::new("openclaw")
                        .args(["gateway", "stop"])
                        .output();
                        
                    if let Ok(output) = stop_result {
                        if output.status.success() {
                            println!("   ✓ Gateway 정상 종료 성공");
                        } else {
                            println!("   ✗ Gateway 정상 종료 실패");
                        }
                    }
                    
                    // 2초 대기
                    std::thread::sleep(std::time::Duration::from_millis(2000));
                    
                    // 2. 강제 종료 (fallback)
                    println!("2. 남은 프로세스 강제 종료...");
                    let _ = std::process::Command::new("pkill")
                        .args(["-9", "-f", "openclaw-gateway"])
                        .output();
                    
                    let _ = std::process::Command::new("pkill")
                        .args(["-f", "openclaw$"])
                        .output();
                    
                    // 3. systemd 서비스도 중지 (자동 재시작 방지)
                    println!("3. systemd 서비스 중지...");
                    let _ = std::process::Command::new("systemctl")
                        .args(["--user", "stop", "openclaw-gateway.service"])
                        .output();
                        
                    let _ = std::process::Command::new("systemctl")
                        .args(["--user", "disable", "openclaw-gateway.service"])
                        .output();
                }
                
                println!("OpenClaw Gateway 완전 정리 완료");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
