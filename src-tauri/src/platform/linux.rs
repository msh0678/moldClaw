// Linux Platform Implementation
// 
// TODO: Implement all PlatformOps methods for Linux
// 
// Key considerations:
// - Multiple distros (apt/dnf/pacman)
// - Node.js: NodeSource or distro package manager
// - Gateway service: systemd
// - Terminal: varies (gnome-terminal, konsole, xfce4-terminal, xterm)

#![cfg(target_os = "linux")]

use super::{PlatformOps, PrerequisiteStatus, InstallErrorType, ErrorAnalysis};
use std::path::PathBuf;
use std::process::Command;

pub struct LinuxPlatform;

impl LinuxPlatform {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformOps for LinuxPlatform {
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
            platform_deps_ok: self.has_build_essentials(),
            disk_space_gb,
            disk_space_ok: disk_space_gb >= 2.0,
            additional_info: self.detect_distro(),
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
    
    fn install_nodejs(&self) -> Result<String, String> {
        // Try to detect package manager and install
        if self.has_command("apt-get") {
            // Debian/Ubuntu - use NodeSource
            let script = r#"
                curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && 
                sudo apt-get install -y nodejs
            "#;
            self.run_shell_script(script)
        } else if self.has_command("dnf") {
            // Fedora/RHEL
            let script = r#"
                curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - &&
                sudo dnf install -y nodejs
            "#;
            self.run_shell_script(script)
        } else if self.has_command("pacman") {
            // Arch Linux
            let output = Command::new("sudo")
                .args(["pacman", "-S", "--noconfirm", "nodejs", "npm"])
                .output()
                .map_err(|e| format!("pacman 실행 실패: {}", e))?;
            
            if output.status.success() {
                Ok("Node.js 설치 완료".to_string())
            } else {
                Err(format!("Node.js 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
            }
        } else {
            Err("지원하지 않는 Linux 배포판입니다. https://nodejs.org 에서 직접 설치하세요.".to_string())
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
        // Install build-essential for native modules
        if self.has_command("apt-get") {
            let output = Command::new("sudo")
                .args(["apt-get", "install", "-y", "build-essential"])
                .output()
                .map_err(|e| format!("apt-get 실행 실패: {}", e))?;
            
            if output.status.success() {
                Ok("build-essential 설치 완료".to_string())
            } else {
                Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
            }
        } else if self.has_command("dnf") {
            let output = Command::new("sudo")
                .args(["dnf", "groupinstall", "-y", "Development Tools"])
                .output()
                .map_err(|e| format!("dnf 실행 실패: {}", e))?;
            
            if output.status.success() {
                Ok("Development Tools 설치 완료".to_string())
            } else {
                Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
            }
        } else {
            Err("지원하지 않는 배포판입니다.".to_string())
        }
    }
    
    fn start_gateway(&self) -> Result<(), String> {
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
        let kill_cmd = format!(
            "lsof -ti :{} | xargs -r kill -9 2>/dev/null || fuser -k {}/tcp 2>/dev/null || true",
            port, port
        );
        
        let _ = Command::new("sh")
            .args(["-c", &kill_cmd])
            .output();
        
        std::thread::sleep(std::time::Duration::from_millis(2000));
        
        match self.get_gateway_status(port) {
            Ok(status) if status != "running" => Ok(()),
            _ => Err("Gateway 종료 실패".to_string()),
        }
    }
    
    fn install_gateway_service(&self) -> Result<String, String> {
        // Use systemd
        let output = Command::new("openclaw")
            .args(["gateway", "install"])
            .output()
            .map_err(|e| format!("Gateway 서비스 설치 실패: {}", e))?;
        
        if output.status.success() {
            Ok("Gateway 서비스 설치 완료 (systemd)".to_string())
        } else {
            Err(format!("Gateway 서비스 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn open_terminal_with_command(&self, command: &str) -> Result<(), String> {
        // Try multiple terminal emulators in order of preference
        let gnome_cmd = format!("{}; read -p 'Press Enter to close...'", command);
        let xfce_cmd = format!("sh -c '{}'", command);
        
        // gnome-terminal
        if self.has_command("gnome-terminal") {
            if Command::new("gnome-terminal")
                .args(["--", "sh", "-c", &gnome_cmd])
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }
        
        // konsole
        if self.has_command("konsole") {
            if Command::new("konsole")
                .args(["--hold", "-e", "sh", "-c", command])
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }
        
        // xfce4-terminal
        if self.has_command("xfce4-terminal") {
            if Command::new("xfce4-terminal")
                .args(["--hold", "-e", &xfce_cmd])
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }
        
        // xterm (fallback)
        if self.has_command("xterm") {
            if Command::new("xterm")
                .args(["-hold", "-e", "sh", "-c", command])
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }
        
        Err("터미널을 찾을 수 없습니다. 수동으로 명령을 실행하세요.".to_string())
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
        // Try pkexec first (graphical), fall back to sudo
        let full_args: Vec<&str> = std::iter::once(command).chain(args.iter().copied()).collect();
        
        let output = if self.has_command("pkexec") {
            Command::new("pkexec")
                .args(&full_args)
                .output()
        } else {
            Command::new("sudo")
                .args(&full_args)
                .output()
        };
        
        let output = output.map_err(|e| format!("관리자 권한 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(format!("관리자 권한 실행 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn get_npm_global_path(&self) -> Result<PathBuf, String> {
        let output = Command::new("npm")
            .args(["config", "get", "prefix"])
            .output()
            .map_err(|e| format!("npm prefix 확인 실패: {}", e))?;
        
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(PathBuf::from(prefix).join("lib").join("node_modules").join("openclaw"))
        } else {
            Ok(PathBuf::from("/usr/local/lib/node_modules/openclaw"))
        }
    }
    
    fn get_node_install_url(&self) -> String {
        "https://nodejs.org/en/download".to_string()
    }
    
    fn analyze_error(&self, stderr: &str) -> ErrorAnalysis {
        let stderr_lower = stderr.to_lowercase();
        
        if stderr_lower.contains("node-llama-cpp") || stderr_lower.contains("node-gyp") {
            ErrorAnalysis {
                error_type: InstallErrorType::NativeModuleBuild,
                description: "네이티브 모듈 빌드 실패".to_string(),
                solution: "build-essential (또는 Development Tools)이 설치되어 있는지 확인하세요.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("npm err! code enoent") || stderr_lower.contains("cache") {
            ErrorAnalysis {
                error_type: InstallErrorType::NpmCacheCorrupt,
                description: "npm 캐시 손상".to_string(),
                solution: "npm 캐시를 정리하고 재시도합니다.".to_string(),
                auto_fixable: true,
            }
        } else if stderr_lower.contains("enotfound") || stderr_lower.contains("network") {
            ErrorAnalysis {
                error_type: InstallErrorType::NetworkError,
                description: "네트워크 연결 오류".to_string(),
                solution: "인터넷 연결을 확인하고 재시도하세요.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("enospc") {
            ErrorAnalysis {
                error_type: InstallErrorType::DiskSpaceLow,
                description: "디스크 공간 부족".to_string(),
                solution: "디스크 공간을 확보하고 재시도하세요.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("eperm") || stderr_lower.contains("eacces") {
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
            InstallErrorType::PlatformDepsMissing => self.install_platform_deps(),
            InstallErrorType::NpmCacheCorrupt => {
                self.clear_npm_cache()?;
                Ok("npm 캐시 정리 완료".to_string())
            }
            _ => Err("자동 수정 불가능한 오류입니다.".to_string()),
        }
    }
    
    fn get_os_type(&self) -> &'static str {
        "linux"
    }
}

// ============================================================================
// Linux-specific helper methods
// ============================================================================

impl LinuxPlatform {
    fn has_command(&self, cmd: &str) -> bool {
        Command::new("which")
            .arg(cmd)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn has_build_essentials(&self) -> bool {
        // Check for gcc as a proxy for build tools
        self.has_command("gcc")
    }
    
    fn detect_distro(&self) -> Option<String> {
        std::fs::read_to_string("/etc/os-release")
            .ok()
            .and_then(|content| {
                for line in content.lines() {
                    if line.starts_with("PRETTY_NAME=") {
                        return Some(line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string());
                    }
                }
                None
            })
    }
    
    fn get_available_disk_space_gb(&self) -> f64 {
        Command::new("df")
            .args(["-BG", "/"])
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| {
                let stdout = String::from_utf8_lossy(&o.stdout);
                for line in stdout.lines().skip(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let available = parts[3].trim_end_matches('G');
                        if let Ok(gb) = available.parse::<f64>() {
                            return Some(gb);
                        }
                    }
                }
                None
            })
            .unwrap_or(0.0)
    }
    
    fn run_shell_script(&self, script: &str) -> Result<String, String> {
        let output = Command::new("sh")
            .args(["-c", script])
            .output()
            .map_err(|e| format!("스크립트 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("설치 완료".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
}
