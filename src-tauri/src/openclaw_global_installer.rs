/// OpenClaw를 시스템 전역으로 설치 (관리자 권한 활용)
use std::process::Command;

pub async fn install_openclaw_globally() -> Result<String, String> {
    eprintln!("OpenClaw 전역 설치 시작 (관리자 권한)...");
    
    #[cfg(windows)]
    {
        // PowerShell을 관리자 권한으로 실행
        let ps_script = r#"
        # 관리자 권한 확인
        if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
            Write-Host "관리자 권한이 필요합니다."
            exit 1
        }
        
        # npm 전역 설치 (Git 불필요)
        npm install -g openclaw --registry https://registry.npmjs.org --no-optional
        
        # 설치 확인
        $openclawPath = (Get-Command openclaw -ErrorAction SilentlyContinue).Path
        if ($openclawPath) {
            Write-Host "OpenClaw 설치 완료: $openclawPath"
            exit 0
        } else {
            Write-Host "OpenClaw 설치 실패"
            exit 1
        }
        "#;
        
        // PowerShell 실행
        let output = Command::new("powershell")
            .args([
                "-ExecutionPolicy", "Bypass",
                "-Command", ps_script
            ])
            .output()
            .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw가 시스템에 설치되었습니다!".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("전역 설치 실패: {}", stderr))
        }
    }
    
    #[cfg(not(windows))]
    {
        // Unix 시스템에서는 sudo 사용
        let output = Command::new("sudo")
            .args(["npm", "install", "-g", "openclaw", "--no-optional"])
            .output()
            .map_err(|e| format!("sudo 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw가 시스템에 설치되었습니다!".to_string())
        } else {
            Err("전역 설치 실패".to_string())
        }
    }
}

/// MSI 설치 중 실행할 커스텀 액션
pub fn msi_custom_action() -> Result<(), String> {
    eprintln!("MSI 커스텀 액션: OpenClaw 설치");
    
    // MSI 설치 시 이미 관리자 권한이므로 직접 설치
    let output = Command::new("cmd")
        .args([
            "/C",
            "npm install -g openclaw --registry https://registry.npmjs.org --no-optional 2>nul || echo installed"
        ])
        .output()
        .map_err(|e| format!("설치 실패: {}", e))?;
    
    // 성공 여부와 관계없이 MSI 설치는 계속
    eprintln!("OpenClaw 설치 시도: {:?}", output.status);
    Ok(())
}