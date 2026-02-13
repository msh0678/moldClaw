// OpenClaw TGZ 직접 압축 해제 (npm install 없이)
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

pub async fn extract_openclaw_bundle(
    bundle_path: &PathBuf, 
    install_dir: &PathBuf
) -> Result<String, String> {
    eprintln!("OpenClaw 번들 직접 압축 해제 시작...");
    eprintln!("번들: {:?}", bundle_path);
    eprintln!("설치 경로: {:?}", install_dir);
    
    // 설치 디렉토리 생성
    fs::create_dir_all(install_dir)
        .map_err(|e| format!("설치 디렉토리 생성 실패: {}", e))?;
    
    #[cfg(windows)]
    {
        extract_windows(bundle_path, install_dir).await
    }
    
    #[cfg(not(windows))]
    {
        extract_unix(bundle_path, install_dir).await
    }
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