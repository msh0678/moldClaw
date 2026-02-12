use std::process::Command;
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};

pub struct OpenClawManager {
    bundled_node: PathBuf,
    bundled_npm: PathBuf,
    openclaw_home: PathBuf,
    install_dir: PathBuf,
}

impl OpenClawManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        // 번들된 Node.js 경로
        let resource_dir = app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("리소스 디렉토리 오류: {}", e))?;
        
        // 디버깅을 위한 경로 출력
        eprintln!("Resource directory: {:?}", resource_dir);
        
        let node_dir = resource_dir.join("node-portable");
        eprintln!("Node directory: {:?}", node_dir);
        eprintln!("Node directory exists: {}", node_dir.exists());
        
        // 대체 경로들 시도
        let possible_dirs = vec![
            resource_dir.join("node-portable"),
            resource_dir.join("_up_/src-tauri/resources/node-portable"),
            app_handle.path().app_data_dir()
                .unwrap_or_default()
                .join("resources/node-portable"),
        ];
        
        let mut found_dir = None;
        for dir in &possible_dirs {
            eprintln!("Trying directory: {:?}, exists: {}", dir, dir.exists());
            if dir.exists() {
                found_dir = Some(dir.clone());
                break;
            }
        }
        
        let node_dir = found_dir.unwrap_or(node_dir);
        
        let bundled_node = if cfg!(windows) {
            node_dir.join("node.exe")
        } else {
            node_dir.join("bin/node")
        };
        
        let bundled_npm = if cfg!(windows) {
            node_dir.join("npm.cmd")
        } else {
            node_dir.join("bin/npm")
        };
        
        // 실제 사용자 홈
        let real_home = dirs::home_dir()
            .ok_or("홈 디렉토리를 찾을 수 없습니다")?;
        let openclaw_home = real_home.join(".openclaw");
        
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
    unsafe {
        OPENCLAW_MANAGER = Some(OpenClawManager::new(app_handle)?);
    }
    Ok(())
}

pub fn get_manager() -> Result<&'static OpenClawManager, String> {
    unsafe {
        OPENCLAW_MANAGER.as_ref()
            .ok_or("OpenClawManager가 초기화되지 않았습니다".to_string())
    }
}