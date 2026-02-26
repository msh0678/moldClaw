use crate::skills::*;
use once_cell::sync::Lazy;

/// 38개 스킬 정의
/// 
/// 참조 문서:
/// - SKILL_LIST_FILTERED.md
/// - SKILL_SETUP_REQUIREMENTS.md
/// - SKILL_SETUP_MACOS_ONLY.md
pub static SKILL_DEFINITIONS: Lazy<Vec<SkillDefinition>> = Lazy::new(|| {
    vec![
        // =========================================================================
        // Windows + macOS/Linux 지원 스킬
        // =========================================================================
        
        // 1password: brew (macOS/Linux) / winget (Windows)
        SkillDefinition {
            id: "1password".into(),
            name: "1Password".into(),
            description: "1Password CLI로 비밀번호 관리".into(),
            emoji: "🔐".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install 1password-cli".into()),
            windows_install_method: Some(InstallMethod::Winget),
            windows_install_command: Some("winget install AgileBits.1Password.CLI -e --accept-source-agreements".into()),
            binary_name: Some("op".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "op signin".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("op signout --all".into()),
                // 1Password는 세션 기반이지만 config 파일로 감지
                config_paths: vec!["~/.config/op/config".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // blogwatcher: go (전 플랫폼)
        SkillDefinition {
            id: "blogwatcher".into(),
            name: "Blog Watcher".into(),
            description: "블로그/RSS 피드 모니터링".into(),
            emoji: "📰".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("blogwatcher".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.blogwatcher/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // blucli: go (전 플랫폼)
        SkillDefinition {
            id: "blucli".into(),
            name: "BluOS CLI".into(),
            description: "Bluesound/NAD 스피커 제어".into(),
            emoji: "🔊".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/blucli/cmd/blu@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("blu".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Hardware { description: "BluOS 스피커가 같은 네트워크에 있어야 합니다".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/blucli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // clawhub: npm (전 플랫폼)
        SkillDefinition {
            id: "clawhub".into(),
            name: "ClawHub".into(),
            description: "OpenClaw 스킬 마켓플레이스".into(),
            emoji: "🏪".into(),
            category: "dev".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g clawhub".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("clawhub".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: Some("clawhub logout".into()),
                config_paths: vec!["~/.config/clawhub/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // eightctl: go (전 플랫폼)
        SkillDefinition {
            id: "eightctl".into(),
            name: "Eight Sleep".into(),
            description: "스마트 매트리스 제어".into(),
            emoji: "🛏️".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/eightctl/cmd/eightctl@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("eightctl".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["EIGHTCTL_EMAIL".into(), "EIGHTCTL_PASSWORD".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/eightctl/".into()],
                env_vars: vec!["EIGHTCTL_EMAIL".into(), "EIGHTCTL_PASSWORD".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // food-order: go (전 플랫폼)
        SkillDefinition {
            id: "food-order".into(),
            name: "Food Order".into(),
            description: "Foodora 음식 주문".into(),
            emoji: "🍕".into(),
            category: "lifestyle".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/ordercli/cmd/ordercli@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("ordercli".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "ordercli foodora session chrome --url https://www.foodora.at/".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                // ordercli 세션 생성 시 session.json 파일 생성
                config_paths: vec!["~/.config/ordercli/session.json".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // gifgrep: go (전 플랫폼, API 키 선택)
        SkillDefinition {
            id: "gifgrep".into(),
            name: "GIF Grep".into(),
            description: "GIF 검색 (Giphy, Tenor)".into(),
            emoji: "🎞️".into(),
            category: "media".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/gifgrep/cmd/gifgrep@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("gifgrep".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None, // API 키 선택적
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GIPHY_API_KEY".into(), "TENOR_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // local-places: uv (전 플랫폼)
        SkillDefinition {
            id: "local-places".into(),
            name: "Local Places".into(),
            description: "로컬 장소 검색 서버".into(),
            emoji: "🗺️".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Builtin, // OpenClaw 내장 스킬
            install_command: None,
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("uv".into()), // uv만 있으면 실행 가능
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["GOOGLE_PLACES_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GOOGLE_PLACES_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // mcporter: npm (전 플랫폼)
        SkillDefinition {
            id: "mcporter".into(),
            name: "MCP Porter".into(),
            description: "MCP 서버 관리".into(),
            emoji: "🔌".into(),
            category: "dev".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g mcporter".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("mcporter".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/mcporter/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // nano-banana-pro: OpenClaw 내장 스크립트 (uv run 실행)
        SkillDefinition {
            id: "nano-banana-pro".into(),
            name: "Nano Banana Pro".into(),
            description: "Gemini 비전 이미지 생성".into(),
            emoji: "🍌".into(),
            category: "media".into(),
            install_method: InstallMethod::Builtin, // OpenClaw 내장 스킬
            install_command: None,
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("uv".into()), // uv만 있으면 실행 가능
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["GEMINI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GEMINI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // nano-pdf: uv (전 플랫폼)
        SkillDefinition {
            id: "nano-pdf".into(),
            name: "Nano PDF".into(),
            description: "PDF 텍스트 추출/편집".into(),
            emoji: "📄".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Uv,
            install_command: Some("uv tool install nano-pdf".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("nano-pdf".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // openai-image-gen: manual (전 플랫폼, python3 필요)
        SkillDefinition {
            id: "openai-image-gen".into(),
            name: "DALL-E Image Gen".into(),
            description: "OpenAI DALL-E 이미지 생성".into(),
            emoji: "🎨".into(),
            category: "media".into(),
            install_method: InstallMethod::Manual,
            install_command: None,
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("python3".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["OPENAI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["OPENAI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // openai-whisper-api: builtin (전 플랫폼, curl 사용)
        SkillDefinition {
            id: "openai-whisper-api".into(),
            name: "Whisper API".into(),
            description: "OpenAI 음성 인식 API".into(),
            emoji: "🎙️".into(),
            category: "media".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("curl".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["OPENAI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["OPENAI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // oracle: npm (전 플랫폼) - API 키 선택적
        SkillDefinition {
            id: "oracle".into(),
            name: "Oracle".into(),
            description: "웹 검색 에이전트".into(),
            emoji: "🔮".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g @steipete/oracle".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("oracle".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None, // API 키 선택적 (없어도 기본 동작)
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.oracle/".into()],
                env_vars: vec!["OPENAI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ordercli: go (전 플랫폼) - food-order와 같은 바이너리
        SkillDefinition {
            id: "ordercli".into(),
            name: "Order CLI".into(),
            description: "Foodora 과거 주문 조회 및 활성 주문 상태 추적".into(),
            emoji: "🛒".into(),
            category: "lifestyle".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/ordercli/cmd/ordercli@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("ordercli".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "ordercli foodora session chrome --url https://www.foodora.at/".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                // ordercli 세션 생성 시 session.json 파일 생성
                config_paths: vec!["~/.config/ordercli/session.json".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // session-logs: brew (macOS/Linux) / winget (Windows)
        SkillDefinition {
            id: "session-logs".into(),
            name: "Session Logs".into(),
            description: "OpenClaw 세션 로그 검색".into(),
            emoji: "📜".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install jq ripgrep".into()),
            windows_install_method: Some(InstallMethod::Winget),
            windows_install_command: Some("winget install jqlang.jq && winget install BurntSushi.ripgrep.MSVC".into()),
            binary_name: Some("jq".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // sonoscli: go (전 플랫폼)
        SkillDefinition {
            id: "sonoscli".into(),
            name: "Sonos CLI".into(),
            description: "Sonos 스피커 제어".into(),
            emoji: "🔈".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/sonoscli/cmd/sonos@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("sonos".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Hardware { description: "Sonos 스피커가 같은 네트워크에 있어야 합니다".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/sonoscli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // video-frames: brew (macOS/Linux) / winget (Windows)
        SkillDefinition {
            id: "video-frames".into(),
            name: "Video Frames".into(),
            description: "ffmpeg로 비디오 프레임 추출".into(),
            emoji: "🎬".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install ffmpeg".into()),
            windows_install_method: Some(InstallMethod::Winget),
            windows_install_command: Some("winget install Gyan.FFmpeg -e --accept-source-agreements".into()),
            binary_name: Some("ffmpeg".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // wacli: brew (macOS/Linux) / go (Windows)
        SkillDefinition {
            id: "wacli".into(),
            name: "WhatsApp CLI".into(),
            description: "WhatsApp 메시지 전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/wacli".into()),
            windows_install_method: Some(InstallMethod::Go),
            windows_install_command: Some("go install github.com/steipete/wacli/cmd/wacli@latest".into()),
            binary_name: Some("wacli".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "wacli auth".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("wacli logout".into()),
                // wacli QR 로그인 완료 시 store.db 생성
                config_paths: vec!["~/.config/wacli/store.db".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // =========================================================================
        // macOS + Linux only (brew) - 12개
        // =========================================================================

        // camsnap: brew (macOS/Linux)
        SkillDefinition {
            id: "camsnap".into(),
            name: "Camera Snap".into(),
            description: "RTSP/ONVIF 카메라 스냅샷 (macOS ARM64 전용)".into(),
            emoji: "📷".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/camsnap".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("camsnap".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::Config { path: "~/.config/camsnap/config.yaml".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/camsnap/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // gog: brew (macOS/Linux)
        SkillDefinition {
            id: "gog".into(),
            name: "Google Workspace".into(),
            description: "Gmail, Calendar, Drive 통합 (macOS ARM64)".into(),
            emoji: "📧".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/gogcli".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("gog".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::Login { command: "read -p 'Google 이메일 주소: ' email && gog auth add \"$email\" --services gmail,calendar,drive".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("gog auth remove-all".into()),
                // gog 인증 완료 시 accounts.json 생성
                config_paths: vec!["~/.config/gog/accounts.json".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // goplaces: brew (macOS/Linux)
        SkillDefinition {
            id: "goplaces".into(),
            name: "Google Places".into(),
            description: "Google Places API 장소 검색 (macOS ARM64)".into(),
            emoji: "📍".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/goplaces".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("goplaces".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::ApiKey { vars: vec!["GOOGLE_PLACES_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GOOGLE_PLACES_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // himalaya: brew (macOS/Linux)
        // 연결 감지: config.toml 파일 존재 여부 (폴더가 아닌 설정 파일)
        SkillDefinition {
            id: "himalaya".into(),
            name: "Himalaya Email".into(),
            description: "IMAP/SMTP 이메일 클라이언트".into(),
            emoji: "📬".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install himalaya".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("himalaya".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "himalaya".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                // config.toml 파일로 연결 감지 + 해제 시 삭제
                config_paths: vec!["~/.config/himalaya/config.toml".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // obsidian: brew (macOS/Linux)
        SkillDefinition {
            id: "obsidian".into(),
            name: "Obsidian CLI".into(),
            description: "Obsidian 노트 연동".into(),
            emoji: "💎".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install yakitrak/yakitrak/obsidian-cli".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("obsidian-cli".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Config { path: "~/.config/obsidian-cli/".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/obsidian-cli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // openhue: brew (macOS/Linux)
        SkillDefinition {
            id: "openhue".into(),
            name: "Philips Hue".into(),
            description: "스마트 조명 제어".into(),
            emoji: "💡".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install openhue/cli/openhue-cli".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("openhue".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "openhue setup".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                // openhue Bridge 연결 완료 시 config.yaml 생성
                config_paths: vec!["~/.config/openhue/config.yaml".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // openai-whisper: brew (macOS/Linux)
        SkillDefinition {
            id: "openai-whisper".into(),
            name: "Whisper (Local)".into(),
            description: "로컬 음성 인식 (API 키 불필요)".into(),
            emoji: "🎤".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install openai-whisper".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("whisper".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.cache/whisper/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // sag: brew (macOS/Linux)
        SkillDefinition {
            id: "sag".into(),
            name: "ElevenLabs TTS".into(),
            description: "고품질 음성 합성 (macOS ARM64)".into(),
            emoji: "🗣️".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/sag".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("sag".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::ApiKey { vars: vec!["ELEVENLABS_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["ELEVENLABS_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // songsee: brew (macOS/Linux)
        SkillDefinition {
            id: "songsee".into(),
            name: "SongSee".into(),
            description: "오디오 스펙트로그램 시각화 (macOS ARM64)".into(),
            emoji: "🎼".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/songsee".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("songsee".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // spotify-player: brew (macOS/Linux)
        SkillDefinition {
            id: "spotify-player".into(),
            name: "Spotify Player".into(),
            description: "Spotify 음악 제어 (macOS ARM64)".into(),
            emoji: "🎵".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/spogo".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("spogo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::Login { command: "spogo auth import --browser chrome".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("spogo auth logout".into()),
                // spogo 인증 완료 시 credentials.json 생성
                config_paths: vec!["~/.config/spogo/credentials.json".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // summarize: brew (macOS/Linux)
        SkillDefinition {
            id: "summarize".into(),
            name: "Summarize".into(),
            description: "URL/파일/YouTube 요약 (macOS ARM64)".into(),
            emoji: "📋".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/summarize".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("summarize".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::ApiKey { vars: vec!["OPENAI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.summarize/".into()],
                env_vars: vec![
                    "OPENAI_API_KEY".into(),
                    "ANTHROPIC_API_KEY".into(),
                    "GEMINI_API_KEY".into(),
                    "XAI_API_KEY".into(),
                    "FIRECRAWL_API_KEY".into(),
                    "APIFY_API_TOKEN".into(),
                ],
                mac_permissions: None,
            },
            hidden: false,
        },

        // tmux: brew (macOS/Linux)
        SkillDefinition {
            id: "tmux".into(),
            name: "tmux".into(),
            description: "터미널 멀티플렉서".into(),
            emoji: "🖥️".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install tmux".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("tmux".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // =========================================================================
        // macOS only - 7개
        // =========================================================================

        // apple-notes: brew (macOS only)
        SkillDefinition {
            id: "apple-notes".into(),
            name: "Apple Notes".into(),
            description: "macOS 메모 앱 연동".into(),
            emoji: "📝".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install antoniorodr/memo/memo".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("memo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    automation: vec!["Notes.app".into()],
                    full_disk_access: false,
                    screen_recording: false,
                    accessibility: false,
                    reminders: false,
                },
            },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    automation: vec!["Notes.app".into()],
                    ..Default::default()
                }),
            },
            hidden: false,
        },

        // apple-reminders: brew (macOS only)
        SkillDefinition {
            id: "apple-reminders".into(),
            name: "Apple Reminders".into(),
            description: "macOS 미리 알림 연동".into(),
            emoji: "✅".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/remindctl".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("remindctl".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    reminders: true,
                    ..Default::default()
                },
            },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    reminders: true,
                    ..Default::default()
                }),
            },
            hidden: false,
        },

        // bear-notes: go (macOS only)
        SkillDefinition {
            id: "bear-notes".into(),
            name: "Bear Notes".into(),
            description: "Bear 노트 앱 연동".into(),
            emoji: "🐻".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/tylerwince/grizzly/cmd/grizzly@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("grizzly".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::Custom { description: "Bear 앱에서 API Token을 발급받아 입력".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/grizzly/token".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // imsg: brew (macOS only)
        SkillDefinition {
            id: "imsg".into(),
            name: "iMessage".into(),
            description: "iMessage/SMS 전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/imsg".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("imsg".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    automation: vec!["Messages.app".into()],
                    full_disk_access: true,
                    screen_recording: false,
                    accessibility: false,
                    reminders: false,
                },
            },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    automation: vec!["Messages.app".into()],
                    full_disk_access: true,
                    ..Default::default()
                }),
            },
            hidden: false,
        },

        // model-usage: brew cask (macOS only)
        SkillDefinition {
            id: "model-usage".into(),
            name: "CodexBar".into(),
            description: "AI 모델 사용량 추적".into(),
            emoji: "📊".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install --cask steipete/tap/codexbar".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("codexbar".into()), // OC requires.bins: ["codexbar"]
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // peekaboo: brew (macOS only)
        SkillDefinition {
            id: "peekaboo".into(),
            name: "Peekaboo".into(),
            description: "macOS UI 자동화".into(),
            emoji: "👀".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/peekaboo".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("peekaboo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    screen_recording: true,
                    accessibility: true,
                    ..Default::default()
                },
            },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: Some(MacPermissions {
                    screen_recording: true,
                    accessibility: true,
                    ..Default::default()
                }),
            },
            hidden: false,
        },

        // things-mac: go (macOS only)
        SkillDefinition {
            id: "things-mac".into(),
            name: "Things 3".into(),
            description: "Things 할일 관리".into(),
            emoji: "✓".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/ossianhempel/things3-cli/cmd/things@latest".into()),
            windows_install_method: None,
            windows_install_command: None,
            binary_name: Some("things".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    full_disk_access: true,
                    ..Default::default()
                },
            },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["THINGS_AUTH_TOKEN".into()],
                mac_permissions: Some(MacPermissions {
                    full_disk_access: true,
                    ..Default::default()
                }),
            },
            hidden: false,
        },
    ]
});
