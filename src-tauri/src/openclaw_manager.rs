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
        
        // OpenClaw 설치 위치 - OS별 표준 위치 사용
        let install_dir = if cfg!(windows) {
            // Windows: %LOCALAPPDATA%\Programs\openclaw
            dirs::data_local_dir()
                .ok_or("로컬 데이터 디렉토리를 찾을 수 없습니다")?
                .join("Programs/openclaw")
        } else if cfg!(target_os = "macos") {
            // macOS: ~/Library/Application Support/openclaw
            dirs::data_dir()
                .ok_or("데이터 디렉토리를 찾을 수 없습니다")?
                .join("openclaw")
        } else {
            // Linux: ~/.local/share/openclaw
            dirs::data_local_dir()
                .ok_or("로컬 데이터 디렉토리를 찾을 수 없습니다")?
                .join("openclaw")
        };
        
        eprintln!("OpenClaw 설치 디렉토리: {:?}", install_dir);
        eprintln!("OpenClaw 설정 디렉토리: {:?}", openclaw_home);
        
        // 설치 디렉토리가 moldClaw 앱 디렉토리가 아님을 확인
        if let Ok(app_data) = app_handle.path().app_data_dir() {
            if install_dir.starts_with(&app_data) {
                eprintln!("⚠️  경고: OpenClaw가 moldClaw 앱 디렉토리 내부에 설치됨");
            }
        }
        
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
        // 1. 우리가 설치한 위치 확인
        let openclaw_bin = self.get_openclaw_bin();
        if openclaw_bin.exists() {
            eprintln!("OpenClaw 발견 (설치 디렉토리): {:?}", openclaw_bin);
            return true;
        }
        
        // 2. 시스템 전역 설치 확인 (npm install -g openclaw)
        if let Ok(output) = Command::new("which")
            .arg("openclaw")
            .output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    eprintln!("OpenClaw 발견 (시스템 전역): {}", path);
                    return true;
                }
            }
        }
        
        // Windows에서는 where 명령 사용
        #[cfg(windows)]
        if let Ok(output) = Command::new("where")
            .arg("openclaw")
            .output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    eprintln!("OpenClaw 발견 (시스템 전역): {}", path);
                    return true;
                }
            }
        }
        
        false
    }
    
    pub async fn get_openclaw_version(&self) -> Result<String, String> {
        let openclaw_bin = self.find_openclaw_executable()?;
        
        let output = Command::new(&openclaw_bin)
            .arg("--version")
            .output()
            .map_err(|e| format!("버전 확인 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err("버전 정보를 가져올 수 없습니다".to_string())
        }
    }
    
    pub async fn install_openclaw(&self) -> Result<String, String> {
        eprintln!("OpenClaw 설치 확인...");
        eprintln!("설치 디렉토리: {:?}", self.install_dir);
        
        // 기존 설치 확인
        if self.check_openclaw_installed().await {
            let existing_openclaw = self.get_openclaw_bin();
            eprintln!("✓ 기존 OpenClaw 설치 발견: {:?}", existing_openclaw);
            
            // 버전 확인
            if let Ok(version_output) = Command::new(&existing_openclaw)
                .arg("--version")
                .output() {
                let version = String::from_utf8_lossy(&version_output.stdout);
                let version_str = version.trim();
                eprintln!("✓ 설치된 버전: {}", version_str);
                
                // 작동 확인
                if version_str.contains("openclaw") || version_str.contains("OpenClaw") {
                    return Ok(format!("OpenClaw가 이미 설치되어 있습니다 (버전: {})", version_str));
                }
            }
            
            eprintln!("⚠️  기존 설치가 손상되었을 수 있습니다. 재설치를 진행합니다...");
        }
        
        eprintln!("OpenClaw 신규 설치 시작...");
        eprintln!("npm 경로: {:?}", self.bundled_npm);
        
        fs::create_dir_all(&self.install_dir)
            .map_err(|e| format!("설치 디렉토리 생성 실패: {} (경로: {:?})", e, self.install_dir))?;
        
        // 설치 경로를 안전하게 문자열로 변환 (한글/특수문자 대응)
        let install_prefix = self.install_dir
            .to_str()
            .ok_or_else(|| {
                format!("설치 경로를 문자열로 변환할 수 없습니다: {:?}", self.install_dir)
            })?;
        
        // npm 캐시 디렉토리 설정 (공백 있는 경로 대응)
        let cache_dir = self.install_dir.join(".npm-cache");
        fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("캐시 디렉토리 생성 실패: {}", e))?;
        
        let cache_path = cache_dir
            .to_str()
            .ok_or("캐시 경로 변환 실패")?;
        
        eprintln!("npm install 명령: npm install openclaw --prefix \"{}\"", install_prefix);
        
        // npm으로 OpenClaw 설치
        let mut cmd = Command::new(&self.bundled_npm);
        cmd.args([
                "install",
                "openclaw",
                "--prefix", install_prefix,
                "--no-fund",
                "--no-audit",
                "--no-update-notifier",
                "--progress=false",
            ])
            .env("PATH", self.get_full_path())  // get_node_path 대신 get_full_path 사용
            .env("npm_config_cache", cache_path)
            .env("npm_config_prefix", install_prefix)
            .env("NODE_ENV", "production");
        
        // Windows에서 추가 환경변수
        #[cfg(windows)]
        {
            cmd.env("npm_config_script_shell", "cmd.exe");
        }
        
        eprintln!("npm install 실행 중...");
        let output = cmd.output()
            .map_err(|e| format!("npm 실행 실패: {}", e))?;
        
        if output.status.success() {
            eprintln!("✓ OpenClaw 설치 성공");
            
            // 설치 확인
            let openclaw_bin = self.get_openclaw_bin();
            if openclaw_bin.exists() {
                eprintln!("✓ OpenClaw 실행파일 확인: {:?}", openclaw_bin);
                Ok("OpenClaw 설치 완료!".to_string())
            } else {
                Err(format!("설치는 성공했지만 실행파일을 찾을 수 없습니다: {:?}", openclaw_bin))
            }
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            eprintln!("✗ npm install 실패");
            eprintln!("stdout: {}", stdout);
            eprintln!("stderr: {}", stderr);
            Err(format!("OpenClaw 설치 실패:\n{}\n{}", stdout, stderr))
        }
    }
    
    pub async fn run_openclaw(&self, args: Vec<&str>) -> Result<String, String> {
        // 실행할 OpenClaw 찾기
        let openclaw_bin = self.find_openclaw_executable()?;
        
        eprintln!("OpenClaw 실행: {:?} {:?}", openclaw_bin, args);
        
        // OpenClaw 실행
        let mut cmd = Command::new(&openclaw_bin);
        cmd.args(&args)
            .env("PATH", self.get_full_path())
            .env("OPENCLAW_CONFIG_DIR", &self.openclaw_home);
        
        // 홈 디렉토리 안전하게 설정
        if let Some(home) = dirs::home_dir() {
            cmd.env("HOME", &home);
            #[cfg(windows)]
            cmd.env("USERPROFILE", &home);
        }
        
        // Node.js 경로 명시적으로 설정
        cmd.env("NODE", &self.bundled_node);
        
        // Windows에서 추가 설정
        #[cfg(windows)]
        {
            // Windows에서 .cmd 파일 실행 시 필요
            cmd.env("PATHEXT", ".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC");
        }
        
        let output = cmd.output()
            .map_err(|e| {
                eprintln!("OpenClaw 실행 오류: {}", e);
                format!("OpenClaw 실행 실패: {}", e)
            })?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        if output.status.success() {
            Ok(stdout.to_string())
        } else {
            eprintln!("OpenClaw 실행 실패");
            eprintln!("stdout: {}", stdout);
            eprintln!("stderr: {}", stderr);
            Err(format!("OpenClaw 오류:\n{}\n{}", stdout, stderr))
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
        let bin_dir = self.install_dir.join("node_modules/.bin");
        
        if cfg!(windows) {
            // Windows에서는 .cmd 파일 우선, 없으면 .ps1, .bat 순서로 확인
            let cmd_path = bin_dir.join("openclaw.cmd");
            if cmd_path.exists() {
                return cmd_path;
            }
            
            let ps1_path = bin_dir.join("openclaw.ps1");
            if ps1_path.exists() {
                return ps1_path;
            }
            
            let bat_path = bin_dir.join("openclaw.bat");
            if bat_path.exists() {
                return bat_path;
            }
            
            // 기본값
            cmd_path
        } else {
            // Unix 시스템에서는 심볼릭 링크 확인
            let openclaw_path = bin_dir.join("openclaw");
            
            // 실행 권한 자동 설정
            #[cfg(unix)]
            if openclaw_path.exists() {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = fs::metadata(&openclaw_path) {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = fs::set_permissions(&openclaw_path, perms);
                }
            }
            
            openclaw_path
        }
    }
    
    fn find_openclaw_executable(&self) -> Result<PathBuf, String> {
        // 1. 우리가 설치한 위치 확인
        let local_bin = self.get_openclaw_bin();
        if local_bin.exists() {
            return Ok(local_bin);
        }
        
        // 2. 시스템 PATH에서 찾기
        if let Ok(output) = Command::new(if cfg!(windows) { "where" } else { "which" })
            .arg("openclaw")
            .output() {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() {
                    // Windows의 where는 여러 줄 출력 가능
                    let first_path = path_str.lines().next().unwrap_or(&path_str);
                    return Ok(PathBuf::from(first_path));
                }
            }
        }
        
        Err("OpenClaw가 설치되지 않았습니다. 'OpenClaw 설치' 버튼을 클릭하세요.".to_string())
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