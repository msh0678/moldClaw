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
        
        // Windows에서 실행 가능 확인
        #[cfg(windows)]
        {
            if !bundled_node.exists() {
                return Err(format!("Node.exe를 찾을 수 없습니다: {:?}", bundled_node));
            }
            if !bundled_npm.exists() {
                return Err(format!("npm.cmd를 찾을 수 없습니다: {:?}", bundled_npm));
            }
        }
        
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
        
        // Windows에서 대체 경로 시도 (경로가 유효하지 않은 경우만)
        #[cfg(windows)]
        let openclaw_home = if !real_home.exists() {
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
    
    pub fn get_install_dir(&self) -> &PathBuf {
        &self.install_dir
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
        let mut cmd = Command::new(&self.bundled_node);
        cmd.arg("--version");
        
        // Windows에서는 CREATE_NO_WINDOW 플래그 사용
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        
        let output = cmd.output()
            .map_err(|e| format!("Node.js 버전 확인 실패: {}", e))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Node.js 버전을 가져올 수 없습니다: {}", stderr))
        }
    }
    
    pub async fn check_openclaw_installed(&self) -> bool {
        // 1. 우리가 설치한 위치 확인
        let openclaw_bin = self.get_openclaw_bin();
        if openclaw_bin.exists() {
            eprintln!("OpenClaw 발견 (설치 디렉토리): {:?}", openclaw_bin);
            return true;
        }
        
        // 2. Windows - npm 전역 설치 위치 확인
        #[cfg(windows)]
        {
            // npm 전역 설치 기본 위치들
            let possible_paths = vec![
                // npm 기본 전역 설치 위치
                dirs::data_dir().map(|d| d.join("npm\\openclaw.cmd")),
                dirs::data_dir().map(|d| d.join("npm\\openclaw.ps1")),
                // 대체 npm 위치
                dirs::home_dir().map(|h| h.join("AppData\\Roaming\\npm\\openclaw.cmd")),
                dirs::home_dir().map(|h| h.join("AppData\\Roaming\\npm\\openclaw.ps1")),
                // Chocolatey - 환경변수 기반
                std::env::var("ProgramData").ok()
                    .map(|p| PathBuf::from(p).join("chocolatey\\bin\\openclaw.exe")),
                // Scoop
                dirs::home_dir().map(|h| h.join("scoop\\shims\\openclaw.cmd")),
                // LOCALAPPDATA 기반
                dirs::data_local_dir().map(|d| d.join("npm\\openclaw.cmd")),
            ];
            
            for path_option in possible_paths {
                if let Some(path) = path_option {
                    if path.exists() {
                        eprintln!("OpenClaw 발견 (전역 설치): {:?}", path);
                        return true;
                    }
                }
            }
            
            // where.exe로 PATH 검색 (에러 출력 억제)
            if let Ok(output) = Command::new("cmd")
                .args(["/C", "where openclaw 2>nul"])
                .output() {
                if output.status.success() {
                    let paths = String::from_utf8_lossy(&output.stdout);
                    for path in paths.lines() {
                        let path = path.trim();
                        if !path.is_empty() && PathBuf::from(path).exists() {
                            eprintln!("OpenClaw 발견 (PATH): {}", path);
                            return true;
                        }
                    }
                }
            }
        }
        
        // Unix 시스템
        #[cfg(not(windows))]
        {
            if let Ok(output) = Command::new("which")
                .arg("openclaw")
                .env("PATH", std::env::var("PATH").unwrap_or_default())
                .output() {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() && PathBuf::from(&path).exists() {
                        eprintln!("OpenClaw 발견 (시스템 전역): {}", path);
                        return true;
                    }
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
        
        // 번들된 OpenClaw 확인 (여러 경로 시도)
        let bundled_openclaw = {
            // 1. 먼저 실행파일 기준 경로 시도
            let exe_based = std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
                .and_then(|base| {
                    // Windows: .exe와 같은 디렉토리의 resources 폴더
                    // Linux/Mac: AppImage/bundle 구조
                    let paths_to_try = vec![
                        base.join("resources/openclaw-bundle"),
                        base.join("../resources/openclaw-bundle"), 
                        base.join("_up_/resources/openclaw-bundle"), // Tauri Windows 구조
                    ];
                    
                    for bundle_dir in paths_to_try {
                        eprintln!("번들 디렉토리 확인: {:?}", bundle_dir);
                        
                        // 가능한 파일명들
                        let possible_names = vec![
                            "openclaw-2026.2.12.tgz",
                            "openclaw.tgz",
                            "openclaw-latest.tgz",
                        ];
                        
                        for name in &possible_names {
                            let path = bundle_dir.join(name);
                            if path.exists() {
                                eprintln!("✓ 번들 파일 발견: {:?}", path);
                                return Some(path);
                            }
                        }
                        
                        // 디렉토리에서 .tgz 파일 찾기
                        if let Ok(entries) = fs::read_dir(&bundle_dir) {
                            for entry in entries.flatten() {
                                if let Some(ext) = entry.path().extension() {
                                    if ext == "tgz" {
                                        eprintln!("✓ 번들 파일 발견 (자동): {:?}", entry.path());
                                        return Some(entry.path());
                                    }
                                }
                            }
                        }
                    }
                    None
                });
            
            exe_based
        };
        
        if let Some(bundle_path) = bundled_openclaw {
            if bundle_path.exists() {
                eprintln!("번들된 OpenClaw 발견: {:?}", bundle_path);
                return self.install_from_bundle(&bundle_path).await;
            }
        }
        
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
        
        eprintln!("npm install 명령: tarball URL로 직접 설치 (Git 없이)");
        
        // Git 없이 tarball URL로 직접 설치 시도
        let mut cmd = Command::new(&self.bundled_npm);
        cmd.args([
                "install",
                "https://registry.npmjs.org/openclaw/-/openclaw-2026.2.12.tgz",  // 실제 버전의 tarball URL로 직접 설치
                "--prefix", install_prefix,
                "--no-fund",
                "--no-audit",
                "--no-update-notifier",
                "--no-optional",  // 선택적 의존성 제외
                "--ignore-scripts",  // Git을 호출할 수 있는 스크립트 무시
                "--prefer-offline",  // 오프라인 우선
                "--no-save",  // package.json 수정 안 함
                "--registry", "https://registry.npmjs.org",  // 공식 레지스트리만 사용
                "--progress=false",
            ])
            .env("PATH", self.get_full_path())  
            .env("npm_config_cache", cache_path)
            .env("npm_config_prefix", install_prefix)
            .env("NODE_ENV", "production");
        
        // 프록시 환경 전달 (기업 환경 대응)
        for proxy_var in &["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"] {
            if let Ok(value) = std::env::var(proxy_var) {
                cmd.env(proxy_var, value);
            }
        }
        
        // Windows에서 추가 환경변수
        #[cfg(windows)]
        {
            cmd.env("npm_config_script_shell", "cmd.exe");
            
            // Windows에서 npm이 node.exe를 찾을 수 있도록
            if let Some(node_dir) = self.bundled_node.parent() {
                cmd.env("NODE_PATH", node_dir);
            }
            
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
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
            
            // Git 관련 에러 처리 - 대체 방법 시도
            if stderr.contains("git") || stdout.contains("git") {
                eprintln!("Git 에러 감지, 대체 설치 방법 시도...");
                
                // tarball URL로 직접 설치 시도
                self.install_openclaw_from_tarball().await
                    .or_else(|e| {
                        Err(format!("Git 없이 설치 실패. 수동 설치가 필요합니다:\n\
                            1) https://www.npmjs.com/package/openclaw 에서 다운로드\n\
                            2) 또는 Git 설치: https://git-scm.com\n\
                            에러: {}", e))
                    })
            } else {
                Err(format!("OpenClaw 설치 실패:\n{}\n{}", stdout, stderr))
            }
        }
    }
    
    pub async fn run_openclaw(&self, args: Vec<&str>) -> Result<String, String> {
        // 실행할 OpenClaw 찾기
        let openclaw_bin = self.find_openclaw_executable()?;
        
        eprintln!("OpenClaw 실행: {:?} {:?}", openclaw_bin, args);
        
        // .mjs 파일인 경우 Node.js로 실행, 그 외는 직접 실행
        let mut cmd = if openclaw_bin.extension().and_then(|s| s.to_str()) == Some("mjs") {
            eprintln!("Node.js로 .mjs 파일 실행: {} {}", 
                self.bundled_node.to_str().unwrap(), 
                openclaw_bin.to_str().unwrap());
            let mut c = Command::new(&self.bundled_node);
            c.arg(&openclaw_bin);
            c
        } else {
            Command::new(&openclaw_bin)
        };
        cmd.args(&args)
            .env("PATH", self.get_full_path())
            .env("OPENCLAW_CONFIG_DIR", &self.openclaw_home);
        
        // 홈 디렉토리 안전하게 설정
        if let Some(home) = dirs::home_dir() {
            cmd.env("HOME", &home);
            #[cfg(windows)]
            cmd.env("USERPROFILE", &home);
        } else {
            // 폴백: 환경변수에서 가져오기
            if let Ok(home_env) = std::env::var("HOME") {
                cmd.env("HOME", home_env);
            }
            #[cfg(windows)]
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                cmd.env("USERPROFILE", userprofile);
            }
        }
        
        // Node.js 경로 명시적으로 설정
        cmd.env("NODE", &self.bundled_node);
        
        // Windows에서 추가 설정
        #[cfg(windows)]
        {
            // Windows에서 .cmd 파일 실행 시 필요
            cmd.env("PATHEXT", ".COM;.EXE;.BAT;.CMD;.PS1;.VBS;.JS;.WS;.MSC");
            
            // Windows 시스템 경로 확인
            if let Ok(system_root) = std::env::var("SystemRoot") {
                cmd.env("SystemRoot", system_root);
            }
            if let Ok(comspec) = std::env::var("COMSPEC") {
                cmd.env("COMSPEC", comspec);
            }
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
        
        let mut cmd = Command::new(&openclaw_bin);
        cmd.args(["gateway", "start"])
            .env("PATH", self.get_full_path())
            .env("OPENCLAW_CONFIG_DIR", &self.openclaw_home);
        
        // 홈 디렉토리 설정
        if let Some(home) = dirs::home_dir() {
            cmd.env("HOME", &home);
            #[cfg(windows)]
            cmd.env("USERPROFILE", &home);
        }
        
        // Windows 특별 처리
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
        }
        
        cmd.spawn()
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
        // 1. 직접 압축 해제한 경우 먼저 확인 (openclaw.mjs가 최상위에 있음)
        let direct_mjs = self.install_dir.join("openclaw.mjs");
        if direct_mjs.exists() {
            eprintln!("직접 압축 해제된 OpenClaw 발견: {:?}", direct_mjs);
            
            #[cfg(windows)]
            {
                // Windows에서는 .bat 파일 우선 (생성했다면)
                let bat_path = self.install_dir.join("openclaw.bat");
                if bat_path.exists() {
                    return bat_path;
                }
            }
            
            return direct_mjs;
        }
        
        // 2. npm install로 설치한 경우 (기존 로직)
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
    
    async fn install_from_bundle(&self, bundle_path: &PathBuf) -> Result<String, String> {
        eprintln!("번들에서 OpenClaw 직접 압축 해제 시작...");
        eprintln!("npm install 없이 순수 압축 해제!");
        
        // npm install 대신 직접 압축 해제 사용!
        use crate::openclaw_extractor;
        let result = openclaw_extractor::extract_openclaw_bundle(
            bundle_path, 
            &self.install_dir
        ).await?;
        
        // 압축 해제 후 실행 파일 확인
        let openclaw_exe = self.install_dir.join("openclaw.mjs");
        if openclaw_exe.exists() {
            eprintln!("✓ OpenClaw 실행 파일 확인: {:?}", openclaw_exe);
            
            // Windows에서 .bat 파일 생성 (편의를 위해)
            #[cfg(windows)]
            {
                let bat_content = format!(
                    "@echo off\n\"{}\" \"{}\" %*",
                    self.bundled_node.to_str().unwrap(),
                    openclaw_exe.to_str().unwrap()
                );
                let bat_path = self.install_dir.join("openclaw.bat");
                fs::write(&bat_path, bat_content)
                    .map_err(|e| format!("bat 파일 생성 실패: {}", e))?;
                eprintln!("✓ openclaw.bat 생성 완료");
            }
            
            Ok(format!("OpenClaw 번들 압축 해제 완료! npm install 없이 성공!\n{}", result))
        } else {
            Err("압축 해제는 성공했지만 openclaw.mjs를 찾을 수 없습니다".to_string())
        }
    }
    
    async fn install_openclaw_from_tarball(&self) -> Result<String, String> {
        eprintln!("Tarball에서 OpenClaw 직접 설치 시도...");
        
        // 방법 1: 직접 tarball URL 사용 (npm pack 대신)
        let tarball_url = "https://registry.npmjs.org/openclaw/-/openclaw-2026.2.12.tgz";
        let output = Command::new(&self.bundled_npm)
            .args([
                "install",
                tarball_url,
                "--prefix", self.install_dir.to_str().unwrap(),
                "--no-fund",
                "--no-audit",
                "--no-optional",
                "--ignore-scripts",
                "--no-save",
            ])
            .output()
            .map_err(|e| format!("tarball URL 설치 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw가 tarball URL로 직접 설치되었습니다!".to_string())
        } else {
            // Windows에서 추가 fallback
            #[cfg(windows)]
            {
                eprintln!("npm 설치 실패, PowerShell 다운로드 시도...");
                return self.install_openclaw_windows_fallback().await;
            }
            
            #[cfg(not(windows))]
            {
                // 직접 URL 사용
                self.install_from_npm_registry().await
            }
        }
    }
    
    #[cfg(windows)]
    async fn install_openclaw_windows_fallback(&self) -> Result<String, String> {
        eprintln!("Windows PowerShell fallback 설치 시도...");
        
        // PowerShell로 직접 다운로드
        let ps_script = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            try {{
                $tempDir = '{}'
                $url = 'https://registry.npmjs.org/openclaw/-/openclaw-2026.2.12.tgz'
                $tarPath = Join-Path $tempDir 'openclaw.tgz'
                
                Write-Host "Downloading OpenClaw..."
                Invoke-WebRequest -Uri $url -OutFile $tarPath
                
                Write-Host "Download complete. Installing..."
                & '{}' install $tarPath --prefix '{}' --no-fund --no-audit --ignore-scripts
            }} catch {{
                Write-Error $_.Exception.Message
                exit 1
            }}
            "#,
            self.install_dir.to_str().unwrap(),
            self.bundled_npm.to_str().unwrap(),
            self.install_dir.to_str().unwrap()
        );
        
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .output()
            .map_err(|e| format!("PowerShell 실행 실패: {}", e))?;
        
        if output.status.success() {
            Ok("PowerShell을 통해 OpenClaw가 설치되었습니다!".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("PowerShell 설치 실패: {}", stderr))
        }
    }
    
    async fn install_from_npm_registry(&self) -> Result<String, String> {
        eprintln!("NPM 레지스트리에서 직접 다운로드...");
        
        // 최신 버전 사용
        let tarball_url = "https://registry.npmjs.org/openclaw/-/openclaw-2026.2.12.tgz";
        
        let output = Command::new(&self.bundled_npm)
            .args([
                "install",
                tarball_url,
                "--prefix", self.install_dir.to_str().unwrap(),
                "--no-fund",
                "--no-audit",
                "--no-optional",
            ])
            .output()
            .map_err(|e| format!("레지스트리 설치 실패: {}", e))?;
        
        if output.status.success() {
            Ok("OpenClaw가 NPM 레지스트리에서 설치되었습니다!".to_string())
        } else {
            Err(format!("NPM 레지스트리 설치 실패: {}", 
                String::from_utf8_lossy(&output.stderr)))
        }
    }
    
    fn find_openclaw_executable(&self) -> Result<PathBuf, String> {
        // 1. 우리가 설치한 위치 확인
        let local_bin = self.get_openclaw_bin();
        if local_bin.exists() {
            return Ok(local_bin);
        }
        
        // 2. Windows - 알려진 위치 확인
        #[cfg(windows)]
        {
            let known_locations = vec![
                // npm 전역 설치 - dirs API 사용
                dirs::data_dir().map(|d| d.join("npm\\openclaw.cmd")),
                dirs::data_dir().map(|d| d.join("npm\\openclaw.ps1")),
                // node_modules/.bin 스타일
                dirs::data_dir().map(|d| d.join("npm\\node_modules\\.bin\\openclaw.cmd")),
                // 환경변수 기반
                std::env::var("APPDATA").ok()
                    .map(|p| PathBuf::from(p).join("npm\\openclaw.cmd")),
            ];
            
            for path_option in known_locations {
                if let Some(path) = path_option {
                    if path.exists() {
                        return Ok(path);
                    }
                }
            }
            
            // cmd /C where 사용 (더 안정적)
            if let Ok(output) = Command::new("cmd")
                .args(["/C", "where openclaw 2>nul"])
                .output() {
                if output.status.success() {
                    let paths = String::from_utf8_lossy(&output.stdout);
                    for line in paths.lines() {
                        let path = PathBuf::from(line.trim());
                        if path.exists() && (path.extension().map_or(false, |ext| 
                            ext == "cmd" || ext == "exe" || ext == "ps1" || ext == "bat"
                        )) {
                            return Ok(path);
                        }
                    }
                }
            }
        }
        
        // Unix
        #[cfg(not(windows))]
        {
            if let Ok(output) = Command::new("which")
                .arg("openclaw")
                .output() {
                if output.status.success() {
                    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path_str.is_empty() {
                        let path = PathBuf::from(path_str);
                        if path.exists() {
                            return Ok(path);
                        }
                    }
                }
            }
        }
        
        Err("OpenClaw가 설치되지 않았습니다. 'OpenClaw 설치' 버튼을 클릭하세요.".to_string())
    }
    
    fn get_node_path(&self) -> String {
        self.bundled_node.parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| {
                eprintln!("경고: Node.js 부모 디렉토리를 찾을 수 없습니다");
                String::new()
            })
    }
    
    fn get_full_path(&self) -> String {
        let node_path = self.get_node_path();
        let system_path = std::env::var("PATH").unwrap_or_default();
        
        #[cfg(windows)]
        {
            // Windows: 세미콜론 구분, 중복 제거
            if system_path.contains(&node_path) {
                system_path
            } else {
                format!("{};{}", node_path, system_path)
            }
        }
        
        #[cfg(not(windows))]
        {
            // Unix: 콜론 구분
            if system_path.contains(&node_path) {
                system_path
            } else {
                format!("{}:{}", node_path, system_path)
            }
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