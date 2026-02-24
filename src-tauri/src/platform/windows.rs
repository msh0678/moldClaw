// Windows Platform Implementation
// 
// Wraps windows_helper.rs functions into PlatformOps trait implementation
// This file delegates to the existing windows_helper module for backward compatibility

#![cfg(windows)]

use super::{PlatformOps, PrerequisiteStatus, InstallErrorType, ErrorAnalysis};
use std::path::PathBuf;
use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const CREATE_NEW_CONSOLE: u32 = 0x00000010;

pub struct WindowsPlatform;

impl WindowsPlatform {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformOps for WindowsPlatform {
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
            platform_deps_ok: self.is_vc_redist_installed(),
            disk_space_gb,
            disk_space_ok: disk_space_gb >= 2.0,
            additional_info: self.detect_antivirus(),
        }
    }
    
    fn get_node_version(&self) -> Option<String> {
        Command::new("cmd")
            .args(["/C", "node --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    
    fn is_npm_installed(&self) -> bool {
        Command::new("cmd")
            .args(["/C", "npm --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    // =========== Installation ===========
    
    fn install_nodejs(&self) -> Result<String, String> {
        // Use winget with visible console for UAC prompt
        let ps_command = r#"
            Start-Process -FilePath 'winget' -ArgumentList 'install', 'OpenJS.NodeJS.LTS', '--accept-source-agreements', '--accept-package-agreements' -Verb RunAs -Wait
        "#;
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_command])
            .creation_flags(CREATE_NEW_CONSOLE)
            .output()
            .map_err(|e| format!("winget 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("Node.js LTS 설치 완료".to_string())
        } else {
            Err(format!("Node.js 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn install_openclaw(&self) -> Result<String, String> {
        let output = Command::new("cmd")
            .args(["/C", "npm install -g openclaw --ignore-scripts"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw 설치 완료".to_string())
        } else {
            Err(format!("설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn install_openclaw_with_recovery(&self) -> Result<String, String> {
        // First attempt
        match self.install_openclaw() {
            Ok(msg) => return Ok(msg),
            Err(e) => {
                eprintln!("첫 번째 설치 시도 실패: {}", e);
                
                // Analyze error
                let analysis = self.analyze_error(&e);
                
                // Try auto-fix if possible
                if analysis.auto_fixable {
                    if let Ok(_) = self.attempt_auto_fix(&analysis.error_type) {
                        // Retry after fix
                        return self.install_openclaw();
                    }
                }
                
                Err(e)
            }
        }
    }
    
    fn is_openclaw_installed(&self) -> bool {
        Command::new("cmd")
            .args(["/C", "openclaw --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn get_openclaw_version(&self) -> Option<String> {
        Command::new("cmd")
            .args(["/C", "openclaw --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    }
    
    fn install_platform_deps(&self) -> Result<String, String> {
        // Install Visual C++ Redistributable
        let vc_url = "https://aka.ms/vs/17/release/vc_redist.x64.exe";
        let temp_path = std::env::temp_dir().join("vc_redist.x64.exe");
        
        // Download
        let download_cmd = format!(
            "Invoke-WebRequest -Uri '{}' -OutFile '{}'",
            vc_url,
            temp_path.display()
        );
        
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-Command", &download_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        // Install silently with UAC
        if temp_path.exists() {
            let install_cmd = format!(
                "Start-Process -FilePath '{}' -ArgumentList '/install', '/passive', '/norestart' -Verb RunAs -Wait",
                temp_path.display()
            );
            
            let output = Command::new("powershell")
                .args(["-NoProfile", "-Command", &install_cmd])
                .output()
                .map_err(|e| format!("VC++ 설치 실패: {}", e))?;
            
            let _ = std::fs::remove_file(&temp_path);
            
            if output.status.success() {
                Ok("Visual C++ Redistributable 설치 완료".to_string())
            } else {
                Err("Visual C++ 설치 실패".to_string())
            }
        } else {
            Err("Visual C++ 다운로드 실패".to_string())
        }
    }
    
    // =========== Gateway Control ===========
    
    fn start_gateway(&self) -> Result<(), String> {
        let ps_command = r#"
            Start-Process -FilePath 'cmd' -ArgumentList '/C', 'openclaw gateway' -WindowStyle Hidden
        "#;
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_command])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Gateway 시작 실패: {}", e))?;
        
        if output.status.success() {
            Ok(())
        } else {
            Err(format!("Gateway 시작 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn stop_gateway(&self, port: u16) -> Result<(), String> {
        let ps_cmd = format!(
            r#"
            $found = $false
            $connections = Get-NetTCPConnection -LocalPort {} -State Listen -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {{
                $processId = $conn.OwningProcess
                if ($processId -gt 0) {{
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $found = $true
                }}
            }}
            if (-not $found) {{
                $output = netstat -ano | findstr "LISTENING" | findstr ":{} "
                foreach ($line in $output -split "`n") {{
                    if ($line -match '\s+(\d+)\s*$') {{
                        $processId = $Matches[1]
                        if ($processId -gt 0) {{
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        }}
                    }}
                }}
            }}
            "#,
            port, port
        );
        
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        // Wait and verify
        std::thread::sleep(std::time::Duration::from_millis(2000));
        
        match self.get_gateway_status(port) {
            Ok(status) if status != "running" => Ok(()),
            _ => Err("Gateway 종료 실패".to_string()),
        }
    }
    
    fn install_gateway_service(&self) -> Result<String, String> {
        // Use Scheduled Task
        let output = Command::new("cmd")
            .args(["/C", "openclaw gateway install"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Gateway 서비스 설치 실패: {}", e))?;
        
        if output.status.success() {
            Ok("Gateway 서비스 설치 완료".to_string())
        } else {
            Err(format!("Gateway 서비스 설치 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    // =========== Terminal/Shell ===========
    
    fn open_terminal_with_command(&self, command: &str) -> Result<(), String> {
        let full_command = format!("{} || (echo. && echo [오류 발생] && pause)", command);
        
        Command::new("cmd")
            .args(["/C", &full_command])
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
            .map_err(|e| format!("터미널 열기 실패: {}", e))?;
        
        Ok(())
    }
    
    fn run_command_silent(&self, command: &str, args: &[&str]) -> Result<String, String> {
        let full_cmd = format!("{} {}", command, args.join(" "));
        
        let output = Command::new("cmd")
            .args(["/C", &full_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("명령 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
        }
    }
    
    fn run_elevated(&self, command: &str, args: &[&str]) -> Result<String, String> {
        let args_str = args.join(" ");
        let ps_command = format!(
            "Start-Process -FilePath '{}' -ArgumentList '{}' -Verb RunAs -Wait -PassThru | Select-Object -ExpandProperty ExitCode",
            command,
            args_str.replace("'", "''")
        );
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_command])
            .output()
            .map_err(|e| format!("관리자 권한 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("성공".to_string())
        } else {
            Err(format!("관리자 권한 실행 실패: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    // =========== Environment ===========
    
    fn refresh_environment(&self) {
        // Read PATH from registry and update current process
        let ps_cmd = r#"
            $machine = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
            $user = [System.Environment]::GetEnvironmentVariable('PATH', 'User')
            $machine + ';' + $user
        "#;
        
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let new_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                std::env::set_var("PATH", &new_path);
            }
        }
    }
    
    // =========== Paths ===========
    
    fn get_npm_global_path(&self) -> Result<PathBuf, String> {
        let output = Command::new("cmd")
            .args(["/C", "npm config get prefix"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("npm prefix 확인 실패: {}", e))?;
        
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(PathBuf::from(prefix).join("node_modules").join("openclaw"))
        } else {
            // Fallback
            let appdata = std::env::var("APPDATA").unwrap_or_default();
            Ok(PathBuf::from(appdata).join("npm").join("node_modules").join("openclaw"))
        }
    }
    
    fn get_node_install_url(&self) -> String {
        "https://nodejs.org/dist/v22.22.0/node-v22.22.0-x64.msi".to_string()
    }
    
    // =========== Error Handling ===========
    
    fn analyze_error(&self, stderr: &str) -> ErrorAnalysis {
        let stderr_lower = stderr.to_lowercase();
        
        if stderr_lower.contains("node-llama-cpp") || stderr_lower.contains("prebuild") || stderr_lower.contains("node-gyp") {
            ErrorAnalysis {
                error_type: InstallErrorType::NativeModuleBuild,
                description: "네이티브 모듈 빌드 실패".to_string(),
                solution: "node-llama-cpp는 선택사항입니다. OpenClaw CLI가 작동하면 무시해도 됩니다.".to_string(),
                auto_fixable: false,
            }
        } else if stderr_lower.contains("vcruntime") || stderr_lower.contains("msvcp") || stderr_lower.contains("visual c++") {
            ErrorAnalysis {
                error_type: InstallErrorType::PlatformDepsMissing,
                description: "Visual C++ Redistributable 누락".to_string(),
                solution: "Visual C++ Redistributable을 설치합니다.".to_string(),
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
                solution: "관리자 권한으로 재시도하세요.".to_string(),
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
        "windows"
    }
    
    fn needs_restart_after_node_install(&self) -> bool {
        true  // Windows needs restart for PATH update
    }
}

// ============================================================================
// Windows-specific helper methods
// ============================================================================

impl WindowsPlatform {
    fn is_vc_redist_installed(&self) -> bool {
        let system32 = std::path::Path::new("C:\\Windows\\System32\\vcruntime140.dll");
        let syswow64 = std::path::Path::new("C:\\Windows\\SysWOW64\\vcruntime140.dll");
        system32.exists() || syswow64.exists()
    }
    
    fn get_available_disk_space_gb(&self) -> f64 {
        let ps_cmd = r#"(Get-PSDrive C).Free / 1GB"#;
        
        Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .trim()
                    .parse::<f64>()
                    .ok()
            })
            .unwrap_or(0.0)
    }
    
    fn detect_antivirus(&self) -> Option<String> {
        let ps_cmd = r#"
            try {
                $av = Get-CimInstance -Namespace 'root/SecurityCenter2' -ClassName 'AntiVirusProduct' -ErrorAction Stop
                if ($av) { $av.displayName -join ',' }
            } catch { }
        "#;
        
        Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .filter(|s| !s.is_empty())
    }
}
