#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_resource_paths() {
        // 테스트: 다양한 경로 형식이 올바르게 처리되는지
        let test_paths = vec![
            "/home/user/moldClaw",
            "/home/사용자/moldClaw", // 한글
            "C:\\Users\\사용자\\AppData\\Local\\moldClaw",
            "/Applications/moldClaw.app",
        ];
        
        for path in test_paths {
            println!("Testing path: {}", path);
            let p = PathBuf::from(path);
            assert!(p.is_absolute());
        }
    }
    
    #[test] 
    fn test_no_hardcoded_paths() {
        // 소스 코드에 하드코딩된 경로가 없는지 확인
        let source_files = vec![
            "src/openclaw_manager.rs",
            "src/openclaw.rs", 
            "src/resource_resolver.rs",
        ];
        
        for file in source_files {
            let content = std::fs::read_to_string(file).unwrap();
            // sanghyuck이나 특정 사용자 경로가 없는지 확인
            assert!(!content.contains("/home/sanghyuck"), 
                "하드코딩된 경로 발견: {}", file);
            assert!(!content.contains("C:\\\\Users\\\\sanghyuck"),
                "하드코딩된 Windows 경로 발견: {}", file);
        }
    }
}