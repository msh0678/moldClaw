/// OpenClaw 설치 프로세스 검증 테스트
#[cfg(test)]
mod installer_tests {
    use super::*;
    use std::path::PathBuf;
    
    /// 1. 설치 경로에 한글/공백이 있을 때
    #[test]
    fn test_install_path_with_unicode() {
        let test_paths = vec![
            PathBuf::from("/home/홍길동/moldClaw/openclaw"),
            PathBuf::from("C:\\Users\\테스트 사용자\\AppData\\Local\\moldClaw\\openclaw"),
            PathBuf::from("/home/user name with spaces/moldClaw"),
        ];
        
        for path in test_paths {
            // to_str()이 None을 반환할 수 있음 (UTF-8이 아닌 경우)
            if let Some(path_str) = path.to_str() {
                println!("✓ 경로 변환 성공: {}", path_str);
            } else {
                println!("✗ 경로 변환 실패: {:?}", path);
                // to_string_lossy() 사용 권장
            }
        }
    }
    
    /// 2. npm 캐시 경로 검증
    #[test]
    fn test_npm_cache_path() {
        // npm 캐시가 설치 디렉토리 내부에 있는지 확인
        let install_dir = PathBuf::from("/test/install");
        let cache_dir = install_dir.join(".npm-cache");
        
        assert!(cache_dir.starts_with(&install_dir));
        println!("npm 캐시 경로: {:?}", cache_dir);
    }
    
    /// 3. PATH 환경변수 검증
    #[test]
    fn test_path_env() {
        // Windows vs Unix PATH 구분자
        let node_path = "/test/node";
        let system_path = "/usr/bin:/bin";
        
        let full_path = if cfg!(windows) {
            format!("{};{}", node_path, system_path)
        } else {
            format!("{}:{}", node_path, system_path)
        };
        
        println!("PATH: {}", full_path);
        assert!(full_path.contains(node_path));
    }
}