mod openclaw;
mod skills;
mod skill_definitions;

// Platform abstraction layer (new architecture for cross-platform support)
// Use platform::get_platform() for new code
// Existing windows_helper is kept for backward compatibility during migration
mod platform;

#[cfg(windows)]
mod windows_helper;

use tauri::Emitter;

// ===== macOS PATH 해결 =====
// macOS DMG/App으로 실행 시 shell profile(~/.zshrc 등)이 sourced 되지 않아
// node, npm, openclaw 등 CLI 도구를 찾지 못하는 문제를 해결합니다.

// macOS PATH 헬퍼 - openclaw 모듈에서 가져옴
#[cfg(target_os = "macos")]
fn get_macos_path() -> String {
    openclaw::get_macos_path()
}

/// macOS에서 PATH가 적용된 Command 빌더 반환
#[cfg(target_os = "macos")]
fn macos_cmd(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    cmd.env("PATH", get_macos_path());
    cmd
}

// Linux PATH 헬퍼 - openclaw 모듈에서 가져옴
#[cfg(all(not(windows), not(target_os = "macos")))]
fn get_linux_path() -> String {
    openclaw::get_linux_path()
}

/// Linux에서 PATH가 적용된 Command 빌더 반환
#[cfg(all(not(windows), not(target_os = "macos")))]
fn linux_cmd(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    cmd.env("PATH", get_linux_path());
    cmd
}

/// macOS에서 PATH가 적용된 tokio::process::Command 빌더 반환
#[cfg(target_os = "macos")]
fn macos_async_cmd(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    cmd.env("PATH", get_macos_path());
    cmd
}

// ===== 앱 삭제 =====

/// 앱 종료 후 자기 자신을 삭제하는 스크립트 실행
fn spawn_self_delete_script() -> Result<(), String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("실행 파일 경로를 찾을 수 없습니다: {}", e))?;
    
    #[cfg(target_os = "windows")]
    {
        // Tauri NSIS 언인스톨러 찾기 (설치 폴더에 Uninstall.exe 존재)
        let install_dir = exe.parent()
            .ok_or_else(|| "설치 폴더를 찾을 수 없습니다".to_string())?;
        let uninstaller = install_dir.join("Uninstall.exe");
        
        if uninstaller.exists() {
            // NSIS 언인스톨러: GUI 모드로 실행 (/S 제거 → 언인스톨 마법사 표시)
            let script = format!(
                "ping -n 2 127.0.0.1 >nul & start \"\" \"{}\"",
                uninstaller.display()
            );
            std::process::Command::new("cmd")
                .args(["/c", &script])
                .spawn()
                .map_err(|e| format!("삭제 스크립트 실행 실패: {}", e))?;
        } else {
            // 언인스톨러 없으면 cmd 창 열어서 삭제 (진행 상황 표시)
            let exe_path = exe.display().to_string();
            let script = format!(
                r#"@echo off
echo ====================================
echo   moldClaw 삭제 중...
echo ====================================
ping -n 3 127.0.0.1 >nul
del /f /q "{}"
echo.
echo 삭제 완료!
echo 이 창은 자동으로 닫힙니다...
ping -n 3 127.0.0.1 >nul"#,
                exe_path
            );
            
            std::process::Command::new("cmd")
                .args(["/c", &script])
                .spawn()
                .map_err(|e| format!("삭제 스크립트 실행 실패: {}", e))?;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: .app 번들 전체 삭제 (Contents/MacOS/binary → .app)
        let app_bundle = exe.parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .ok_or_else(|| "앱 번들 경로를 찾을 수 없습니다".to_string())?;
        
        let app_path = app_bundle.display().to_string();
        let escaped_path = app_path.replace("'", "'\\''");
        
        // Terminal.app 열어서 삭제 진행 (사용자에게 진행 상황 표시)
        let delete_script = if app_path.starts_with("/Applications") {
            // /Applications: sudo 필요
            format!(
                r#"echo '🗑️ moldClaw 삭제 중...'; echo ''; echo '경로: {}'; echo ''; sudo rm -rf '{}' && echo '✅ 삭제 완료!' || echo '❌ 삭제 실패'; echo ''; read -p '아무 키나 누르면 창이 닫힙니다...'"#,
                escaped_path, escaped_path
            )
        } else {
            // 사용자 경로: sudo 불필요
            format!(
                r#"echo '🗑️ moldClaw 삭제 중...'; echo ''; echo '경로: {}'; echo ''; rm -rf '{}' && echo '✅ 삭제 완료!' || echo '❌ 삭제 실패'; echo ''; read -p '아무 키나 누르면 창이 닫힙니다...'"#,
                escaped_path, escaped_path
            )
        };
        
        // osascript로 Terminal.app 열기
        let applescript = format!(
            r#"tell application "Terminal"
    activate
    do script "{}"
end tell"#,
            delete_script.replace("\"", "\\\"")
        );
        
        std::process::Command::new("osascript")
            .args(["-e", &applescript])
            .spawn()
            .map_err(|e| format!("삭제 스크립트 실행 실패: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        let exe_path = exe.display().to_string();
        let escaped_path = exe_path.replace("'", "'\\''");
        
        // 설치 방식에 따른 삭제 명령
        let delete_cmd = if exe_path.contains(".AppImage") || exe_path.starts_with("/tmp/.mount_") {
            format!("rm -f '{}'", escaped_path)
        } else if exe_path.starts_with("/usr") || exe_path.starts_with("/opt") {
            format!("sudo dpkg -r moldclaw 2>/dev/null || sudo rpm -e moldclaw 2>/dev/null || sudo rm -f '{}'", escaped_path)
        } else {
            format!("rm -f '{}'", escaped_path)
        };
        
        // 터미널에서 보이게 실행
        let terminal_script = format!(
            r#"echo '🗑️ moldClaw 삭제 중...'
echo ''
echo '경로: {}'
echo ''
{}
echo ''
echo '✅ 삭제 완료!'
echo ''
read -p '아무 키나 누르면 창이 닫힙니다...'"#,
            escaped_path, delete_cmd
        );
        
        // 여러 터미널 에뮬레이터 시도
        let terminals = [
            ("gnome-terminal", vec!["--", "bash", "-c"]),
            ("konsole", vec!["-e", "bash", "-c"]),
            ("xfce4-terminal", vec!["-e", "bash -c"]),
            ("xterm", vec!["-e", "bash", "-c"]),
        ];
        
        let mut launched = false;
        for (term, base_args) in &terminals {
            if std::process::Command::new("which")
                .arg(term)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                let mut args: Vec<&str> = base_args.clone();
                args.push(&terminal_script);
                
                if std::process::Command::new(term)
                    .args(&args)
                    .spawn()
                    .is_ok()
                {
                    launched = true;
                    break;
                }
            }
        }
        
        if !launched {
            // 터미널 못 찾으면 백그라운드로라도 실행
            std::process::Command::new("bash")
                .args(["-c", &format!("sleep 2 && {}", delete_cmd)])
                .spawn()
                .map_err(|e| format!("삭제 스크립트 실행 실패: {}", e))?;
        }
    }
    
    Ok(())
}

/// moldClaw만 삭제 (OpenClaw 데이터 유지)
#[tauri::command]
async fn uninstall_moldclaw_only(app: tauri::AppHandle) -> Result<String, String> {
    // Gateway 중지
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "Stop-Process -Name 'openclaw' -Force -ErrorAction SilentlyContinue"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-9", "-f", "openclaw.*gateway"])
            .output();
    }
    
    // 앱 자동 삭제 스크립트 실행 후 앱 종료
    spawn_self_delete_script()?;
    
    // 잠시 대기 후 앱 종료
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    app.exit(0);
    
    Ok("moldClaw 삭제 완료".into())
}

/// OpenClaw 데이터까지 전부 삭제
#[tauri::command]
async fn uninstall_with_openclaw(app: tauri::AppHandle) -> Result<String, String> {
    // 1. Gateway 중지
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "Stop-Process -Name 'openclaw' -Force -ErrorAction SilentlyContinue"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-9", "-f", "openclaw.*gateway"])
            .output();
    }
    
    // 2. OpenClaw 폴더 삭제 (~/.openclaw)
    if let Some(home) = dirs::home_dir() {
        let openclaw_dir = home.join(".openclaw");
        if openclaw_dir.exists() {
            let _ = std::fs::remove_dir_all(&openclaw_dir);
        }
    }
    
    // 3. OpenClaw npm 글로벌 패키지 제거
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let _ = std::process::Command::new("cmd")
            .args(["/C", "npm uninstall -g openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("npm")
            .args(["uninstall", "-g", "openclaw"])
            .output();
    }
    
    // 4. 앱 자동 삭제 스크립트 실행 후 앱 종료
    spawn_self_delete_script()?;
    
    // 잠시 대기 후 앱 종료
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    app.exit(0);
    
    Ok("전체 삭제 완료".into())
}

// ===== 환경 체크 =====

#[tauri::command]
fn check_node_installed() -> bool {
    #[cfg(windows)]
    {
        windows_helper::get_node_version().is_some()
    }
    #[cfg(target_os = "macos")]
    {
        macos_cmd("node")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
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
    #[cfg(target_os = "macos")]
    {
        macos_cmd("node")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
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
    #[cfg(target_os = "macos")]
    {
        macos_cmd("openclaw")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
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
    #[cfg(target_os = "macos")]
    {
        macos_cmd("openclaw")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
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

/// OpenClaw 설치 상태 검증 (설치 여부 + 실제 작동 여부)
#[tauri::command]
fn verify_openclaw_status() -> serde_json::Value {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // 1. openclaw 명령어 존재 여부
        let exists = std::process::Command::new("cmd")
            .args(["/C", "where openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        
        // 2. 실제 버전 출력 가능 여부
        let version_output = std::process::Command::new("cmd")
            .args(["/C", "openclaw --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        let (works, version) = match version_output {
            Ok(o) if o.status.success() => {
                let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
                (true, Some(v))
            }
            _ => (false, None),
        };
        
        // 3. 불완전 설치 판단: 명령어는 있는데 작동 안 함
        let incomplete = exists && !works;
        
        serde_json::json!({
            "exists": exists,
            "works": works,
            "version": version,
            "incomplete": incomplete
        })
    }
    
    #[cfg(target_os = "macos")]
    {
        let exists = macos_cmd("which")
            .args(["openclaw"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        let version_output = macos_cmd("openclaw")
            .args(["--version"])
            .output();

        let (works, version) = match version_output {
            Ok(o) if o.status.success() => {
                let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
                (true, Some(v))
            }
            _ => (false, None),
        };

        let incomplete = exists && !works;

        serde_json::json!({
            "exists": exists,
            "works": works,
            "version": version,
            "incomplete": incomplete
        })
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        let exists = std::process::Command::new("which")
            .args(["openclaw"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        let version_output = std::process::Command::new("openclaw")
            .args(["--version"])
            .output();

        let (works, version) = match version_output {
            Ok(o) if o.status.success() => {
                let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
                (true, Some(v))
            }
            _ => (false, None),
        };

        let incomplete = exists && !works;

        serde_json::json!({
            "exists": exists,
            "works": works,
            "version": version,
            "incomplete": incomplete
        })
    }
}

/// 불완전한 OpenClaw 설치 정리
#[tauri::command]
async fn cleanup_incomplete_openclaw() -> Result<String, String> {
    eprintln!("불완전한 OpenClaw 설치 정리 시작...");
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // 1. npm uninstall 시도
        let _ = std::process::Command::new("cmd")
            .args(["/C", "npm uninstall -g openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        // 2. 강제 삭제 (npm prefix 경로)
        let prefix_output = std::process::Command::new("cmd")
            .args(["/C", "npm config get prefix"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        if let Ok(output) = prefix_output {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !prefix.is_empty() {
                let files_to_remove = [
                    format!("{}\\openclaw", prefix),
                    format!("{}\\openclaw.cmd", prefix),
                    format!("{}\\openclaw.ps1", prefix),
                    format!("{}\\node_modules\\openclaw", prefix),
                ];
                
                for file_path in &files_to_remove {
                    let path = std::path::Path::new(file_path);
                    if path.exists() {
                        if path.is_dir() {
                            let _ = std::fs::remove_dir_all(path);
                        } else {
                            let _ = std::fs::remove_file(path);
                        }
                        eprintln!("정리됨: {}", file_path);
                    }
                }
            }
        }
        
        // 3. npm 캐시 정리
        let _ = std::process::Command::new("cmd")
            .args(["/C", "npm cache clean --force"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        eprintln!("불완전한 설치 정리 완료");
        Ok("불완전한 설치가 정리되었습니다.".to_string())
    }
    
    #[cfg(target_os = "macos")]
    {
        let _ = macos_cmd("npm")
            .args(["uninstall", "-g", "openclaw"])
            .output();
        let _ = macos_cmd("npm")
            .args(["cache", "clean", "--force"])
            .output();
        Ok("불완전한 설치가 정리되었습니다.".to_string())
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("npm")
            .args(["uninstall", "-g", "openclaw"])
            .output();
        let _ = std::process::Command::new("npm")
            .args(["cache", "clean", "--force"])
            .output();
        Ok("불완전한 설치가 정리되었습니다.".to_string())
    }
}

/// OpenClaw 설치 (npm install -g openclaw) - 에러 자동 복구 포함
#[tauri::command]
async fn install_openclaw() -> Result<String, String> {
    // 설치 전 불완전 설치 확인 및 정리
    let status = verify_openclaw_status();
    if status["incomplete"].as_bool().unwrap_or(false) {
        eprintln!("불완전한 이전 설치 감지 - 정리 후 재설치");
        let _ = cleanup_incomplete_openclaw().await;
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    
    #[cfg(windows)]
    {
        // 에러 핸들링 및 자동 복구 시스템 사용
        windows_helper::install_openclaw_with_recovery()
    }
    #[cfg(target_os = "macos")]
    {
        let output = macos_cmd("npm")
            .args(["install", "-g", "openclaw", "--ignore-scripts"])
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("OpenClaw 설치 완료!".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // EACCES 오류: npm global 권한 문제 → 사용자 디렉토리로 재시도
            if stderr.contains("EACCES") || stderr.contains("permission") {
                let output2 = macos_cmd("npm")
                    .args(["install", "-g", "openclaw", "--ignore-scripts", "--prefix",
                           &format!("{}/Library/npm", std::env::var("HOME").unwrap_or_default())])
                    .output()
                    .map_err(|e| format!("npm 실행 실패: {}", e))?;
                if output2.status.success() {
                    return Ok("OpenClaw 설치 완료! (사용자 디렉토리)".to_string());
                }
            }
            Err(format!("설치 실패: {}", stderr))
        }
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        let output = std::process::Command::new("npm")
            .args(["install", "-g", "openclaw", "--ignore-scripts"])
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;

        if output.status.success() {
            Ok("OpenClaw 설치 완료!".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
}

// ===== 공식 형식 Config 생성 (Device Identity 포함) =====

#[tauri::command]
async fn create_official_config(gateway_port: u16, gateway_bind: String) -> Result<String, String> {
    openclaw::create_official_config(gateway_port, &gateway_bind).await
}

#[tauri::command]
fn ensure_device_identity() -> Result<openclaw::DeviceIdentity, String> {
    openclaw::ensure_device_identity()
}

#[tauri::command]
fn generate_gateway_token() -> String {
    openclaw::generate_gateway_token()
}

#[tauri::command]
async fn add_model_to_config(provider: String, model: String, api_key: String) -> Result<(), String> {
    openclaw::add_model_to_config(&provider, &model, &api_key).await
}

#[tauri::command]
async fn add_channel_to_config(
    channel: String,
    bot_token: String,
    dm_policy: String,
    allow_from: Vec<String>,
    group_policy: String,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    openclaw::add_channel_to_config(&channel, &bot_token, &dm_policy, &allow_from, &group_policy, &group_allow_from, require_mention).await
}

// ===== 설정 (레거시 - 하위 호환성) =====

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

/// WhatsApp QR 로그인 (터미널 창에서 QR 표시)
#[tauri::command]
async fn login_whatsapp() -> Result<String, String> {
    openclaw::login_whatsapp().await
}

/// WhatsApp 로그인 터미널 열기 (비동기, 대기 안 함)
#[tauri::command]
fn open_whatsapp_login_terminal() -> Result<(), String> {
    openclaw::open_whatsapp_login_terminal()
}

/// WhatsApp 인증 상태 확인
#[tauri::command]
fn check_whatsapp_linked() -> bool {
    openclaw::check_whatsapp_linked()
}

#[tauri::command]
async fn stop_gateway() -> Result<(), String> {
    openclaw::stop_gateway().await
}

#[tauri::command]
async fn restart_gateway() -> Result<String, String> {
    openclaw::restart_gateway().await
}

/// OpenClaw 삭제 (npm uninstall + 설정 폴더 삭제 + 검증)
#[tauri::command]
async fn uninstall_openclaw() -> Result<String, String> {
    eprintln!("OpenClaw 삭제 시작...");
    let mut warnings: Vec<String> = vec![];
    
    // 1. 먼저 Gateway 종료
    let _ = openclaw::stop_gateway().await;
    std::thread::sleep(std::time::Duration::from_secs(1));
    
    // 2. npm uninstall
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let uninstall_result = std::process::Command::new("cmd")
            .args(["/C", "npm uninstall -g openclaw"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        match uninstall_result {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    eprintln!("npm uninstall 경고: {}", stderr);
                    warnings.push(format!("npm uninstall 경고: {}", stderr));
                }
            }
            Err(e) => {
                eprintln!("npm uninstall 실행 실패: {}", e);
                warnings.push(format!("npm uninstall 실행 실패: {}", e));
            }
        }
        
        // npm uninstall 후에도 남아있으면 강제 삭제 시도
        std::thread::sleep(std::time::Duration::from_millis(500));
        if is_openclaw_installed_sync() {
            eprintln!("npm uninstall 후에도 openclaw 존재 - 강제 삭제 시도");
            if let Err(e) = force_remove_openclaw() {
                warnings.push(format!("강제 삭제 실패: {}", e));
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        let uninstall_result = std::process::Command::new("npm")
            .args(["uninstall", "-g", "openclaw"])
            .output();
        
        match uninstall_result {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    eprintln!("npm uninstall 경고: {}", stderr);
                    warnings.push(format!("npm uninstall 경고: {}", stderr));
                }
            }
            Err(e) => {
                eprintln!("npm uninstall 실행 실패: {}", e);
                warnings.push(format!("npm uninstall 실행 실패: {}", e));
            }
        }
    }
    
    // 3. 설정 폴더 삭제
    if let Some(home) = dirs::home_dir() {
        // ~/.openclaw 삭제
        let openclaw_dir = home.join(".openclaw");
        if openclaw_dir.exists() {
            match std::fs::remove_dir_all(&openclaw_dir) {
                Ok(_) => eprintln!("~/.openclaw 삭제됨"),
                Err(e) => {
                    eprintln!("~/.openclaw 삭제 실패: {}", e);
                    warnings.push(format!("~/.openclaw 삭제 실패: {}", e));
                }
            }
        }
        
        // ~/.config/openclaw 삭제
        let config_dir = home.join(".config").join("openclaw");
        if config_dir.exists() {
            match std::fs::remove_dir_all(&config_dir) {
                Ok(_) => eprintln!("~/.config/openclaw 삭제됨"),
                Err(e) => {
                    eprintln!("~/.config/openclaw 삭제 실패: {}", e);
                    warnings.push(format!("~/.config/openclaw 삭제 실패: {}", e));
                }
            }
        }
    }
    
    // 4. 삭제 검증
    std::thread::sleep(std::time::Duration::from_millis(500));
    let still_installed = is_openclaw_installed_sync();
    
    if still_installed {
        eprintln!("경고: 삭제 후에도 openclaw가 감지됨");
        warnings.push("삭제 후에도 openclaw CLI가 감지됩니다. 수동 삭제가 필요할 수 있습니다.".to_string());
    }
    
    eprintln!("OpenClaw 삭제 완료 (경고: {}개)", warnings.len());
    
    if warnings.is_empty() {
        Ok("OpenClaw가 성공적으로 삭제되었습니다.".to_string())
    } else {
        Ok(format!("OpenClaw 삭제 완료 (일부 경고 발생):\n{}", warnings.join("\n")))
    }
}

/// OpenClaw 설치 여부 확인 (동기)
fn is_openclaw_installed_sync() -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        std::process::Command::new("cmd")
            .args(["/C", "openclaw --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    #[cfg(target_os = "macos")]
    {
        macos_cmd("openclaw")
            .args(["--version"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        std::process::Command::new("openclaw")
            .args(["--version"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// OpenClaw 강제 삭제 (npm prefix 경로에서 직접 삭제)
#[cfg(windows)]
fn force_remove_openclaw() -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    // npm prefix 경로 가져오기
    let prefix_output = std::process::Command::new("cmd")
        .args(["/C", "npm config get prefix"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("npm prefix 확인 실패: {}", e))?;
    
    let prefix = String::from_utf8_lossy(&prefix_output.stdout).trim().to_string();
    if prefix.is_empty() {
        return Err("npm prefix가 비어있음".to_string());
    }
    
    eprintln!("npm prefix: {}", prefix);
    
    // openclaw 관련 파일들 삭제
    let files_to_remove = [
        format!("{}\\openclaw", prefix),
        format!("{}\\openclaw.cmd", prefix),
        format!("{}\\openclaw.ps1", prefix),
        format!("{}\\node_modules\\openclaw", prefix),
    ];
    
    for file_path in &files_to_remove {
        let path = std::path::Path::new(file_path);
        if path.exists() {
            if path.is_dir() {
                let _ = std::fs::remove_dir_all(path);
                eprintln!("삭제됨: {}", file_path);
            } else {
                let _ = std::fs::remove_file(path);
                eprintln!("삭제됨: {}", file_path);
            }
        }
    }
    
    Ok(())
}

/// moldClaw 삭제 (MSI Uninstaller 실행)
#[tauri::command]
async fn uninstall_moldclaw() -> Result<(), String> {
    eprintln!("moldClaw 삭제 시작...");
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        // 방법 1: 레지스트리에서 UninstallString 찾아서 실행 (가장 빠름)
        // PowerShell로 레지스트리 검색 후 msiexec 실행
        let ps_script = r#"
            $paths = @(
                'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
                'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
                'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
            )
            foreach ($path in $paths) {
                $app = Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*moldClaw*' }
                if ($app) {
                    $uninstall = $app.UninstallString
                    if ($uninstall) {
                        Write-Output $uninstall
                        exit 0
                    }
                }
            }
            exit 1
        "#;
        
        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_script])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                let uninstall_cmd = String::from_utf8_lossy(&output.stdout).trim().to_string();
                eprintln!("UninstallString 발견: {}", uninstall_cmd);
                
                // msiexec 명령어 실행 (보통 "MsiExec.exe /I{GUID}" 형식)
                // /I를 /X로 변경해야 삭제됨
                let uninstall_cmd = uninstall_cmd.replace("/I", "/X");
                
                // 다이얼로그 표시 (quiet 없음) - 사용자 확인 동안 앱 종료됨
                let _ = std::process::Command::new("cmd")
                    .args(["/C", &uninstall_cmd])
                    .spawn();
                
                eprintln!("MSI Uninstaller 실행됨 - 앱 즉시 종료");
                std::process::exit(0);  // 즉시 종료 → 파일 잠금 해제
            }
        }
        
        // 방법 2: 직접 uninstall.exe 찾기
        let program_files = std::env::var("PROGRAMFILES").unwrap_or_default();
        let uninstaller_paths = vec![
            format!("{}\\moldClaw\\uninstall.exe", program_files),
            format!("{}\\moldClaw\\Uninstall moldClaw.exe", program_files),
        ];
        
        for path in uninstaller_paths {
            if std::path::Path::new(&path).exists() {
                eprintln!("Uninstaller 발견: {}", path);
                let _ = std::process::Command::new(&path)
                    .spawn();  // Silent 없음 - 다이얼로그 표시
                eprintln!("Uninstaller 실행됨 - 앱 즉시 종료");
                std::process::exit(0);  // 즉시 종료 → 파일 잠금 해제
            }
        }
        
        // 삭제 실패 시 안내
        Err("언인스톨러를 찾을 수 없습니다.\n\n제어판 > 프로그램 제거에서 'moldClaw'를 직접 삭제해 주세요.".to_string())
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: /Applications/moldClaw.app 삭제
        let app_path = "/Applications/moldClaw.app";
        if std::path::Path::new(app_path).exists() {
            // Finder에서 삭제 (Trash로 이동)
            let script = format!(
                r#"tell application "Finder" to delete POSIX file "{}""#,
                app_path
            );
            let result = std::process::Command::new("osascript")
                .args(["-e", &script])
                .output();

            match result {
                Ok(o) if o.status.success() => {
                    eprintln!("moldClaw.app 휴지통으로 이동됨");
                    std::process::exit(0);
                }
                _ => {
                    // osascript 실패 시 rm -rf 시도
                    let rm = std::process::Command::new("rm")
                        .args(["-rf", app_path])
                        .output();
                    if rm.map(|o| o.status.success()).unwrap_or(false) {
                        eprintln!("moldClaw.app 삭제됨");
                        std::process::exit(0);
                    }
                }
            }
        }

        Err("앱을 찾을 수 없습니다.\n/Applications 폴더에서 moldClaw를 직접 삭제해 주세요.".to_string())
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        Err("앱을 직접 삭제해 주세요.".to_string())
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
    
    #[cfg(target_os = "macos")]
    {
        let check = macos_cmd("which").arg("openclaw").output();
        if check.is_err() || !check.unwrap().status.success() {
            eprintln!("OpenClaw 미설치 - 바로 종료");
            return Ok(());
        }
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
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
fn get_full_config() -> serde_json::Value {
    openclaw::get_full_config()
}

// ===== 부분 읽기/업데이트 (재설정용) =====

#[tauri::command]
fn get_model_config() -> serde_json::Value {
    openclaw::get_model_config()
}

#[tauri::command]
fn get_messenger_config() -> serde_json::Value {
    openclaw::get_messenger_config()
}

#[tauri::command]
fn get_enabled_channels() -> Vec<String> {
    openclaw::get_enabled_channels()
}

#[tauri::command]
fn get_integrations_config() -> serde_json::Value {
    openclaw::get_integrations_config()
}

#[tauri::command]
async fn update_model_config(provider: String, model: String, api_key: String) -> Result<(), String> {
    openclaw::update_model_config(&provider, &model, &api_key).await
}

#[tauri::command]
async fn update_messenger_config(
    channel: String,
    token: String,
    dm_policy: String,
    allow_from: Vec<String>,
    group_policy: String,
    group_allow_from: Vec<String>,
    require_mention: bool,
) -> Result<(), String> {
    openclaw::update_messenger_config(&channel, &token, &dm_policy, &allow_from, &group_policy, &group_allow_from, require_mention).await
}

#[tauri::command]
async fn update_integrations_config(integrations: serde_json::Value) -> Result<(), String> {
    openclaw::update_integrations_config(integrations).await
}

#[tauri::command]
fn has_config() -> bool {
    openclaw::has_config()
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

#[tauri::command]
fn save_browser_config() -> Result<(), String> {
    openclaw::save_browser_config()
}

#[tauri::command]
fn get_browser_config() -> serde_json::Value {
    openclaw::get_browser_config()
}

#[tauri::command]
fn disable_browser_config() -> Result<(), String> {
    openclaw::disable_browser_config()
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
    // ~/.openclaw/cron/jobs.json 파일 직접 읽기 (더 안정적)
    let jobs_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("cron").join("jobs.json"))
        .ok_or("홈 디렉토리를 찾을 수 없습니다.")?;
    
    eprintln!("Cron jobs 파일 경로: {:?}", jobs_path);
    
    if !jobs_path.exists() {
        eprintln!("Cron jobs 파일이 없음");
        return Ok(serde_json::json!({
            "jobs": [],
            "info": "아직 설정된 알림이 없습니다."
        }).to_string());
    }
    
    // 파일 읽기
    let content = std::fs::read_to_string(&jobs_path)
        .map_err(|e| format!("파일 읽기 실패: {}", e))?;
    
    eprintln!("Cron jobs 파일 내용: {}", content);
    
    // JSON 파싱
    let parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;
    
    // jobs 배열 추출
    let jobs = parsed.get("jobs").cloned().unwrap_or(serde_json::json!([]));
    
    // moldClaw UI 형식으로 변환
    let formatted_jobs: Vec<serde_json::Value> = jobs.as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|job| {
            // state에서 실행 정보 추출
            let state = job.get("state");
            let next_run_ms = state.and_then(|s| s.get("nextRunAtMs")).and_then(|v| v.as_i64());
            let last_run_ms = state.and_then(|s| s.get("lastRunAtMs")).and_then(|v| v.as_i64());
            
            // 밀리초 타임스탬프를 읽기 쉬운 형식으로 변환
            let next_run = next_run_ms.map(|ms| format_timestamp_ms(ms));
            let last_run = last_run_ms.map(|ms| format_timestamp_ms(ms));
            
            // payload에서 메시지 추출 (이름이 없을 경우 대체용)
            let payload_msg = job.get("payload")
                .and_then(|p| p.get("message"))
                .and_then(|m| m.as_str());
            
            let name = job.get("name")
                .and_then(|v| v.as_str())
                .or(payload_msg)
                .unwrap_or("이름 없는 알림");
            
            serde_json::json!({
                "id": job.get("id").and_then(|v| v.as_str()).unwrap_or("unknown"),
                "name": name,
                "schedule": format_schedule(job.get("schedule")),
                "enabled": job.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
                "lastRun": last_run,
                "nextRun": next_run,
            })
        })
        .collect();
    
    eprintln!("변환된 jobs: {:?}", formatted_jobs);
    
    Ok(serde_json::json!({ "jobs": formatted_jobs }).to_string())
}

// schedule 객체를 읽기 쉬운 문자열로 변환
// 밀리초 타임스탬프를 읽기 쉬운 형식으로 변환
fn format_timestamp_ms(ms: i64) -> String {
    use chrono::{DateTime, Local, TimeZone};
    
    let secs = ms / 1000;
    let nsecs = ((ms % 1000) * 1_000_000) as u32;
    
    if let Some(dt) = DateTime::from_timestamp(secs, nsecs) {
        let local: DateTime<Local> = dt.with_timezone(&Local);
        local.format("%m/%d %H:%M").to_string()
    } else {
        "알 수 없음".to_string()
    }
}

fn format_schedule(schedule: Option<&serde_json::Value>) -> String {
    match schedule {
        Some(s) => {
            let kind = s.get("kind").and_then(|v| v.as_str()).unwrap_or("unknown");
            match kind {
                "at" => {
                    let at = s.get("at").and_then(|v| v.as_str()).unwrap_or("?");
                    format!("1회: {}", at)
                }
                "every" => {
                    let ms = s.get("everyMs").and_then(|v| v.as_u64()).unwrap_or(0);
                    let hours = ms / 3600000;
                    let mins = (ms % 3600000) / 60000;
                    if hours > 0 {
                        format!("{}시간마다", hours)
                    } else {
                        format!("{}분마다", mins)
                    }
                }
                "cron" => {
                    let expr = s.get("expr").and_then(|v| v.as_str()).unwrap_or("?");
                    format!("cron: {}", expr)
                }
                _ => "알 수 없음".to_string()
            }
        }
        None => "알 수 없음".to_string()
    }
}

/// Cron job 삭제
#[tauri::command]
async fn delete_cron_job(job_id: String) -> Result<(), String> {
    #[cfg(windows)]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        tokio::process::Command::new("cmd")
            .args(["/C", &format!("openclaw cron remove {} --timeout 5000", job_id)])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .await
            .map_err(|e| format!("openclaw 실행 실패: {}", e))?
    };
    
    #[cfg(not(windows))]
    let output = tokio::process::Command::new("openclaw")
        .args(["cron", "remove", &job_id, "--timeout", "5000"])
        .output()
        .await
        .map_err(|e| format!("openclaw 실행 실패: {}", e))?;
    
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("삭제 실패: {}", stderr))
    }
}

/// Cron job 활성화/비활성화
#[tauri::command]
async fn toggle_cron_job(job_id: String, enabled: bool) -> Result<(), String> {
    // OpenClaw cron update로 enabled 상태 변경
    let enabled_str = if enabled { "true" } else { "false" };
    
    #[cfg(windows)]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        tokio::process::Command::new("cmd")
            .args(["/C", &format!("openclaw cron update {} --enabled {} --timeout 5000", job_id, enabled_str)])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .await
            .map_err(|e| format!("openclaw 실행 실패: {}", e))?
    };
    
    #[cfg(not(windows))]
    let output = tokio::process::Command::new("openclaw")
        .args(["cron", "update", &job_id, "--enabled", enabled_str, "--timeout", "5000"])
        .output()
        .await
        .map_err(|e| format!("openclaw 실행 실패: {}", e))?;
    
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("상태 변경 실패: {}", stderr))
    }
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

/// 대화 기록 조회 (openclaw sessions list 사용)
/// 메시지 자르기
fn truncate_message(msg: &str, max_len: usize) -> String {
    if msg.len() > max_len {
        format!("{}...", &msg[..max_len])
    } else {
        msg.to_string()
    }
}

/// 타임스탬프 포맷 (ISO -> 읽기 쉬운 형식)
fn format_timestamp(ts: &str) -> String {
    // ISO 8601 형식 파싱 시도
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
        let local = dt.with_timezone(&chrono::Local);
        local.format("%m/%d %H:%M").to_string()
    } else {
        ts.to_string()
    }
}

/// Gateway 로그 조회 (cache-trace.jsonl 파싱)
#[tauri::command]
async fn get_gateway_logs() -> Result<String, String> {
    use std::io::{BufRead, BufReader};
    use std::fs::File;
    
    let log_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("logs").join("cache-trace.jsonl"))
        .unwrap_or_default();
    
    if !log_path.exists() {
        return Ok(serde_json::json!({ "logs": [] }).to_string());
    }
    
    // 파일 읽기 (최근 100줄만)
    let file = File::open(&log_path)
        .map_err(|e| format!("로그 파일 열기 실패: {}", e))?;
    
    let reader = BufReader::new(file);
    let lines: Vec<String> = reader.lines()
        .filter_map(|l| l.ok())
        .collect();
    
    // 최근 100줄만 처리 (역순으로)
    let recent_lines: Vec<&String> = lines.iter().rev().take(100).collect();
    
    let mut logs: Vec<serde_json::Value> = Vec::new();
    
    for line in recent_lines.into_iter().rev() {
        if let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) {
            // 로그 레벨 결정
            let level = determine_log_level(&entry);
            
            // 타임스탬프
            let timestamp = entry.get("ts")
                .and_then(|v| v.as_str())
                .map(|s| format_timestamp(s))
                .unwrap_or_default();
            
            // 메시지 구성
            let stage = entry.get("stage")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            
            let message = if let Some(err) = entry.get("errorMessage").and_then(|v| v.as_str()) {
                err.to_string()
            } else if let Some(prompt) = entry.get("prompt").and_then(|v| v.as_str()) {
                truncate_message(prompt, 200)
            } else {
                format!("[{}] {}", 
                    entry.get("sessionKey").and_then(|v| v.as_str()).unwrap_or(""),
                    stage
                )
            };
            
            // 소스
            let source = entry.get("provider")
                .and_then(|v| v.as_str())
                .or_else(|| entry.get("modelId").and_then(|v| v.as_str()))
                .map(|s| s.to_string());
            
            logs.push(serde_json::json!({
                "timestamp": timestamp,
                "level": level,
                "message": message,
                "source": source
            }));
        }
    }
    
    Ok(serde_json::json!({ "logs": logs }).to_string())
}

/// 로그 엔트리에서 레벨 결정
fn determine_log_level(entry: &serde_json::Value) -> &'static str {
    // 에러 메시지가 있으면 error
    if entry.get("errorMessage").is_some() {
        return "error";
    }
    
    // stage별 레벨 결정
    let stage = entry.get("stage").and_then(|v| v.as_str()).unwrap_or("");
    match stage {
        s if s.contains("error") => "error",
        s if s.contains("warn") => "warn",
        "prompt:before" | "prompt:after" => "debug",
        _ => "info",
    }
}

/// Gateway 로그 삭제
#[tauri::command]
async fn clear_gateway_logs() -> Result<(), String> {
    let log_path = dirs::home_dir()
        .map(|h| h.join(".openclaw").join("logs").join("cache-trace.jsonl"))
        .unwrap_or_default();
    
    if log_path.exists() {
        std::fs::remove_file(&log_path)
            .map_err(|e| format!("로그 파일 삭제 실패: {}", e))?;
    }
    
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

// ===== 특수 채널 설정 =====

/// Slack App Token 설정 (Socket Mode용)
#[tauri::command]
async fn set_slack_app_token(app_token: String) -> Result<(), String> {
    openclaw::set_slack_app_token(&app_token).await
}

/// Google Chat Service Account 파일 경로 설정
#[tauri::command]
async fn set_googlechat_service_account(file_path: String) -> Result<(), String> {
    openclaw::set_googlechat_service_account(&file_path).await
}

/// Mattermost URL 설정
#[tauri::command]
async fn set_mattermost_url(url: String) -> Result<(), String> {
    openclaw::set_mattermost_url(&url).await
}

// ===== Gmail 연동 (gog/gogcli) =====

/// gog 설치 여부 확인
#[tauri::command]
fn check_gog_installed() -> bool {
    openclaw::check_gog_installed()
}

/// gog 버전 확인
#[tauri::command]
async fn get_gog_version() -> Result<String, String> {
    openclaw::get_gog_version().await
}

/// gog 자동 설치
#[tauri::command]
async fn install_gog() -> Result<String, String> {
    openclaw::install_gog().await
}

/// gog OAuth 인증 시작
#[tauri::command]
async fn start_gog_auth() -> Result<String, String> {
    openclaw::start_gog_auth().await
}

/// gog 인증 상태 확인
#[tauri::command]
async fn check_gog_auth() -> Result<String, String> {
    openclaw::check_gog_auth().await
}

/// Gmail 폴링 설정
#[tauri::command]
async fn setup_gmail_polling(account: String, interval_minutes: u32) -> Result<(), String> {
    openclaw::setup_gmail_polling(&account, interval_minutes).await
}

/// Gmail 연동 해제
#[tauri::command]
async fn disconnect_gmail() -> Result<(), String> {
    openclaw::disconnect_gmail().await
}

/// Gmail 연동 상태 확인
#[tauri::command]
async fn get_gmail_status() -> Result<serde_json::Value, String> {
    openclaw::get_gmail_status().await
}

/// gog credentials 등록
#[tauri::command]
async fn register_gog_credentials(credentials_path: String) -> Result<(), String> {
    openclaw::register_gog_credentials(&credentials_path).await
}

/// gog credentials 등록 여부 확인
#[tauri::command]
fn check_gog_credentials() -> bool {
    openclaw::check_gog_credentials()
}

// ===== Windows 전용 명령어 =====

/// Windows 필수 프로그램 상태 확인
#[cfg(windows)]
#[tauri::command]
fn check_prerequisites() -> windows_helper::PrerequisiteStatus {
    windows_helper::check_prerequisites()
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn check_prerequisites() -> serde_json::Value {
    // node 설치 여부 실제 확인
    let node_version = macos_cmd("node")
        .arg("--version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    let node_installed = node_version.is_some();

    // node 버전 호환성 확인 (22.x 이상 필수, OpenClaw 요구사항)
    let node_compatible = node_version.as_ref().map(|v| {
        let v = v.trim_start_matches('v');
        v.split('.').next()
            .and_then(|major| major.parse::<u32>().ok())
            .map(|major| major >= 22)
            .unwrap_or(false)
    }).unwrap_or(false);

    let npm_installed = macos_cmd("npm")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    // 디스크 공간 확인
    let disk_space_gb: f64 = std::process::Command::new("df")
        .args(["-g", "/"])
        .output()
        .ok()
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout);
            s.lines().nth(1).and_then(|line| {
                line.split_whitespace().nth(3).and_then(|v| v.parse().ok())
            })
        })
        .unwrap_or(100.0);

    serde_json::json!({
        "node_installed": node_installed,
        "node_version": node_version,
        "node_compatible": node_compatible,
        "npm_installed": npm_installed,
        "vc_redist_installed": true,  // macOS 비해당
        "disk_space_gb": disk_space_gb,
        "disk_space_ok": disk_space_gb >= 2.0,
        "antivirus_detected": null
    })
}

#[cfg(all(not(windows), not(target_os = "macos")))]
#[tauri::command]
fn check_prerequisites() -> serde_json::Value {
    serde_json::json!({
        "node_installed": true,
        "node_version": null,
        "node_compatible": true,
        "npm_installed": true,
        "vc_redist_installed": true,
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

#[cfg(target_os = "macos")]
#[tauri::command]
fn install_nodejs() -> Result<String, String> {
    // 1. Homebrew로 Node.js 설치 시도
    // 먼저 기본 PATH로 시도, 실패 시 확장 PATH로 재시도
    let brew_available = std::process::Command::new("brew")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
        || macos_cmd("brew")  // fallback: 확장 PATH로 재시도
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

    if brew_available {
        // brew install node@22 실행 (확장 PATH 사용)
        let output = macos_cmd("brew")
            .args(["install", "node@22"])
            .output()
            .map_err(|e| format!("brew 실행 실패: {}", e))?;

        if output.status.success() {
            // brew link (확장 PATH 사용)
            let _ = macos_cmd("brew")
                .args(["link", "--overwrite", "--force", "node@22"])
                .output();
            return Ok("Node.js 22가 Homebrew로 설치되었습니다. 앱을 재시작해주세요.".to_string());
        }
    }

    // 2. Homebrew 없음 → Node.js 공식 PKG 다운로드 안내
    // open으로 브라우저 열기
    let _ = std::process::Command::new("open")
        .arg("https://nodejs.org/dist/v22.16.0/node-v22.16.0.pkg")
        .spawn();

    Err("Homebrew가 없습니다. 브라우저에서 Node.js 설치 파일을 다운로드합니다.\n설치 후 앱을 재시작해주세요.".to_string())
}

#[cfg(all(not(windows), not(target_os = "macos")))]
#[tauri::command]
fn install_nodejs() -> Result<String, String> {
    // fnm 설치 스크립트 (Linuxbrew 없을 때 사용)
    let fnm_install_script = r#"
echo '🚀 fnm (Fast Node Manager) 설치 중...'
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true
export PATH="$HOME/.local/share/fnm:$PATH"
eval "$(fnm env)"
echo '📦 Node.js LTS 설치 중...'
fnm install --lts
fnm use --lts
fnm default --lts
echo ''
echo '✅ Node.js 설치 완료!'
node --version
echo ''
echo '⚠️ 이 창을 닫고 moldClaw를 재시작해주세요.'
read -p '아무 키나 누르세요...'
"#;

    // 1. Linuxbrew 확인 → brew install node
    let brew_available = linux_cmd("brew")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let install_script: &str;
    if brew_available {
        install_script = "brew install node@22 && brew link --overwrite --force node@22; echo '설치 완료! 이 창을 닫아주세요.'; read -p ''";
    } else {
        install_script = fnm_install_script;
    }

    // xfce4-terminal용 명령 (lifetime 문제 해결)
    let xfce_cmd = format!("bash -c '{}'", install_script.replace("'", "'\\''"));

    // 터미널 에뮬레이터 목록 (순서대로 시도)
    let terminal_configs: Vec<(&str, Vec<&str>)> = vec![
        ("gnome-terminal", vec!["--", "bash", "-c", install_script]),
        ("konsole", vec!["-e", "bash", "-c", install_script]),
        ("xterm", vec!["-e", "bash", "-c", install_script]),
        ("tilix", vec!["-e", "bash", "-c", install_script]),
        ("xfce4-terminal", vec!["--command", &xfce_cmd]),
    ];

    for (term, args) in &terminal_configs {
        // 터미널이 설치되어 있는지 확인
        if std::process::Command::new("which")
            .arg(term)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            if linux_cmd(term).args(args.clone()).spawn().is_ok() {
                if brew_available {
                    return Ok("터미널에서 Homebrew로 Node.js 설치 중입니다.\n설치 완료 후 앱을 재시작해주세요.".to_string());
                } else {
                    return Ok("터미널에서 fnm으로 Node.js 설치 중입니다.\n설치 완료 후 앱을 재시작해주세요.".to_string());
                }
            }
        }
    }

    // 최종 fallback → 브라우저로 nodejs.org 열기
    let _ = std::process::Command::new("xdg-open")
        .arg("https://nodejs.org/en/download/")
        .spawn();

    Err("터미널을 찾을 수 없습니다. 브라우저에서 Node.js를 다운로드해주세요.\n설치 후 앱을 재시작해주세요.".to_string())
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
    
    #[cfg(target_os = "macos")]
    {
        // macOS: node 확인 후 없으면 Homebrew 또는 공홈 안내
        let node_version = macos_cmd("node")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

        if let Some(version) = node_version {
            messages.push(format!("✓ Node.js {} 설치됨", version));
        } else {
            // Homebrew로 설치 시도 (기본 PATH → 확장 PATH 순서로 체크)
            let brew_ok = std::process::Command::new("brew")
                .arg("--version").output().map(|o| o.status.success()).unwrap_or(false)
                || macos_cmd("brew")  // fallback: 확장 PATH로 재시도
                    .arg("--version").output().map(|o| o.status.success()).unwrap_or(false);
            if brew_ok {
                messages.push("Node.js 설치 중 (Homebrew)...".to_string());
                match install_nodejs() {
                    Ok(msg) => messages.push(format!("✓ {}", msg)),
                    Err(e) => return Err(e),
                }
            } else {
                return Err("Node.js가 설치되어 있지 않습니다.\nhttps://nodejs.org 에서 Node.js 22 LTS를 설치해주세요.".to_string());
            }
        }
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // 환경 체크
            check_node_installed,
            get_node_version,
            check_openclaw_installed,
            get_openclaw_version,
            // 설치
            install_openclaw,
            verify_openclaw_status,
            cleanup_incomplete_openclaw,
            install_prerequisites,
            // 공식 형식 Config (Device Identity 포함)
            create_official_config,
            ensure_device_identity,
            generate_gateway_token,
            add_model_to_config,
            add_channel_to_config,
            // 설정 (레거시)
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
            login_whatsapp,
            open_whatsapp_login_terminal,
            check_whatsapp_linked,
            stop_gateway,
            restart_gateway,
            // Onboard
            run_full_onboard,
            validate_config,
            get_full_config,
            get_model_config,
            get_messenger_config,
            get_enabled_channels,
            get_integrations_config,
            update_model_config,
            update_messenger_config,
            update_integrations_config,
            has_config,
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
            save_browser_config,
            get_browser_config,
            disable_browser_config,
            get_dashboard_url,
            // Windows 전용
            check_prerequisites,
            install_nodejs,
            refresh_path,
            analyze_install_error,
            install_vc_redist,
            // 삭제/종료
            uninstall_openclaw,
            uninstall_moldclaw,
            cleanup_before_exit,
            // 새 UI 관련
            get_cron_jobs,
            delete_cron_job,
            toggle_cron_job,
            get_workspace_files,
            open_file,
            open_workspace_folder,
            get_gateway_logs,
            clear_gateway_logs,
            get_channel_status,
            get_usage_stats,
            // 특수 채널 설정
            set_slack_app_token,
            set_googlechat_service_account,
            set_mattermost_url,
            // Gmail 연동 (gog)
            check_gog_installed,
            get_gog_version,
            install_gog,
            start_gog_auth,
            check_gog_auth,
            setup_gmail_polling,
            disconnect_gmail,
            get_gmail_status,
            register_gog_credentials,
            check_gog_credentials,
            // 스킬 관리
            skills::get_prerequisites,
            skills::get_skills_status,
            skills::get_skill_definitions,
            skills::install_prerequisite,
            skills::install_skill,
            skills::configure_skill_api_key,
            skills::open_skill_login_terminal,
            skills::disconnect_skill,
            skills::uninstall_skill,
            skills::disable_skill,
            skills::enable_skill,
            // 스킬 마법사 지원 함수들
            skills::poll_skill_config,
            skills::save_bear_token,
            skills::get_camsnap_cameras,
            skills::save_camsnap_camera,
            skills::delete_camsnap_camera,
            skills::save_obsidian_vault,
            skills::get_obsidian_vault,
            // 앱 삭제
            uninstall_moldclaw_only,
            uninstall_with_openclaw,
        ])
        .setup(|_app| {
            eprintln!("moldClaw 시작됨");
            #[cfg(windows)]
            eprintln!("winget 기반 설치 모드 (node-portable 번들 없음)");
            #[cfg(target_os = "macos")]
            eprintln!("macOS 모드 - PATH: {}", &get_macos_path()[..get_macos_path().len().min(120)]);
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
