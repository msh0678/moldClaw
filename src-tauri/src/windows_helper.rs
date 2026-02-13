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

/// Git 설치 여부 확인
pub fn is_git_installed() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    Command::new("cmd")
        .args(["/C", "where git"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// winget으로 Git 설치 (UAC 프롬프트를 사용자에게 직접 보여줌)
/// 
/// 창을 숨기지 않고 사용자가 직접 UAC 승인 클릭하도록 함
pub fn install_git_with_winget_visible() -> Result<String, String> {
    eprintln!("Git 설치 시작 (winget 사용, UAC 프롬프트 표시)...");
    
    // 먼저 winget 사용 가능한지 확인
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
    
    eprintln!("winget 확인됨. Git 설치를 위한 관리자 권한 요청...");
    
    // PowerShell을 통해 관리자 권한으로 winget 실행
    // -Wait: 설치 완료까지 대기
    // -Verb RunAs: UAC 프롬프트 표시
    // 창을 숨기지 않음 - 사용자가 UAC 프롬프트를 볼 수 있음
    let ps_command = r#"
        Start-Process -FilePath 'winget' -ArgumentList 'install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements' -Verb RunAs -Wait
    "#;
    
    // 중요: CREATE_NO_WINDOW를 사용하지 않음 - 사용자가 UAC 창을 볼 수 있도록
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_command])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    // 설치 확인 (PATH 새로고침)
    refresh_environment_variables();
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    if is_git_installed() {
        eprintln!("✓ Git 설치 확인됨");
        Ok("Git이 성공적으로 설치되었습니다!".to_string())
    } else {
        // 설치는 됐지만 PATH가 아직 안 잡힌 경우
        eprintln!("Git 설치 완료 (PATH 새로고침 필요할 수 있음)");
        Ok("Git 설치 완료. 앱을 재시작하면 인식됩니다.".to_string())
    }
}

/// winget으로 Git 설치 (async 버전 - 기존 호환성)
pub async fn install_git_with_winget() -> Result<String, String> {
    install_git_with_winget_visible()
}

/// Visual Studio Build Tools 설치 여부 확인
pub fn is_build_tools_installed() -> bool {
    let vs_paths = [
        r"C:\Program Files\Microsoft Visual Studio\2022\BuildTools",
        r"C:\Program Files\Microsoft Visual Studio\2022\Community",
        r"C:\Program Files\Microsoft Visual Studio\2022\Professional",
        r"C:\Program Files\Microsoft Visual Studio\2022\Enterprise",
        r"C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools",
    ];
    
    vs_paths.iter().any(|p| PathBuf::from(p).exists())
}

/// Visual Studio Build Tools 설치 (node-gyp 네이티브 모듈용)
pub async fn install_build_tools() -> Result<String, String> {
    eprintln!("Visual Studio Build Tools 설치 시작...");
    
    let install_script = r#"
$ErrorActionPreference = 'Stop'
try {
    Write-Host "Visual Studio Build Tools 설치 중..."
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --silent --accept-source-agreements --accept-package-agreements --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet --wait"
    
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
        Write-Host "Visual Studio Build Tools 설치 완료!"
    } else {
        throw "설치 실패"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
"#;
    
    run_elevated_script(install_script)?;
    Ok("Visual Studio Build Tools 설치 완료".to_string())
}

/// 필수 프로그램 상태 확인
#[derive(Debug, Clone, serde::Serialize)]
pub struct PrerequisiteStatus {
    pub git_installed: bool,
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
        git_installed: is_git_installed(),
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

/// 사용자별 디렉토리 반환 (권한 문제 없는 위치)
pub fn get_user_install_dir() -> PathBuf {
    // %LOCALAPPDATA%는 사용자별 디렉토리로 관리자 권한 불필요
    dirs::data_local_dir()
        .unwrap_or_else(|| {
            // 폴백: %USERPROFILE%\AppData\Local
            dirs::home_dir()
                .map(|h| h.join("AppData").join("Local"))
                .unwrap_or_else(|| PathBuf::from("C:\\Users\\Public\\AppData\\Local"))
        })
        .join("Programs")
        .join("openclaw")
}

/// npm install을 관리자 권한 없이 사용자 디렉토리에서 실행
pub fn get_npm_user_config() -> Vec<(String, String)> {
    let user_cache = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("npm");
    
    vec![
        ("npm_config_cache".to_string(), user_cache.to_string_lossy().to_string()),
        ("npm_config_prefix".to_string(), get_user_install_dir().to_string_lossy().to_string()),
    ]
}
