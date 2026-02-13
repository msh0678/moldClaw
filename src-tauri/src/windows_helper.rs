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
    Command::new("cmd")
        .args(["/C", "where git"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// winget으로 Git 설치 (관리자 권한으로 UAC 프롬프트 표시)
pub async fn install_git_with_winget() -> Result<String, String> {
    eprintln!("Git 설치 시작 (winget 사용)...");
    
    // 먼저 winget 사용 가능한지 확인
    let winget_check = Command::new("cmd")
        .args(["/C", "winget --version"])
        .output();
    
    if winget_check.is_err() || !winget_check.unwrap().status.success() {
        return Err("winget이 설치되어 있지 않습니다. Windows 10 1709+ 또는 Windows 11이 필요합니다.".to_string());
    }
    
    // 관리자 권한으로 Git 설치
    let install_script = r#"
$ErrorActionPreference = 'Stop'
try {
    Write-Host "Git 설치 중..."
    winget install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements
    
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
        Write-Host "Git 설치 완료!"
        # PATH 새로고침
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        throw "Git 설치 실패 (종료 코드: $LASTEXITCODE)"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
"#;
    
    run_elevated_script(install_script)?;
    
    // 설치 확인 (PATH 새로고침)
    refresh_environment_variables();
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    if is_git_installed() {
        Ok("Git이 성공적으로 설치되었습니다!".to_string())
    } else {
        Ok("Git 설치 완료. 앱을 재시작하면 인식됩니다.".to_string())
    }
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
    pub build_tools_installed: bool,
    pub node_version: Option<String>,
}

pub fn check_prerequisites() -> PrerequisiteStatus {
    PrerequisiteStatus {
        git_installed: is_git_installed(),
        build_tools_installed: is_build_tools_installed(),
        node_version: get_node_version(),
    }
}

fn get_node_version() -> Option<String> {
    Command::new("cmd")
        .args(["/C", "node --version"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

/// npm 캐시 정리 (권한 문제 해결에 도움)
pub fn clear_npm_cache() -> Result<(), String> {
    let output = Command::new("cmd")
        .args(["/C", "npm cache clean --force"])
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
