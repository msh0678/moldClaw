// OpenClaw TGZ 압축 해제 + 의존성 설치
// npm tarball에는 node_modules가 없으므로 npm install 필수!
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

pub async fn extract_openclaw_bundle(
    bundle_path: &PathBuf, 
    install_dir: &PathBuf,
    node_path: &PathBuf,
    npm_path: &PathBuf,
) -> Result<String, String> {
    eprintln!("=== OpenClaw 설치 시작 ===");
    eprintln!("번들: {:?}", bundle_path);
    eprintln!("설치 경로: {:?}", install_dir);
    eprintln!("Node: {:?}", node_path);
    eprintln!("NPM: {:?}", npm_path);
    
    // 설치 디렉토리 생성
    fs::create_dir_all(install_dir)
        .map_err(|e| format!("설치 디렉토리 생성 실패: {}", e))?;
    
    // 1단계: 압축 해제
    eprintln!("1단계: TGZ 압축 해제...");
    #[cfg(windows)]
    {
        extract_windows(bundle_path, install_dir).await?;
    }
    
    #[cfg(not(windows))]
    {
        extract_unix(bundle_path, install_dir).await?;
    }
    
    // 2단계: npm install로 의존성 설치 (핵심!)
    eprintln!("2단계: npm install로 의존성 설치...");
    install_dependencies(install_dir, node_path, npm_path).await?;
    
    // 3단계: 설치 확인
    eprintln!("3단계: 설치 확인...");
    verify_installation(install_dir)?;
    
    Ok("OpenClaw 설치 완료! (압축 해제 + 의존성 설치)".to_string())
}

/// npm install --ignore-scripts 실행
async fn install_dependencies(
    install_dir: &PathBuf,
    node_path: &PathBuf,
    npm_path: &PathBuf,
) -> Result<(), String> {
    // npm 실행 경로 확인
    if !npm_path.exists() {
        return Err(format!("npm을 찾을 수 없습니다: {:?}", npm_path));
    }
    
    // PATH에 node 디렉토리 추가
    let node_dir = node_path.parent()
        .ok_or("Node.js 디렉토리를 찾을 수 없습니다")?;
    let system_path = std::env::var("PATH").unwrap_or_default();
    
    #[cfg(windows)]
    let full_path = format!("{};{}", node_dir.to_string_lossy(), system_path);
    #[cfg(not(windows))]
    let full_path = format!("{}:{}", node_dir.to_string_lossy(), system_path);
    
    eprintln!("npm install 실행 중...");
    eprintln!("작업 디렉토리: {:?}", install_dir);
    
    let mut cmd = Command::new(npm_path);
    cmd.args([
            "install",
            "--ignore-scripts",    // prepare 스크립트가 Git 호출하므로 무시
            "--no-fund",
            "--no-audit",
            "--no-optional",       // 선택적 의존성 제외 (빌드 속도)
            "--prefer-offline",    // 캐시 우선
            "--progress=false",
        ])
        .current_dir(install_dir)
        .env("PATH", &full_path)
        .env("NODE_ENV", "production");
    
    // Windows 추가 설정
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let output = cmd.output()
        .map_err(|e| format!("npm 실행 실패: {}", e))?;
    
    if output.status.success() {
        eprintln!("✓ npm install 완료!");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        eprintln!("✗ npm install 실패");
        eprintln!("stdout: {}", stdout);
        eprintln!("stderr: {}", stderr);
        Err(format!("npm install 실패:\n{}\n{}", stdout, stderr))
    }
}

/// 설치 확인
fn verify_installation(install_dir: &PathBuf) -> Result<(), String> {
    // openclaw.mjs 확인
    let entry_point = install_dir.join("openclaw.mjs");
    if !entry_point.exists() {
        return Err("openclaw.mjs를 찾을 수 없습니다".to_string());
    }
    eprintln!("✓ openclaw.mjs 확인");
    
    // node_modules 확인
    let node_modules = install_dir.join("node_modules");
    if !node_modules.exists() {
        return Err("node_modules가 설치되지 않았습니다. npm install이 실패했을 수 있습니다.".to_string());
    }
    eprintln!("✓ node_modules 확인");
    
    // 핵심 의존성 확인
    let core_deps = ["express", "grammy", "ws", "commander"];
    for dep in core_deps {
        let dep_path = node_modules.join(dep);
        if !dep_path.exists() {
            return Err(format!("핵심 의존성 '{}'이(가) 설치되지 않았습니다", dep));
        }
    }
    eprintln!("✓ 핵심 의존성 확인 (express, grammy, ws, commander)");
    
    Ok(())
}

#[cfg(windows)]
async fn extract_windows(bundle_path: &PathBuf, install_dir: &PathBuf) -> Result<String, String> {
    // 방법 1: Windows 10+에는 tar가 기본 내장됨
    let output = Command::new("tar")
        .args([
            "-xzf",
            bundle_path.to_str().unwrap(),
            "-C",
            install_dir.to_str().unwrap(),
            "--strip-components=1",  // package/ 디렉토리 제거
        ])
        .output();
    
    if let Ok(output) = output {
        if output.status.success() {
            return Ok("OpenClaw 번들 압축 해제 완료! (Windows tar)".to_string());
        }
    }
    
    // 방법 2: PowerShell로 압축 해제
    let ps_script = format!(
        r#"
        $ErrorActionPreference = 'Stop'
        try {{
            # 임시 디렉토리에 먼저 압축 해제
            $tempDir = New-TemporaryFile | %{{Remove-Item $_; New-Item -ItemType Directory -Path $_}}
            
            # tar 사용 (Windows 10+)
            & tar -xzf '{}' -C $tempDir
            
            # package 폴더 내용을 목적지로 이동
            $packageDir = Join-Path $tempDir 'package'
            if (Test-Path $packageDir) {{
                Get-ChildItem $packageDir -Force | Move-Item -Destination '{}' -Force
            }}
            
            # 임시 디렉토리 정리
            Remove-Item $tempDir -Recurse -Force
            
            Write-Host "OpenClaw 번들 압축 해제 완료"
        }} catch {{
            Write-Error $_.Exception.Message
            exit 1
        }}
        "#,
        bundle_path.to_str().unwrap().replace('\\', "\\\\"),
        install_dir.to_str().unwrap().replace('\\', "\\\\")
    );
    
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
    
    if output.status.success() {
        Ok("OpenClaw 번들 압축 해제 완료! (PowerShell)".to_string())
    } else {
        Err(format!("압축 해제 실패: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[cfg(not(windows))]
async fn extract_unix(bundle_path: &PathBuf, install_dir: &PathBuf) -> Result<String, String> {
    let output = Command::new("tar")
        .args([
            "-xzf",
            bundle_path.to_str().unwrap(),
            "-C", 
            install_dir.to_str().unwrap(),
            "--strip-components=1",  // package/ 디렉토리 제거
        ])
        .output()
        .map_err(|e| format!("tar 실행 실패: {}", e))?;
    
    if output.status.success() {
        Ok("OpenClaw 번들 압축 해제 완료! (Unix tar)".to_string())
    } else {
        Err(format!("압축 해제 실패: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

// 압축 해제 후 실행 파일 경로 찾기
pub fn get_openclaw_executable(install_dir: &PathBuf) -> PathBuf {
    // 직접 압축 해제한 경우 openclaw.mjs가 최상위에 있음
    install_dir.join("openclaw.mjs")
}