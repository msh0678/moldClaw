// Platform abstraction layer for cross-platform support
// 
// Architecture:
// - PlatformOps trait defines the interface
// - Each OS implements the trait (windows.rs, macos.rs, linux.rs)
// - lib.rs uses get_platform() to get the current platform implementation
//
// To add a new platform:
// 1. Create platform/{os}.rs
// 2. Implement PlatformOps for {Os}Platform
// 3. Add the module and match arm in get_platform()

#[cfg(windows)]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

use std::path::PathBuf;
use serde::{Serialize, Deserialize};

// ============================================================================
// Common Types
// ============================================================================

/// 필수 프로그램 상태
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrerequisiteStatus {
    pub node_installed: bool,
    pub node_version: Option<String>,
    pub node_compatible: bool,      // >= 22.12.0
    pub node_too_new: bool,         // >= 24.0 (native module issues)
    pub npm_installed: bool,
    pub platform_deps_ok: bool,     // VC++ on Windows, Xcode CLI on macOS
    pub disk_space_gb: f64,
    pub disk_space_ok: bool,        // >= 2GB
    pub additional_info: Option<String>,  // e.g., antivirus on Windows
}

impl Default for PrerequisiteStatus {
    fn default() -> Self {
        Self {
            node_installed: false,
            node_version: None,
            node_compatible: false,
            node_too_new: false,
            npm_installed: false,
            platform_deps_ok: true,
            disk_space_gb: 0.0,
            disk_space_ok: false,
            additional_info: None,
        }
    }
}

/// 설치 에러 타입
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstallErrorType {
    NativeModuleBuild,
    NodeVersionMismatch,
    PlatformDepsMissing,  // VC++ on Windows, Xcode CLI on macOS
    NpmCacheCorrupt,
    NetworkError,
    DiskSpaceLow,
    PermissionDenied,
    PathTooLong,
    Unknown,
}

/// 에러 분석 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorAnalysis {
    pub error_type: InstallErrorType,
    pub description: String,
    pub solution: String,
    pub auto_fixable: bool,
}

// ============================================================================
// Platform Trait
// ============================================================================

/// Platform-specific operations trait
/// 
/// Each platform (Windows, macOS, Linux) implements this trait.
/// Use get_platform() to get the current platform implementation.
pub trait PlatformOps: Send + Sync {
    // =========== Environment Checks ===========
    
    /// Check all prerequisites (Node.js, npm, platform deps, disk space)
    fn check_prerequisites(&self) -> PrerequisiteStatus;
    
    /// Get Node.js version (e.g., "v22.12.0")
    fn get_node_version(&self) -> Option<String>;
    
    /// Check if npm is installed
    fn is_npm_installed(&self) -> bool;
    
    /// Check if Node.js version is compatible (>= 22.12.0)
    fn is_node_version_compatible(&self, version: &str) -> bool {
        // Default implementation - shared logic
        let version = version.trim_start_matches('v');
        let parts: Vec<u32> = version
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect();
        
        if parts.len() >= 2 {
            let (major, minor) = (parts[0], parts[1]);
            major > 22 || (major == 22 && minor >= 12)
        } else {
            false
        }
    }
    
    /// Check if Node.js version is too new (>= 24.0, native module issues)
    fn is_node_version_too_new(&self, version: &str) -> bool {
        let version = version.trim_start_matches('v');
        let parts: Vec<u32> = version
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect();
        
        if let Some(&major) = parts.first() {
            major >= 24
        } else {
            false
        }
    }
    
    // =========== Installation ===========
    
    /// Install Node.js using platform package manager
    /// Windows: winget, macOS: brew, Linux: apt/dnf
    fn install_nodejs(&self) -> Result<String, String>;
    
    /// Install OpenClaw globally via npm
    fn install_openclaw(&self) -> Result<String, String>;
    
    /// Install OpenClaw with auto-recovery on failure
    fn install_openclaw_with_recovery(&self) -> Result<String, String>;
    
    /// Check if OpenClaw is installed
    fn is_openclaw_installed(&self) -> bool;
    
    /// Get OpenClaw version
    fn get_openclaw_version(&self) -> Option<String>;
    
    /// Install platform-specific dependencies
    /// Windows: VC++ Redistributable, macOS: Xcode CLI tools
    fn install_platform_deps(&self) -> Result<String, String>;
    
    // =========== Gateway Control ===========
    
    /// Start the Gateway process (background/hidden)
    fn start_gateway(&self) -> Result<(), String>;
    
    /// Stop the Gateway process
    fn stop_gateway(&self, port: u16) -> Result<(), String>;
    
    /// Check Gateway status by port
    fn get_gateway_status(&self, port: u16) -> Result<String, String> {
        // Default implementation - TCP check (works on all platforms)
        use std::net::TcpStream;
        use std::time::Duration;
        
        let addr = format!("127.0.0.1:{}", port);
        match TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_secs(1)
        ) {
            Ok(_) => Ok("running".to_string()),
            Err(_) => Ok("stopped".to_string()),
        }
    }
    
    /// Install Gateway as a service/daemon
    /// Windows: Scheduled Task, macOS: launchd, Linux: systemd
    fn install_gateway_service(&self) -> Result<String, String>;
    
    // =========== Terminal/Shell ===========
    
    /// Open a new terminal window with a command
    /// Used for WhatsApp QR code display, etc.
    fn open_terminal_with_command(&self, command: &str) -> Result<(), String>;
    
    /// Run a command silently (no window)
    fn run_command_silent(&self, command: &str, args: &[&str]) -> Result<String, String>;
    
    /// Run a command with elevated privileges
    /// Windows: UAC, macOS: osascript with admin, Linux: pkexec/sudo
    fn run_elevated(&self, command: &str, args: &[&str]) -> Result<String, String>;
    
    // =========== Environment ===========
    
    /// Refresh PATH environment variable (mainly for Windows)
    fn refresh_environment(&self) {
        // Default: no-op (macOS/Linux don't need this)
    }
    
    /// Clear npm cache
    fn clear_npm_cache(&self) -> Result<(), String> {
        self.run_command_silent("npm", &["cache", "clean", "--force"])
            .map(|_| ())
    }
    
    // =========== Paths ===========
    
    /// Get the OpenClaw config directory
    fn get_openclaw_dir(&self) -> PathBuf {
        dirs::home_dir()
            .unwrap_or_default()
            .join(".openclaw")
    }
    
    /// Get the OpenClaw config file path
    fn get_config_path(&self) -> PathBuf {
        self.get_openclaw_dir().join("openclaw.json")
    }
    
    /// Get npm global install path
    fn get_npm_global_path(&self) -> Result<PathBuf, String>;
    
    /// Get Node.js download URL for this platform
    fn get_node_install_url(&self) -> String;
    
    // =========== Error Handling ===========
    
    /// Analyze installation error and suggest fix
    fn analyze_error(&self, stderr: &str) -> ErrorAnalysis;
    
    /// Attempt automatic fix for known errors
    fn attempt_auto_fix(&self, error_type: &InstallErrorType) -> Result<String, String>;
    
    // =========== Platform Info ===========
    
    /// Get OS type string
    fn get_os_type(&self) -> &'static str;
    
    /// Check if this platform requires app restart after Node.js install
    fn needs_restart_after_node_install(&self) -> bool {
        false  // Default: no (only Windows needs this)
    }
}

// ============================================================================
// Platform Factory
// ============================================================================

/// Get the current platform implementation
pub fn get_platform() -> Box<dyn PlatformOps> {
    #[cfg(windows)]
    {
        Box::new(windows::WindowsPlatform::new())
    }
    
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacOSPlatform::new())
    }
    
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxPlatform::new())
    }
    
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        compile_error!("Unsupported platform");
    }
}

// ============================================================================
// Helper Functions (shared across platforms)
// ============================================================================

/// Parse semver version string
pub fn parse_version(version: &str) -> Option<(u32, u32, u32)> {
    let version = version.trim_start_matches('v');
    let parts: Vec<u32> = version
        .split('.')
        .filter_map(|s| s.split('-').next()?.parse().ok())
        .collect();
    
    if parts.len() >= 3 {
        Some((parts[0], parts[1], parts[2]))
    } else if parts.len() == 2 {
        Some((parts[0], parts[1], 0))
    } else {
        None
    }
}
