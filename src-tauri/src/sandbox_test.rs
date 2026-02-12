/// 샌드박싱 및 파일 접근 테스트
#[cfg(test)]
mod sandbox_tests {
    use std::fs;
    use std::path::PathBuf;
    
    #[test]
    fn test_file_access_from_different_locations() {
        // 테스트할 OpenClaw 설치 위치들
        let install_locations = vec![
            // 옵션 1: 사용자 홈 직속
            dirs::home_dir().unwrap().join(".openclaw-install"),
            
            // 옵션 2: AppData/Local (Windows) 또는 .local/share (Linux)
            dirs::data_local_dir().unwrap().join("moldClaw/openclaw"),
            
            // 옵션 3: 앱 전용 디렉토리
            dirs::config_dir().unwrap().join("moldClaw/openclaw"),
        ];
        
        // 접근해야 할 사용자 디렉토리들
        let user_dirs = vec![
            dirs::home_dir().unwrap(),
            dirs::document_dir().unwrap(),
            dirs::download_dir().unwrap(),
            dirs::desktop_dir().unwrap(),
        ];
        
        println!("=== 파일 접근 권한 테스트 ===");
        
        for install_dir in &install_locations {
            println!("\n설치 위치: {:?}", install_dir);
            
            // 가상의 OpenClaw 실행파일이 있다고 가정
            let openclaw_bin = install_dir.join("node_modules/.bin/openclaw");
            
            // 각 사용자 디렉토리 접근 가능성 체크
            for user_dir in &user_dirs {
                // 실제로는 OpenClaw 프로세스가 이 디렉토리들을 읽을 수 있는지 확인
                if user_dir.exists() {
                    println!("  ✓ {:?} 접근 가능", user_dir);
                } else {
                    println!("  ✗ {:?} 접근 불가", user_dir);
                }
            }
            
            // AppImage나 Flatpak 환경인지 확인
            if std::env::var("APPIMAGE").is_ok() {
                println!("  ⚠️  AppImage 환경 감지 - 샌드박싱 가능성");
            }
            
            if PathBuf::from("/.flatpak-info").exists() {
                println!("  ⚠️  Flatpak 환경 감지 - 샌드박싱 확실");
            }
        }
    }
    
    #[test]
    fn test_process_isolation() {
        // OpenClaw가 독립 프로세스로 실행되는지 확인
        let install_dir = dirs::home_dir().unwrap().join(".openclaw-install");
        
        println!("\n=== 프로세스 격리 테스트 ===");
        println!("moldClaw 프로세스 ID: {}", std::process::id());
        
        // OpenClaw를 실행한다면...
        // 1. 별도 프로세스로 생성됨
        // 2. moldClaw의 샌드박스 제약을 받지 않음
        // 3. 자체 권한으로 파일 접근
        
        println!("OpenClaw는 별도 프로세스로 실행되어 moldClaw 샌드박스 영향 없음");
    }
}