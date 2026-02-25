use crate::skills::*;
use once_cell::sync::Lazy;

pub static SKILL_DEFINITIONS: Lazy<Vec<SkillDefinition>> = Lazy::new(|| {
    vec![
        // ===== 자동 활성화 (hidden: true) =====
        SkillDefinition {
            id: "canvas".into(),
            name: "Canvas".into(),
            description: "OpenClaw 내장 캔버스".into(),
            emoji: "🎨".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "healthcheck".into(),
            name: "Healthcheck".into(),
            description: "시스템 상태 점검".into(),
            emoji: "🏥".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "skill-creator".into(),
            name: "Skill Creator".into(),
            description: "새 스킬 생성 도구".into(),
            emoji: "🛠️".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },
        SkillDefinition {
            id: "weather".into(),
            name: "Weather".into(),
            description: "날씨 정보 조회".into(),
            emoji: "🌤️".into(),
            category: "builtin".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: Some("curl".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: true,
        },

        // ===== 1password =====
        // Note: Windows는 winget 필요하나 현재 brew만 지원, Windows 비활성화
        SkillDefinition {
            id: "1password".into(),
            name: "1Password".into(),
            description: "비밀번호 관리자 연동".into(),
            emoji: "🔐".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install 1password-cli".into()),
            binary_name: Some("op".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "op signin".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("op signout --all".into()),
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== apple-notes =====
        SkillDefinition {
            id: "apple-notes".into(),
            name: "Apple Notes".into(),
            description: "macOS 메모 앱 연동".into(),
            emoji: "📝".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install antoniorodr/memo/memo".into()),
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

        // ===== apple-reminders =====
        SkillDefinition {
            id: "apple-reminders".into(),
            name: "Apple Reminders".into(),
            description: "macOS 미리 알림 연동".into(),
            emoji: "✅".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/remindctl".into()),
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

        // ===== bear-notes =====
        SkillDefinition {
            id: "bear-notes".into(),
            name: "Bear Notes".into(),
            description: "Bear 노트 앱 연동".into(),
            emoji: "🐻".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/tylerwince/grizzly/cmd/grizzly@latest".into()),
            binary_name: Some("grizzly".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::Login { command: "Bear 앱에서 Help → API Token 복사 후 ~/.config/grizzly/token에 저장".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/grizzly/token".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== blogwatcher =====
        SkillDefinition {
            id: "blogwatcher".into(),
            name: "Blog Watcher".into(),
            description: "블로그/RSS 피드 구독".into(),
            emoji: "📰".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest".into()),
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

        // ===== blucli =====
        SkillDefinition {
            id: "blucli".into(),
            name: "BluOS CLI".into(),
            description: "Bluesound/NAD 스피커 제어".into(),
            emoji: "🔊".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/blucli/cmd/blu@latest".into()),
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

        // ===== camsnap =====
        SkillDefinition {
            id: "camsnap".into(),
            name: "Camera Snap".into(),
            description: "IP 카메라 스냅샷".into(),
            emoji: "📷".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/camsnap".into()),
            binary_name: Some("camsnap".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Config { path: "~/.config/camsnap/config.yaml".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/camsnap/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== clawhub =====
        SkillDefinition {
            id: "clawhub".into(),
            name: "ClawHub".into(),
            description: "OpenClaw 스킬 마켓플레이스".into(),
            emoji: "🏪".into(),
            category: "dev".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g clawhub".into()),
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

        // ===== coding-agent =====
        SkillDefinition {
            id: "coding-agent".into(),
            name: "Coding Agent".into(),
            description: "AI 코딩 에이전트 연동".into(),
            emoji: "🤖".into(),
            category: "dev".into(),
            install_method: InstallMethod::Manual,
            install_command: None,
            binary_name: Some("claude".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Custom { description: "Claude Code, Codex, OpenCode 중 하나 설치 필요".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.claude/".into(), "~/.codex/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== eightctl =====
        SkillDefinition {
            id: "eightctl".into(),
            name: "Eight Sleep".into(),
            description: "스마트 매트리스 제어".into(),
            emoji: "🛏️".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/eightctl/cmd/eightctl@latest".into()),
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

        // ===== food-order =====
        SkillDefinition {
            id: "food-order".into(),
            name: "Food Order".into(),
            description: "Foodora 음식 주문".into(),
            emoji: "🍕".into(),
            category: "lifestyle".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/ordercli/cmd/ordercli@latest".into()),
            binary_name: Some("ordercli".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "ordercli foodora session chrome --url https://www.foodora.at/".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/ordercli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== gifgrep =====
        // Note: API 키는 선택적 (없으면 데모 키 사용)
        SkillDefinition {
            id: "gifgrep".into(),
            name: "GIF Grep".into(),
            description: "GIF 검색".into(),
            emoji: "🎞️".into(),
            category: "media".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/gifgrep/cmd/gifgrep@latest".into()),
            binary_name: Some("gifgrep".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::None,  // API 키 선택적
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GIPHY_API_KEY".into(), "TENOR_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== gog =====
        SkillDefinition {
            id: "gog".into(),
            name: "Google Workspace".into(),
            description: "Gmail, Calendar, Drive 통합".into(),
            emoji: "📧".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/gogcli".into()),
            binary_name: Some("gog".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "gog auth add <email> --services gmail,calendar,drive".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("gog auth remove-all".into()),
                config_paths: vec!["~/.config/gog/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== goplaces =====
        SkillDefinition {
            id: "goplaces".into(),
            name: "Google Places".into(),
            description: "장소 검색".into(),
            emoji: "📍".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/goplaces".into()),
            binary_name: Some("goplaces".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["GOOGLE_PLACES_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["GOOGLE_PLACES_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== himalaya =====
        SkillDefinition {
            id: "himalaya".into(),
            name: "Himalaya Email".into(),
            description: "터미널 이메일 클라이언트".into(),
            emoji: "📬".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install himalaya".into()),
            binary_name: Some("himalaya".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Config { path: "~/.config/himalaya/config.toml".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/himalaya/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== imsg =====
        SkillDefinition {
            id: "imsg".into(),
            name: "iMessage".into(),
            description: "iMessage 읽기/전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/imsg".into()),
            binary_name: Some("imsg".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: false },
            setup: SetupRequirement::MacPermission {
                permissions: MacPermissions {
                    automation: vec!["Messages.app".into()],
                    full_disk_access: true,
                    ..Default::default()
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

        // ===== local-places =====
        SkillDefinition {
            id: "local-places".into(),
            name: "Local Places".into(),
            description: "로컬 장소 검색 서버".into(),
            emoji: "🗺️".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Uv,
            install_command: Some("uv tool install local-places".into()),
            binary_name: Some("local-places".into()),
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

        // ===== mcporter =====
        SkillDefinition {
            id: "mcporter".into(),
            name: "MCP Porter".into(),
            description: "MCP 서버 관리".into(),
            emoji: "🔌".into(),
            category: "dev".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g mcporter".into()),
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

        // ===== model-usage =====
        SkillDefinition {
            id: "model-usage".into(),
            name: "CodexBar".into(),
            description: "AI 모델 사용량 추적".into(),
            emoji: "📊".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install --cask steipete/tap/codexbar".into()),
            binary_name: None,
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

        // ===== nano-banana-pro =====
        SkillDefinition {
            id: "nano-banana-pro".into(),
            name: "Nano Banana Pro".into(),
            description: "Gemini 비전 분석".into(),
            emoji: "🍌".into(),
            category: "media".into(),
            install_method: InstallMethod::Uv,
            install_command: Some("uv tool install nano-banana-pro".into()),
            binary_name: Some("nano-banana-pro".into()),
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

        // ===== nano-pdf =====
        SkillDefinition {
            id: "nano-pdf".into(),
            name: "Nano PDF".into(),
            description: "PDF 텍스트 추출".into(),
            emoji: "📄".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Uv,
            install_command: Some("uv tool install nano-pdf".into()),
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

        // ===== obsidian =====
        SkillDefinition {
            id: "obsidian".into(),
            name: "Obsidian CLI".into(),
            description: "Obsidian 노트 연동".into(),
            emoji: "💎".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install yakitrak/yakitrak/obsidian-cli".into()),
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

        // ===== openai-image-gen =====
        SkillDefinition {
            id: "openai-image-gen".into(),
            name: "DALL-E Image Gen".into(),
            description: "AI 이미지 생성".into(),
            emoji: "🎨".into(),
            category: "media".into(),
            install_method: InstallMethod::Manual,
            install_command: None,
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

        // ===== openai-whisper =====
        SkillDefinition {
            id: "openai-whisper".into(),
            name: "Whisper (Local)".into(),
            description: "로컬 음성 인식".into(),
            emoji: "🎤".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install openai-whisper".into()),
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

        // ===== openai-whisper-api =====
        SkillDefinition {
            id: "openai-whisper-api".into(),
            name: "Whisper API".into(),
            description: "OpenAI 음성 인식 API".into(),
            emoji: "🎙️".into(),
            category: "media".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
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

        // ===== openhue =====
        SkillDefinition {
            id: "openhue".into(),
            name: "Philips Hue".into(),
            description: "스마트 조명 제어".into(),
            emoji: "💡".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install openhue/cli/openhue-cli".into()),
            binary_name: Some("openhue".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "openhue setup (30초 내에 Bridge 버튼 누르기)".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.config/openhue/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== oracle =====
        SkillDefinition {
            id: "oracle".into(),
            name: "Oracle".into(),
            description: "웹 검색 에이전트".into(),
            emoji: "🔮".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Npm,
            install_command: Some("npm install -g @steipete/oracle".into()),
            binary_name: Some("oracle".into()),
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["OPENAI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.oracle/".into()],
                env_vars: vec!["OPENAI_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== peekaboo =====
        SkillDefinition {
            id: "peekaboo".into(),
            name: "Peekaboo".into(),
            description: "macOS UI 자동화".into(),
            emoji: "👀".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/peekaboo".into()),
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

        // ===== sag =====
        SkillDefinition {
            id: "sag".into(),
            name: "ElevenLabs TTS".into(),
            description: "고품질 음성 합성".into(),
            emoji: "🗣️".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/sag".into()),
            binary_name: Some("sag".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["ELEVENLABS_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec!["ELEVENLABS_API_KEY".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== session-logs =====
        SkillDefinition {
            id: "session-logs".into(),
            name: "Session Logs".into(),
            description: "세션 로그 검색".into(),
            emoji: "📜".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install jq ripgrep".into()),
            binary_name: Some("jq".into()),
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

        // ===== sherpa-onnx-tts =====
        SkillDefinition {
            id: "sherpa-onnx-tts".into(),
            name: "Sherpa ONNX TTS".into(),
            description: "로컬 TTS 엔진".into(),
            emoji: "🔊".into(),
            category: "media".into(),
            install_method: InstallMethod::Manual,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Custom { description: "런타임 + 모델 다운로드 필요".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.openclaw/tools/sherpa-onnx-tts/".into()],
                env_vars: vec!["SHERPA_ONNX_RUNTIME_DIR".into(), "SHERPA_ONNX_MODEL_DIR".into()],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== songsee =====
        SkillDefinition {
            id: "songsee".into(),
            name: "SongSee".into(),
            description: "오디오 스펙트로그램".into(),
            emoji: "🎼".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/songsee".into()),
            binary_name: Some("songsee".into()),
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

        // ===== sonoscli =====
        SkillDefinition {
            id: "sonoscli".into(),
            name: "Sonos CLI".into(),
            description: "Sonos 스피커 제어".into(),
            emoji: "🔈".into(),
            category: "smarthome".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/steipete/sonoscli/cmd/sonos@latest".into()),
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

        // ===== spotify-player =====
        SkillDefinition {
            id: "spotify-player".into(),
            name: "Spotify Player".into(),
            description: "Spotify 음악 제어".into(),
            emoji: "🎵".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/spogo".into()),
            binary_name: Some("spogo".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "spogo auth import --browser chrome".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("spogo auth logout".into()),
                config_paths: vec!["~/.config/spogo/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== summarize =====
        SkillDefinition {
            id: "summarize".into(),
            name: "Summarize".into(),
            description: "URL/파일 요약".into(),
            emoji: "📋".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/summarize".into()),
            binary_name: Some("summarize".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::ApiKey { vars: vec!["OPENAI_API_KEY".into()] },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec!["~/.summarize/".into()],
                env_vars: vec![
                    "OPENAI_API_KEY".into(), 
                    "ANTHROPIC_API_KEY".into(), 
                    "GEMINI_API_KEY".into(),
                    "FIRECRAWL_API_KEY".into(),
                    "APIFY_API_TOKEN".into(),
                ],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== things-mac =====
        SkillDefinition {
            id: "things-mac".into(),
            name: "Things 3".into(),
            description: "Things 할일 관리".into(),
            emoji: "✓".into(),
            category: "productivity".into(),
            install_method: InstallMethod::Go,
            install_command: Some("go install github.com/ossianhempel/things3-cli/cmd/things@latest".into()),
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

        // ===== tmux =====
        SkillDefinition {
            id: "tmux".into(),
            name: "tmux".into(),
            description: "터미널 멀티플렉서".into(),
            emoji: "🖥️".into(),
            category: "dev".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install tmux".into()),
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

        // ===== video-frames =====
        // Note: Windows는 winget 필요하나 현재 brew만 지원, Windows 비활성화
        SkillDefinition {
            id: "video-frames".into(),
            name: "Video Frames".into(),
            description: "비디오 프레임 추출".into(),
            emoji: "🎬".into(),
            category: "media".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install ffmpeg".into()),
            binary_name: Some("ffmpeg".into()),
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

        // ===== voice-call =====
        SkillDefinition {
            id: "voice-call".into(),
            name: "Voice Call".into(),
            description: "Twilio/Telnyx 음성 통화".into(),
            emoji: "📞".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Builtin,
            install_command: None,
            binary_name: None,
            platform: PlatformSupport { windows: true, macos: true, linux: true },
            setup: SetupRequirement::Custom { description: "Twilio/Telnyx/Plivo 설정 필요".into() },
            disconnect: DisconnectConfig {
                logout_command: None,
                config_paths: vec![],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },

        // ===== wacli =====
        SkillDefinition {
            id: "wacli".into(),
            name: "WhatsApp CLI".into(),
            description: "WhatsApp 메시지 전송".into(),
            emoji: "💬".into(),
            category: "messaging".into(),
            install_method: InstallMethod::Brew,
            install_command: Some("brew install steipete/tap/wacli".into()),
            binary_name: Some("wacli".into()),
            platform: PlatformSupport { windows: false, macos: true, linux: true },
            setup: SetupRequirement::Login { command: "wacli auth".into() },
            disconnect: DisconnectConfig {
                logout_command: Some("wacli logout".into()),
                config_paths: vec!["~/.config/wacli/".into()],
                env_vars: vec![],
                mac_permissions: None,
            },
            hidden: false,
        },
    ]
});
