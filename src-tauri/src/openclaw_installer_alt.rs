/// Git 없이 OpenClaw를 설치하는 대체 방법
use std::path::PathBuf;
use std::fs;

/// OpenClaw tarball 직접 다운로드 및 설치
pub async fn install_openclaw_without_git(install_dir: &PathBuf) -> Result<String, String> {
    eprintln!("Git 없이 OpenClaw 설치 시도...");
    
    // 방법 1: tarball URL로 직접 설치
    let tarball_url = "https://registry.npmjs.org/openclaw/-/openclaw-latest.tgz";
    
    // npm pack으로 tarball 다운로드
    let npm_command = if cfg!(windows) {
        "npm.cmd"
    } else {
        "npm"
    };
    
    let output = std::process::Command::new(npm_command)
        .args([
            "install",
            tarball_url,
            "--prefix", install_dir.to_str().unwrap(),
            "--no-fund",
            "--no-audit",
            "--no-optional",
            "--no-save",
            "--registry", "https://registry.npmjs.org",
        ])
        .output()
        .map_err(|e| format!("tarball 설치 실패: {}", e))?;
    
    if output.status.success() {
        Ok("OpenClaw가 Git 없이 설치되었습니다!".to_string())
    } else {
        // 방법 2: 직접 다운로드 (curl/wget)
        download_and_extract_openclaw(install_dir).await
    }
}

/// curl이나 PowerShell로 직접 다운로드
async fn download_and_extract_openclaw(install_dir: &PathBuf) -> Result<String, String> {
    eprintln!("직접 다운로드 방식 시도...");
    
    #[cfg(windows)]
    {
        // PowerShell로 다운로드
        let ps_script = format!(
            r#"
            $url = "https://registry.npmjs.org/openclaw/-/openclaw-latest.tgz"
            $output = "{}\openclaw.tgz"
            Invoke-WebRequest -Uri $url -OutFile $output
            "#,
            install_dir.to_str().unwrap()
        );
        
        let output = std::process::Command::new("powershell")
            .args(["-Command", &ps_script])
            .output()
            .map_err(|e| format!("PowerShell 다운로드 실패: {}", e))?;
        
        if output.status.success() {
            // tar로 압축 해제 (Windows 10+에 내장)
            let tar_output = std::process::Command::new("tar")
                .args([
                    "-xzf",
                    &format!("{}\\openclaw.tgz", install_dir.to_str().unwrap()),
                    "-C",
                    install_dir.to_str().unwrap(),
                ])
                .output();
            
            match tar_output {
                Ok(_) => Ok("OpenClaw가 다운로드되어 설치되었습니다!".to_string()),
                Err(_) => Err("압축 해제 실패. 수동 설치가 필요합니다.".to_string())
            }
        } else {
            Err("다운로드 실패".to_string())
        }
    }
    
    #[cfg(not(windows))]
    {
        // curl로 다운로드
        let output = std::process::Command::new("curl")
            .args([
                "-L",
                "https://registry.npmjs.org/openclaw/-/openclaw-latest.tgz",
                "-o",
                &format!("{}/openclaw.tgz", install_dir.to_str().unwrap()),
            ])
            .output()
            .map_err(|e| format!("curl 다운로드 실패: {}", e))?;
        
        if output.status.success() {
            // tar로 압축 해제
            let tar_output = std::process::Command::new("tar")
                .args([
                    "-xzf",
                    &format!("{}/openclaw.tgz", install_dir.to_str().unwrap()),
                    "-C",
                    install_dir.to_str().unwrap(),
                ])
                .output()
                .map_err(|e| format!("압축 해제 실패: {}", e))?;
            
            if tar_output.status.success() {
                Ok("OpenClaw가 다운로드되어 설치되었습니다!".to_string())
            } else {
                Err("압축 해제 실패".to_string())
            }
        } else {
            Err("다운로드 실패".to_string())
        }
    }
}