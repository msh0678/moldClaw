// macOS Platform Implementation
// 
// TODO: Implement all PlatformOps methods for macOS
// 
// Key differences from Windows:
// - Node.js: brew install node@22 (instead of winget)
// - Gateway service: launchd (instead of Scheduled Tasks)
// - Permissions: TCC (Transparency, Consent, and Control)
// - Terminal: AppleScript to open Terminal.app
// - No VC++ dependency (Xcode CLI tools instead)
// - No PATH refresh needed (shell profile handles it)
//
// Reference docs:
// - /home/sanghyuck/openclaw/docs/platforms/macos.md
// - /home/sanghyuck/openclaw/docs/platforms/mac/permissions.md

#![cfg(target_os = "macos")]

use super::{PlatformOps, PrerequisiteStatus, InstallErrorType, ErrorAnalysis};
use std::path::PathBuf;
use std::process::Command;

pub struct MacOSPlatform;

impl MacOSPlatform {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformOps for MacOSPlatform {
    // =========== Environment Checks ===========
    
    fn check_prerequisites(&self) -> PrerequisiteStatus {
        let node_version = self.get_node_version();
        let node_compatible = node_version.as_ref()
            .map(|v| self.is_node_version_compatible(v))
            .unwrap_or(false);
        let node_too_new = node_version.as_ref()
            .map(|v| self.is_node_version_too_new(v))
            .unwrap_or(false);
        
        let disk_space_gb = self.get_available_disk_space_gb();
        
        PrerequisiteStatus {
            node_installed: node_version.is_some(),
            node_version,
            node_compatible,
            node_too_new,
            npm_installed: self.is_npm_installed(),
            platform_deps_ok: self.is_xcode_cli_installed(),
            disk_space_gb,
            disk_space_ok: disk_space_gb >= 2.0,
            additional_info: None,
        }
    }
    
    fn get_node_version(&self) -> Option<String> {
        Command::new("node")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    
    fn is_npm_installed(&self) -> bool {
        Command::new("npm")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    // =========== Installation ===========
    
    fn install_nodejs(&self) -> Result<String, String> {
        // Check if Homebrew is installed
        if !self.is_homebrew_installed() {
            return Err(
                "Homebrew가 설치되어 있지 않습니다.\n\n\
                터미널에서 다음 명령어를 실행하세요:\n\
                /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"\n\n\
                또는 https://nodejs.org 에서 직접 다운로드하세요."
                .to_string()
            );
        }
        
        // Install Node.js 22 via Homebrew
        let output = Command::new("brew")
            .args(["install", "node@22"])
            .output()
            .map_err(|e| format!("brew 실행 실패: {}", e))?;
        
        if output.status.success() {
            // Link node@22 to make it default
            let _ = Command::new("brew")
                .args(["link", "--overwrite", "node@22"])
                .output();
            
            Ok("Node.js 22 설치 완료".to_string())
        } else {
            Err(format!("Node.js 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn install_openclaw(&self) -> Result<String, String> {
        let output = Command::new("npm")
            .args(["install", "-g", "openclaw", "--ignore-scripts"])
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw 설치 완료".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn install_openclaw_with_recovery(&self) -> Result<String, String> {
        match self.install_openclaw() {
            Ok(msg) => Ok(msg),
            Err(e) => {
                eprintln!("첫 번째 설치 시도 실패: {}", e);
                
                let analysis = self.analyze_error(&e);
                
                if analysis.auto_fixable {
                    if let Ok(_) = self.attempt_auto_fix(&analysis.error_type) {
                        return self.install_openclaw();
                    }
                }
                
                Err(e)
            }
        }
    }
    
    fn is_openclaw_installed(&self) -> bool {
        Command::new("openclaw")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn get_openclaw_version(&self) -> Option<String> {
        Command::new("openclaw")
            .arg("--version")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    
    fn install_platform_deps(&self) -> Result<String, String> {
        // Install Xcode Command Line Tools
        let output = Command::new("xcode-select")
            .args(["--install"])
            .output()
            .map_err(|e| format!("xcode-select 실행 실패: {}", e))?;
        
        // xcode-select --install returns error if already installed
        if output.status.success() || String::from_utf8_lossy(&output.stderr).contains("already installed") {
            Ok("Xcode Command Line Tools 설치됨".to_string())
        } else {
            Err("Xcode Command Line Tools 설치 실패. App Store에서 Xcode를 설치하거나 터미널에서 'xcode-select --install'을 실행하세요.".to_string())
        }
    }
    
    // =========== Gateway Control ===========
    
    fn start_gateway(&self) -> Result<(), String> {
        // Start gateway in background using nohup
        let output = Command::new("sh")
            .args(["-c", "nohup openclaw gateway > /dev/null 2>&1 &"])
            .output()
            .map_err(|e| format!("Gateway 시작 실패: {}", e))?;
        
        if output.status.success() {
            Ok(())
        } else {
            Err("Gateway 시작 실패".to_string())
        }
    }
    
    fn stop_gateway(&self, port: u16) -> Result<(), String> {
        // Find and kill process using the port
        let kill_cmd = format!(
            "lsof -ti :{} | xargs -r kill -9 2>/dev/null || true",
            port
        );
        
        let _ = Command::new("sh")
            .args(["-c", &kill_cmd])
            .output();
        
        // Wait and verify
        std::thread::sleep(std::time::Duration::from_millis(2000));
        
        match self.get_gateway_status(port) {
            Ok(status) if status != "running" => Ok(()),
            _ => Err("Gateway 종료 실패".to_string()),
        }
    }
    
    fn install_gateway_service(&self) -> Result<String, String> {
        // Install as launchd service
        let output = Command::new("openclaw")
            .args(["gateway", "install"])
            .output()
            .map_err(|e| format!("Gateway 서비스 설치 실패: {}", e))?;
        
        if output.status.success() {
            Ok("Gateway 서비스 설치 완료 (launchd)".to_string())
        } else {
            Err(format!("Gateway 서비스 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    // =========== Terminal/Shell ===========
    
    fn open_terminal_with_command(&self, command: &str) -> Result<(), String> {
        // Use AppleScript to open Terminal.app with command
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            command.replace("\"", "\\\"")
        );
        
        let output = Command::new("osascript")
            .args(["-e", &script])
            .output()
            .map_err(|e| format!("터미널 열기 실패: {}", e))?;
        
        if output.status.success() {
            Ok(())
        } else {
            Err(format!("터미널 열기 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn run_command_silent(&self, command: &str, args: &[&str]) -> Result<String, String> {
        let output = Command::new(command)
            .args(args)
            .output()
            .map_err(|e| format!("명령 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
        }
    }
    
    fn run_elevated(&self, command: &str, args: &[&str]) -> Result<String, String> {
        // Use osascript with administrator privileges
        let full_command = format!("{} {}", command, args.join(" "));
        let script = format!(
            r#"do shell script "{}" with administrator privileges"#,
            full_command.replace("\"", "\\\"")
        );
        
        let output = Command::new("osascript")
            .args(["-e", &script])
            .output()
            .map_err(|e| format!("관리자 권한 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(format!("관리자 권한 실행 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    // =========== Paths ===========
    
    fn get_npm_global_path(&self) -> Result<PathBuf, String> {
        let output = Command::new("npm")
            .args(["config", "get", "prefix"])
            .output()
            .map_err(|e| format!("npm prefix 확인 실패: {}", e))?;
        
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(PathBuf::from(prefix).join("lib").join("node_modules").join("openclaw"))
        } else {
            // Fallback to common locations
            Ok(PathBuf::from("/usr/local/lib/node_modules/openclaw"))
        }
    }
    
    fn get_node_install_url(&self) -> String {
        "https://nodejs.org/dist/v22.22.0/node-v22.22.0.pkg".to_string()
    }
    
    // =========== Error Handling ===========
    
    fn analyze_error(&self, stderr: &str) -> ErrorAnalysis {
        let stderr_lower = stderr.to_lowercase();
        
        if stderr_lower.contains("node-llama-cpp") || stderr_lower.contains("prebuild") || stderr_lower.contains("node-gyp") {
            ErrorAnalysis {
                error_type: InstallErrorType::NativeModuleBuild,
                description: "네이티브 모듈 빌드 실패".to_string(),
                solution: "Xcode Command Line Tools가 설치되어 있는지 확인하세요. node-llama-cpp는 선택사항입니다.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("xcode") || stderr_lower.contains("xcrun") {
            ErrorAnalysis {
                error_type: InstallErrorType::PlatformDepsMissing,
                description: "Xcode Command Line Tools 누락".to_string(),
                solution: "Xcode Command Line Tools를 설치합니다.".to_string(),
                auto_fixable: true,
            }
        } else if stderr_lower.contains("npm err! code enoent") || stderr_lower.contains("cache") {
            ErrorAnalysis {
                error_type: InstallErrorType::NpmCacheCorrupt,
                description: "npm 캐시 손상".to_string(),
                solution: "npm 캐시를 정리하고 재시도합니다.".to_string(),
                auto_fixable: true,
            }
        } else if stderr_lower.contains("enotfound") || stderr_lower.contains("etimedout") || stderr_lower.contains("network") {
            ErrorAnalysis {
                error_type: InstallErrorType::NetworkError,
                description: "네트워크 연결 오류".to_string(),
                solution: "인터넷 연결을 확인하고 재시도하세요.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("enospc") || stderr_lower.contains("no space") {
            ErrorAnalysis {
                error_type: InstallErrorType::DiskSpaceLow,
                description: "디스크 공간 부족".to_string(),
                solution: "디스크 공간을 확보하고 재시도하세요.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("eperm") || stderr_lower.contains("eacces") || stderr_lower.contains("permission") {
            ErrorAnalysis {
                error_type: InstallErrorType::PermissionDenied,
                description: "권한 부족".to_string(),
                solution: "sudo를 사용하거나 npm 권한을 확인하세요.".to_string(),
                auto_fixable: false,
            }
        } else {
            ErrorAnalysis {
                error_type: InstallErrorType::Unknown,
                description: "알 수 없는 오류".to_string(),
                solution: stderr.to_string(),
                auto_fixable: false,
            }
        }
    }
    
    fn attempt_auto_fix(&self, error_type: &InstallErrorType) -> Result<String, String> {
        match error_type {
            InstallErrorType::PlatformDepsMissing => {
                self.install_platform_deps()
            }
            InstallErrorType::NpmCacheCorrupt => {
                self.clear_npm_cache()?;
                Ok("npm 캐시 정리 완료".to_string())
            }
            _ => Err("자동 수정 불가능한 오류입니다.".to_string()),
        }
    }
    
    // =========== Platform Info ===========
    
    fn get_os_type(&self) -> &'static str {
        "macos"
    }
    
    fn needs_restart_after_node_install(&self) -> bool {
        false  // macOS doesn't need restart
    }
}

// ============================================================================
// macOS-specific helper methods
// ============================================================================

impl MacOSPlatform {
    fn is_homebrew_installed(&self) -> bool {
        Command::new("brew")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn is_xcode_cli_installed(&self) -> bool {
        Command::new("xcode-select")
            .args(["-p"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn get_available_disk_space_gb(&self) -> f64 {
        // Use df to get available space
        let output = Command::new("df")
            .args(["-g", "/"])
            .output()
            .ok();
        
        if let Some(o) = output {
            if o.status.success() {
                let stdout = String::from_utf8_lossy(&o.stdout);
                // Parse df output: Filesystem ... Available ...
                for line in stdout.lines().skip(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        if let Ok(gb) = parts[3].parse::<f64>() {
                            return gb;
                        }
                    }
                }
            }
        }
        
        0.0
    }
}

// ============================================================================
// TCC Permission Helpers (TODO: Implement for full macOS support)
// ============================================================================

/// TCC Permission status
#[derive(Debug, Clone)]
pub struct TccPermissionStatus {
    pub notifications: bool,
    pub accessibility: bool,
    pub screen_recording: bool,
    pub microphone: bool,
    pub camera: bool,
    pub automation: bool,
}

impl MacOSPlatform {
    /// Check TCC permission status (requires macOS APIs)
    /// TODO: Implement using objc/swift bridge or system_profiler
    pub fn check_tcc_permissions(&self) -> TccPermissionStatus {
        // Placeholder - actual implementation needs macOS APIs
        TccPermissionStatus {
            notifications: false,
            accessibility: false,
            screen_recording: false,
            microphone: false,
            camera: false,
            automation: false,
        }
    }
    
    /// Open System Preferences to a specific pane
    pub fn open_system_preferences(&self, pane: &str) -> Result<(), String> {
        let url = match pane {
            "notifications" => "x-apple.systempreferences:com.apple.preference.notifications",
            "accessibility" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
            "screen_recording" => "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
            "microphone" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
            "camera" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
            "automation" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
            _ => return Err(format!("Unknown pane: {}", pane)),
        };
        
        Command::new("open")
            .arg(url)
            .output()
            .map_err(|e| format!("시스템 설정 열기 실패: {}", e))?;
        
        Ok(())
    }
}
