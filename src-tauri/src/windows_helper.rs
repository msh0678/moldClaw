// Windows 전용 헬퍼: 권한 상승, 필수 프로그램 설치 등
#![cfg(windows)]

use std::process::Command;
use std::path::PathBuf;

/// 관리자 권한으로 명령 실행 (UAC 프롬프트 표시)
pub fn run_elevated(command: &str, args: &[&str]) -> Result<String, String> {
    // PowerShell Start-Process -Verb RunAs 사용
    let args_str = args.join(" ");
    let ps_command = format!(
        "Start-Process -FilePath '{}' -ArgumentList '{}' -Verb RunAs -Wait -PassThru | Select-Object -ExpandProperty ExitCode",
        command,
        args_str.replace("'", "''")  // PowerShell 이스케이프
    );
    
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    if output.status.success() {
        let exit_code = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if exit_code == "0" || exit_code.is_empty() {
            Ok("성공".to_string())
        } else {
            Err(format!("명령 실행 실패 (종료 코드: {})", exit_code))
        }
    } else {
        Err(format!("관리자 권한 실행 실패: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

/// 관리자 권한으로 PowerShell 스크립트 실행 (파일 경유)
pub fn run_elevated_script(script: &str) -> Result<String, String> {
    // 임시 파일에 스크립트 저장
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("moldclaw_elevated_script.ps1");
    
    std::fs::write(&script_path, script)
        .map_err(|e| format!("스크립트 파일 생성 실패: {}", e))?;
    
    let script_path_str = script_path.to_str()
        .ok_or("스크립트 경로 변환 실패")?;
    
    // 관리자 권한으로 스크립트 실행
    let ps_command = format!(
        "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"{}\"' -Verb RunAs -Wait",
        script_path_str.replace('\\', "\\\\")
    );
    
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    // 임시 파일 삭제
    let _ = std::fs::remove_file(&script_path);
    
    if output.status.success() {
        Ok("스크립트 실행 완료".to_string())
    } else {
        Err(format!("스크립트 실행 실패: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

/// 필수 프로그램 상태 확인
#[derive(Debug, Clone, serde::Serialize)]
pub struct PrerequisiteStatus {
    pub node_installed: bool,
    pub node_version: Option<String>,
    pub node_compatible: bool,  // >= 22.12.0
    pub npm_installed: bool,
}

pub fn check_prerequisites() -> PrerequisiteStatus {
    let node_version = get_node_version();
    let node_compatible = node_version.as_ref()
        .map(|v| is_node_version_compatible(v))
        .unwrap_or(false);
    
    PrerequisiteStatus {
        node_installed: node_version.is_some(),
        node_version,
        node_compatible,
        npm_installed: is_npm_installed(),
    }
}

/// Node.js 버전 확인
pub fn get_node_version() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    Command::new("cmd")
        .args(["/C", "node --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

/// npm 설치 여부 확인
pub fn is_npm_installed() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    Command::new("cmd")
        .args(["/C", "npm --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Node.js 버전이 >= 22.12.0 인지 확인
pub fn is_node_version_compatible(version: &str) -> bool {
    // "v22.14.0" 형태에서 버전 파싱
    let version = version.trim_start_matches('v');
    let parts: Vec<&str> = version.split('.').collect();
    
    if parts.len() < 2 {
        return false;
    }
    
    let major: u32 = parts[0].parse().unwrap_or(0);
    let minor: u32 = parts[1].parse().unwrap_or(0);
    
    // 22.12.0 이상 필요
    major > 22 || (major == 22 && minor >= 12)
}

/// winget으로 Node.js LTS 설치 (UAC 프롬프트 표시)
pub fn install_nodejs_with_winget_visible() -> Result<String, String> {
    eprintln!("Node.js LTS 설치 시작 (winget 사용)...");
    
    // winget 사용 가능한지 확인
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    let winget_check = Command::new("cmd")
        .args(["/C", "winget --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    match winget_check {
        Ok(output) if output.status.success() => {},
        _ => return Err("winget이 설치되어 있지 않습니다. Windows 10 1709+ 또는 Windows 11이 필요합니다.".to_string()),
    }
    
    eprintln!("winget 확인됨. Node.js 설치를 위한 관리자 권한 요청...");
    
    // PowerShell을 통해 관리자 권한으로 winget 실행
    let ps_command = r#"
        Start-Process -FilePath 'winget' -ArgumentList 'install --id OpenJS.NodeJS.LTS -e --source winget --silent --accept-source-agreements --accept-package-agreements' -Verb RunAs -Wait
    "#;
    
    // UAC 창이 보이도록 CREATE_NO_WINDOW 사용하지 않음
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    // 설치 확인
    refresh_environment_variables();
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    if let Some(version) = get_node_version() {
        eprintln!("✓ Node.js 설치 확인됨: {}", version);
        Ok(format!("Node.js {}가 설치되었습니다!", version))
    } else {
        eprintln!("Node.js 설치 완료 (앱 재시작 필요)");
        Ok("Node.js 설치 완료. 앱을 재시작하면 인식됩니다.".to_string())
    }
}

/// 전역으로 OpenClaw 설치 (npm install -g openclaw)
pub fn install_openclaw_global() -> Result<String, String> {
    eprintln!("OpenClaw 전역 설치 시작 (npm install -g openclaw)...");
    
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    // npm이 있는지 확인
    if !is_npm_installed() {
        return Err("npm이 설치되어 있지 않습니다. Node.js를 먼저 설치해주세요.".to_string());
    }
    
    // npm install -g openclaw 실행
    let output = Command::new("cmd")
        .args(["/C", "npm install -g openclaw"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("npm 실행 실패: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    eprintln!("npm stdout: {}", stdout);
    eprintln!("npm stderr: {}", stderr);
    
    if output.status.success() {
        // 설치 확인
        let check = Command::new("cmd")
            .args(["/C", "openclaw --version"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        if let Ok(check_output) = check {
            if check_output.status.success() {
                let version = String::from_utf8_lossy(&check_output.stdout).trim().to_string();
                return Ok(format!("OpenClaw {} 설치 완료!", version));
            }
        }
        
        Ok("OpenClaw 설치 완료!".to_string())
    } else {
        Err(format!("OpenClaw 설치 실패:\n{}\n{}", stdout, stderr))
    }
}

/// OpenClaw 설치 여부 확인
pub fn is_openclaw_installed() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    Command::new("cmd")
        .args(["/C", "openclaw --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// OpenClaw 버전 확인
pub fn get_openclaw_version() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    Command::new("cmd")
        .args(["/C", "openclaw --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

/// npm 캐시 정리 (권한 문제 해결에 도움)
pub fn clear_npm_cache() -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    let output = Command::new("cmd")
        .args(["/C", "npm cache clean --force"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("npm 캐시 정리 실패: {}", e))?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(format!("npm 캐시 정리 실패: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

/// 환경 변수 새로고침 (현재 프로세스)
pub fn refresh_environment_variables() {
    let ps_cmd = r#"
        [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [System.Environment]::GetEnvironmentVariable('Path', 'User')
    "#;
    
    if let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_cmd])
        .output()
    {
        if output.status.success() {
            let new_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            std::env::set_var("PATH", new_path);
        }
    }
}

/// Gateway Scheduled Task 설치 여부 확인
pub fn is_gateway_task_installed() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    // schtasks로 OpenClaw Gateway 태스크 확인
    let output = Command::new("schtasks")
        .args(["/Query", "/TN", "OpenClaw Gateway"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    output.map(|o| o.status.success()).unwrap_or(false)
}

/// OpenClaw 실행 파일 경로 찾기
fn find_openclaw_path() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    // where openclaw으로 경로 찾기
    let output = Command::new("cmd")
        .args(["/C", "where openclaw"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()?
            .trim()
            .to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }
    
    // npm prefix로 경로 추론
    let npm_output = Command::new("cmd")
        .args(["/C", "npm config get prefix"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    
    if npm_output.status.success() {
        let prefix = String::from_utf8_lossy(&npm_output.stdout).trim().to_string();
        let openclaw_cmd = format!("{}\\openclaw.cmd", prefix);
        if std::path::Path::new(&openclaw_cmd).exists() {
            return Some(openclaw_cmd);
        }
    }
    
    None
}

/// Gateway 설치 (관리자 권한으로 - UAC 프롬프트)
pub fn install_gateway_with_uac() -> Result<String, String> {
    eprintln!("OpenClaw Gateway 설치 시작 (관리자 권한 필요)...");
    
    // OpenClaw 경로 찾기
    let openclaw_path = find_openclaw_path()
        .ok_or("OpenClaw 실행 파일을 찾을 수 없습니다. npm install -g openclaw이 완료되었는지 확인하세요.".to_string())?;
    
    eprintln!("OpenClaw 경로: {}", openclaw_path);
    
    // PowerShell을 통해 관리자 권한으로 openclaw gateway install 실행
    // 전체 경로 사용 + 경로에 공백이 있을 수 있으므로 이스케이프
    let escaped_path = openclaw_path.replace("'", "''");
    let ps_command = format!(
        "Start-Process -FilePath '{}' -ArgumentList 'gateway install' -Verb RunAs -Wait",
        escaped_path
    );
    
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    // 설치 확인 (잠시 대기 후)
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    if is_gateway_task_installed() {
        eprintln!("✓ Gateway Scheduled Task 설치 확인됨");
        Ok("Gateway가 성공적으로 설치되었습니다!".to_string())
    } else {
        // 사용자가 UAC를 거부했거나 설치 실패
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("canceled") || stderr.contains("취소") {
            Err("사용자가 관리자 권한을 거부했습니다.".to_string())
        } else {
            Err(format!("Gateway 설치 실패: {}", stderr))
        }
    }
}

// ===== 에러 핸들링 시스템 (오버헤드) =====

/// 에러 유형 분류
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub enum InstallErrorType {
    /// Visual C++ Redistributable 누락 (DLL 로드 실패)
    VcRedistMissing,
    /// 백신/보안 소프트웨어 차단
    AntivirusBlocking,
    /// npm 캐시 손상
    NpmCacheCorrupted,
    /// 네트워크 문제
    NetworkError,
    /// 권한 문제 (관리자 필요)
    PermissionDenied,
    /// node-llama-cpp 빌드 실패 (optional, 무시 가능)
    LlamaCppBuildFailed,
    /// 알 수 없는 에러
    Unknown,
}

/// 에러 분석 결과
#[derive(Debug, Clone, serde::Serialize)]
pub struct ErrorAnalysis {
    pub error_type: InstallErrorType,
    pub description: String,
    pub solution: String,
    pub auto_fixable: bool,
}

/// 에러 메시지 분석하여 원인 파악
pub fn analyze_error(stderr: &str) -> ErrorAnalysis {
    let stderr_lower = stderr.to_lowercase();
    
    // 1. Visual C++ Redistributable 누락
    if stderr_lower.contains("err_dlopen_failed") 
        || stderr_lower.contains("the specified module could not be found")
        || stderr_lower.contains("vcruntime")
        || stderr_lower.contains("msvcp")
    {
        return ErrorAnalysis {
            error_type: InstallErrorType::VcRedistMissing,
            description: "Visual C++ Redistributable이 설치되어 있지 않습니다.".to_string(),
            solution: "Visual C++ Redistributable을 설치해주세요. moldClaw가 자동으로 설치를 시도합니다.".to_string(),
            auto_fixable: true,
        };
    }
    
    // 2. npm 캐시 손상
    if (stderr_lower.contains("enoent") && stderr_lower.contains("npm-cache"))
        || (stderr_lower.contains("enoent") && stderr_lower.contains("_npx"))
        || stderr_lower.contains("could not read package.json")
    {
        return ErrorAnalysis {
            error_type: InstallErrorType::NpmCacheCorrupted,
            description: "npm 캐시가 손상되었습니다.".to_string(),
            solution: "npm 캐시를 정리하고 다시 시도합니다.".to_string(),
            auto_fixable: true,
        };
    }
    
    // 3. 네트워크 문제
    if stderr_lower.contains("etimedout")
        || stderr_lower.contains("econnreset") 
        || stderr_lower.contains("enotfound")
        || stderr_lower.contains("failed to download")
        || stderr_lower.contains("network")
        || stderr_lower.contains("socket hang up")
    {
        return ErrorAnalysis {
            error_type: InstallErrorType::NetworkError,
            description: "네트워크 연결에 문제가 있습니다.".to_string(),
            solution: "인터넷 연결을 확인하고 다시 시도해주세요. VPN을 사용 중이라면 일시 중지해보세요.".to_string(),
            auto_fixable: false,
        };
    }
    
    // 4. 권한 문제 / 백신 차단 (비정상 종료 코드 포함)
    if stderr_lower.contains("eperm")
        || stderr_lower.contains("eacces")
        || stderr_lower.contains("operation not permitted")
        || stderr_lower.contains("access denied")
        || stderr.contains("4294963238")  // 백신 차단 시 자주 나오는 종료 코드
        || stderr.contains("-1018")
    {
        // EPERM + cleanup은 백신 의심
        if stderr_lower.contains("cleanup") || stderr.contains("4294963238") {
            return ErrorAnalysis {
                error_type: InstallErrorType::AntivirusBlocking,
                description: "백신/보안 소프트웨어가 설치를 차단하고 있습니다.".to_string(),
                solution: "백신의 실시간 감시를 일시 중지하고 다시 시도해주세요. 설치 후 다시 활성화하세요.".to_string(),
                auto_fixable: false,
            };
        }
        return ErrorAnalysis {
            error_type: InstallErrorType::PermissionDenied,
            description: "파일 접근 권한이 없습니다.".to_string(),
            solution: "관리자 권한으로 실행하거나, 다른 프로그램이 파일을 사용 중인지 확인해주세요.".to_string(),
            auto_fixable: false,
        };
    }
    
    // 5. node-llama-cpp 빌드 실패 (무시 가능하지만 전체 실패로 이어질 수 있음)
    if stderr_lower.contains("node-llama-cpp")
        || stderr_lower.contains("llama.cpp")
        || stderr_lower.contains("cmake")
    {
        return ErrorAnalysis {
            error_type: InstallErrorType::LlamaCppBuildFailed,
            description: "로컬 AI 모델(llama.cpp) 빌드에 실패했습니다. API 사용에는 영향 없습니다.".to_string(),
            solution: "Visual C++ Build Tools 또는 cmake가 필요합니다. API만 사용할 경우 무시해도 됩니다.".to_string(),
            auto_fixable: false,
        };
    }
    
    // 알 수 없는 에러
    ErrorAnalysis {
        error_type: InstallErrorType::Unknown,
        description: "알 수 없는 오류가 발생했습니다.".to_string(),
        solution: "에러 메시지를 확인하고 지원 채널에 문의해주세요.".to_string(),
        auto_fixable: false,
    }
}

/// Visual C++ Redistributable 설치 (winget 사용)
pub fn install_vc_redist() -> Result<String, String> {
    eprintln!("Visual C++ Redistributable 설치 시작...");
    
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    // winget 사용 가능한지 확인
    let winget_check = Command::new("cmd")
        .args(["/C", "winget --version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    match winget_check {
        Ok(output) if output.status.success() => {},
        _ => return Err("winget이 설치되어 있지 않습니다.".to_string()),
    }
    
    // VC++ Redistributable 설치 (관리자 권한)
    let ps_command = r#"
        Start-Process -FilePath 'winget' -ArgumentList 'install --id Microsoft.VCRedist.2015+.x64 -e --source winget --silent --accept-source-agreements --accept-package-agreements' -Verb RunAs -Wait
    "#;
    
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    if output.status.success() {
        Ok("Visual C++ Redistributable 설치 완료!".to_string())
    } else {
        Err("Visual C++ Redistributable 설치 실패".to_string())
    }
}

/// 자동 복구 시도 (에러 유형에 따라)
pub fn attempt_auto_fix(error_type: &InstallErrorType) -> Result<String, String> {
    match error_type {
        InstallErrorType::VcRedistMissing => {
            install_vc_redist()
        }
        InstallErrorType::NpmCacheCorrupted => {
            clear_npm_cache()?;
            Ok("npm 캐시를 정리했습니다. 다시 시도해주세요.".to_string())
        }
        _ => {
            Err("자동 복구가 불가능한 에러입니다.".to_string())
        }
    }
}

/// OpenClaw 설치 with 에러 핸들링
pub fn install_openclaw_with_recovery() -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    eprintln!("OpenClaw 설치 시작 (에러 복구 활성화)...");
    
    // npm이 있는지 확인
    if !is_npm_installed() {
        return Err("npm이 설치되어 있지 않습니다. Node.js를 먼저 설치해주세요.".to_string());
    }
    
    // 1차 시도
    let output = Command::new("cmd")
        .args(["/C", "npm install -g openclaw"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("npm 실행 실패: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    eprintln!("1차 설치 stdout: {}", stdout);
    eprintln!("1차 설치 stderr: {}", stderr);
    
    if output.status.success() {
        // 설치 확인
        if is_openclaw_installed() {
            return Ok("OpenClaw 설치 완료!".to_string());
        }
    }
    
    // 실패 시 에러 분석
    let full_output = format!("{}\n{}", stdout, stderr);
    let analysis = analyze_error(&full_output);
    
    eprintln!("에러 분석 결과: {:?}", analysis);
    
    // 자동 복구 가능한 경우 시도
    if analysis.auto_fixable {
        eprintln!("자동 복구 시도: {}", analysis.solution);
        
        if let Ok(fix_result) = attempt_auto_fix(&analysis.error_type) {
            eprintln!("복구 결과: {}", fix_result);
            
            // 복구 후 재시도
            std::thread::sleep(std::time::Duration::from_secs(2));
            
            let retry_output = Command::new("cmd")
                .args(["/C", "npm install -g openclaw"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| format!("재시도 실패: {}", e))?;
            
            if retry_output.status.success() && is_openclaw_installed() {
                return Ok("OpenClaw 설치 완료! (자동 복구 후)".to_string());
            }
        }
    }
    
    // 복구 불가능한 경우 상세 에러 반환
    Err(format!(
        "OpenClaw 설치 실패\n\n원인: {}\n\n해결 방법: {}\n\n상세 에러:\n{}",
        analysis.description,
        analysis.solution,
        stderr.chars().take(500).collect::<String>()
    ))
}
