use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Tauri의 리소스 해석 시스템을 활용한 경로 찾기
pub fn find_node_portable(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // 방법 1: Tauri의 리소스 해석 API 사용 (권장)
    let resource_paths = vec![
        "node-portable",
        "resources/node-portable", 
        "../resources/node-portable",
    ];
    
    for path in &resource_paths {
        match app_handle.path().resolve(path, tauri::path::BaseDirectory::Resource) {
            Ok(resolved_path) => {
                if resolved_path.exists() {
                    eprintln!("[Tauri Resolve] ✓ Found at: {:?}", resolved_path);
                    return Ok(resolved_path);
                } else {
                    eprintln!("[Tauri Resolve] Path resolved but not exists: {:?}", resolved_path);
                }
            }
            Err(e) => eprintln!("[Tauri Resolve] Failed to resolve {}: {}", path, e),
        }
    }
    
    // 방법 2: 실행 파일 기준 상대 경로 (Tauri API가 실패할 경우)
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().unwrap();
        eprintln!("[Exe-based] Executable at: {:?}", exe_path);
        
        #[cfg(not(windows))]
        let relative_paths = vec![
            // macOS/Linux 설치 구조
            "resources/node-portable",
            "../resources/node-portable",
            
            // macOS .app 번들 구조
            "../Resources/node-portable",
            "../Resources/resources/node-portable",
            
            // Linux AppImage (런타임 마운트)
            "../../usr/lib/moldclaw/resources/node-portable",
            
            // 개발 환경 (npm run tauri:dev)
            "../../../src-tauri/resources/node-portable",
            "../../src-tauri/resources/node-portable",
            "../src-tauri/resources/node-portable",
            "src-tauri/resources/node-portable",
        ];
        
        // Windows: 백슬래시 사용
        #[cfg(windows)]
        let relative_paths = vec![
            // Windows 설치 구조
            "resources\\node-portable",
            "..\\resources\\node-portable",
            
            // 개발 환경 (target\debug 기준)
            "..\\..\\resources\\node-portable",
            "..\\..\\src-tauri\\resources\\node-portable",
            "..\\..\\..\\src-tauri\\resources\\node-portable",
        ];
        
        for rel_path in &relative_paths {
            let full_path = exe_dir.join(rel_path);
            if full_path.exists() {
                eprintln!("[Exe-based] ✓ Found at: {:?}", full_path);
                return Ok(full_path);
            }
        }
    }
    
    // 방법 3: 환경 변수 기반 (디버깅/테스트용)
    if let Ok(override_path) = std::env::var("MOLDCLAW_NODE_PATH") {
        let path = PathBuf::from(override_path);
        if path.exists() {
            eprintln!("[Env Override] ✓ Using MOLDCLAW_NODE_PATH: {:?}", path);
            return Ok(path);
        }
    }
    
    // 방법 4: AppData에 설치된 Node.js 확인
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let installed_node: PathBuf = app_data_dir.join("node-portable");
        if installed_node.exists() {
            eprintln!("[AppData] ✓ Found installed Node.js at: {:?}", installed_node);
            return Ok(installed_node);
        }
    }
    
    Err("Node.js Portable을 찾을 수 없습니다. 다음을 확인하세요:\n\
        1. src-tauri/resources/node-portable/ 디렉토리가 있는지\n\
        2. 빌드 시 리소스가 포함되었는지\n\
        3. 또는 MOLDCLAW_NODE_PATH 환경변수로 경로 지정".to_string())
}

/// OS별 Node.js 실행파일 경로 반환
pub fn get_node_executable(node_dir: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        node_dir.join("node.exe")
    } else {
        node_dir.join("bin/node")
    }
}

/// OS별 npm 실행파일 경로 반환
pub fn get_npm_executable(node_dir: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        node_dir.join("npm.cmd")
    } else {
        node_dir.join("bin/npm")
    }
}