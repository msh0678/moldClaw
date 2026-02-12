use std::process::Command;
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};
use crate::resource_resolver;

pub struct OpenClawManager {
    bundled_node: PathBuf,
    bundled_npm: PathBuf,
    openclaw_home: PathBuf,
    install_dir: PathBuf,
}

impl OpenClawManager {
    /// Node.js가 없으면 자동으로 다운로드하고 설치
    pub async fn ensure_node_portable(app_handle: &AppHandle) -> Result<(), String> {
        let app_data_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("AppData 디렉토리 오류: {}", e))?;
        
        let node_install_dir = app_data_dir.join("resources/node-portable");
        
        // 이미 설치되어 있는지 확인
        let node_exe = if cfg!(windows) {
            node_install_dir.join("node.exe")
        } else {
            node_install_dir.join("bin/node")
        };
        
        if node_exe.exists() {
            eprintln!("Node.js already installed at: {:?}", node_install_dir);
            return Ok(());
        }
        
        eprintln!("Node.js not found. Installing to: {:?}", node_install_dir);
        
        // 디렉토리 생성
        fs::create_dir_all(&node_install_dir)
            .map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
        
        // TODO: 실제 구현 시 Node.js 다운로드 로직 추가
        // 1. https://nodejs.org에서 적절한 버전 다운로드
        // 2. 압축 해제
        // 3. 권한 설정
        
        Err("Node.js 자동 다운로드는 아직 구현되지 않았습니다. 수동으로 설치해주세요.".to_string())
    }
    
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        // 새로운 resolver 사용
        let node_dir = resource_resolver::find_node_portable(app_handle)?;
        
        let bundled_node = resource_resolver::get_node_executable(&node_dir);
        let bundled_npm = resource_resolver::get_npm_executable(&node_dir);
        
        // Unix 시스템에서 실행 권한 설정
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            for path in &[&bundled_node, &bundled_npm] {
                if path.exists() {
                    let mut perms = fs::metadata(path)
                        .map_err(|e| format!("권한 확인 실패: {}", e))?
                        .permissions();
                    perms.set_mode(0o755); // rwxr-xr-x
                    fs::set_permissions(path, perms)
                        .map_err(|e| format!("권한 설정 실패: {}", e))?;
                }
            }
        }
        
        // 실제 사용자 홈 (한글 경로 대응)
        let real_home = dirs::home_dir()
            .ok_or("홈 디렉토리를 찾을 수 없습니다")?;
        
        eprintln!("User home directory: {:?}", real_home);
        eprintln!("Home directory exists: {}", real_home.exists());
        
        let openclaw_home = real_home.join(".openclaw");
        
        // Windows에서 대체 경로 시도
        #[cfg(windows)]
        let openclaw_home = if !real_home.exists() || real_home.to_string_lossy().contains("한글") {
            // USERPROFILE 환경변수 사용
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                PathBuf::from(userprofile).join(".openclaw")
            } else {
                openclaw_home
            }
        } else {
            openclaw_home
        };
        
        // OpenClaw 설치 위치
        let install_dir = dirs::data_local_dir()
            .ok_or("로컬 데이터 디렉토리를 찾을 수 없습니다")?
            .join("moldClaw/openclaw");
        
        Ok(Self {
            bundled_node,
            bundled_npm,
            openclaw_home,
            install_dir,
        })
    }
    
    pub async fn check_node_bundled(&self) -> bool {
        eprintln!("Checking bundled node at: {:?}", self.bundled_node);
        eprintln!("Node exists: {}", self.bundled_node.exists());
        eprintln!("NPM exists: {}", self.bundled_npm.exists());
        
        // 디렉토리 내용 확인
        if let Some(parent) = self.bundled_node.parent() {
            eprintln!("Parent directory: {:?}", parent);
            if parent.exists() {
                eprintln!("Directory contents:");
                if let Ok(entries) = fs::read_dir(parent) {
                    for entry in entries.flatten() {
                        eprintln!("  - {:?}", entry.file_name());
                    }
                }
            } else {
                eprintln!("Parent directory does not exist!");
            }
        }
        
        // 파일 크기 확인
        if self.bundled_node.exists() {
            if let Ok(metadata) = fs::metadata(&self.bundled_node) {
                eprintln!("Node.js file size: {} bytes", metadata.len());
            }
        }
        
        self.bundled_node.exists() && self.bundled_npm.exists()
    }
    
    pub async fn get_node_version(&self) -> Result<String, String> {
        let output = Command::new(&self.bundled_node)
            .arg("--version")
            .output()
            .map_err(|e| format!("Node.js 버전 확인 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err("Node.js 버전을 가져올 수 없습니다".to_string())
        }
    }
    
    pub async fn check_openclaw_installed(&self) -> bool {
        let openclaw_bin = self.get_openclaw_bin();
        openclaw_bin.exists()
    }
    
    pub async fn install_openclaw(&self) -> Result<String, String> {
        // 설치 디렉토리 생성
        fs::create_dir_all(&self.install_dir)
            .map_err(|e| format!("설치 디렉토리 생성 실패: {}", e))?;
        
        // npm으로 OpenClaw 설치
        let output = Command::new(&self.bundled_npm)
            .args([
                "install",
                "openclaw",
                "--prefix", self.install_dir.to_str().unwrap(),
                "--no-fund",
                "--no-audit",
            ])
            .env("PATH", self.get_node_path())
            .env("npm_config_cache", self.install_dir.join(".npm-cache"))
            .output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw 설치 완료!".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("OpenClaw 설치 실패: {}", stderr))
        }
    }
    
    pub async fn run_openclaw(&self, args: Vec<&str>) -> Result<String, String> {
        let openclaw_bin = self.get_openclaw_bin();
        
        if !openclaw_bin.exists() {
            return Err("OpenClaw가 설치되지 않았습니다".to_string());
        }
        
        // OpenClaw 실행
        let mut cmd = Command::new(&openclaw_bin);
        cmd.args(&args)
            .env("PATH", self.get_full_path())
            .env("HOME", dirs::home_dir().unwrap())
            .env("USERPROFILE", dirs::home_dir().unwrap())
            .env("OPENCLAW_CONFIG_DIR", &self.openclaw_home);
        
        let output = cmd.output()
            .map_err(|e| format!("OpenClaw 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("OpenClaw 오류: {}", stderr))
        }
    }
    
    pub async fn start_gateway(&self) -> Result<(), String> {
        // 백그라운드로 gateway 시작
        let openclaw_bin = self.get_openclaw_bin();
        
        Command::new(&openclaw_bin)
            .args(["gateway", "start"])
            .env("PATH", self.get_full_path())
            .env("HOME", dirs::home_dir().unwrap())
            .env("USERPROFILE", dirs::home_dir().unwrap())
            .env("OPENCLAW_CONFIG_DIR", &self.openclaw_home)
            .spawn()
            .map_err(|e| format!("Gateway 시작 실패: {}", e))?;
        
        Ok(())
    }
    
    pub async fn get_status(&self) -> Result<String, String> {
        Ok(self.run_openclaw(vec!["gateway", "status"]).await
            .map(|output| {
                if output.contains("online") || output.contains("running") {
                    "running".to_string()
                } else {
                    "stopped".to_string()
                }
            })
            .unwrap_or_else(|_| "stopped".to_string()))
    }
    
    fn get_openclaw_bin(&self) -> PathBuf {
        if cfg!(windows) {
            self.install_dir.join("node_modules/.bin/openclaw.cmd")
        } else {
            self.install_dir.join("node_modules/.bin/openclaw")
        }
    }
    
    fn get_node_path(&self) -> String {
        self.bundled_node.parent()
            .unwrap()
            .to_string_lossy()
            .to_string()
    }
    
    fn get_full_path(&self) -> String {
        let node_path = self.get_node_path();
        let system_path = std::env::var("PATH").unwrap_or_default();
        
        if cfg!(windows) {
            format!("{};{}", node_path, system_path)
        } else {
            format!("{}:{}", node_path, system_path)
        }
    }
}

// 기존 함수들을 OpenClawManager를 사용하도록 수정
static mut OPENCLAW_MANAGER: Option<OpenClawManager> = None;

pub fn init_manager(app_handle: &AppHandle) -> Result<(), String> {
    // 먼저 번들된 리소스에서 시도
    match OpenClawManager::new(app_handle) {
        Ok(manager) => {
            unsafe {
                OPENCLAW_MANAGER = Some(manager);
            }
            Ok(())
        }
        Err(e) => {
            eprintln!("번들된 Node.js를 찾을 수 없음: {}", e);
            
            // AppData에 Node.js가 있는지 확인
            if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
                let fallback_node_dir = app_data_dir.join("resources/node-portable");
                eprintln!("AppData 경로 확인: {:?}", fallback_node_dir);
                
                if fallback_node_dir.exists() {
                    // AppData의 Node.js를 사용하도록 Manager 재생성
                    eprintln!("AppData에서 Node.js 발견, 사용 시도");
                    // TODO: AppData 경로를 우선하는 생성자 추가
                }
            }
            
            Err(format!("Node.js Portable을 초기화할 수 없습니다: {}", e))
        }
    }
}

pub fn get_manager() -> Result<&'static OpenClawManager, String> {
    unsafe {
        OPENCLAW_MANAGER.as_ref()
            .ok_or("OpenClawManager가 초기화되지 않았습니다".to_string())
    }
}