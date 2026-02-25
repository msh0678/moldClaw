# 스킬 구현 검수 보고서

## 검수 대상
- `SKILL_TOOL_IMPLEMENTATION_GUIDE.md`
- `SKILL_SETUP_REQUIREMENTS.md` (45개 스킬)
- `SKILL_SETUP_MACOS_ONLY.md` (19개 macOS/brew 스킬)
- `skill_definitions.rs` (구현)

---

## ✅ 정상 항목

### 스킬 개수
- **문서**: 45개 (4개 hidden + 1개 중복 = 40개 visible)
- **구현**: 44개 (4개 hidden = 40개 visible)
- **상태**: ✅ 일치 (`ordercli`는 `food-order`와 동일하므로 중복 제거 정상)

### Hidden 스킬 (4개)
| 스킬 | 문서 | 구현 |
|------|------|------|
| canvas | 🚫 자동 | ✅ hidden: true |
| healthcheck | 🚫 자동 | ✅ hidden: true |
| skill-creator | 🚫 자동 | ✅ hidden: true |
| weather | 🚫 자동 | ✅ hidden: true |

### 연결 해제 설정 정상 (샘플 확인)
| 스킬 | logout_command | config_paths | env_vars |
|------|----------------|--------------|----------|
| gog | ✅ `gog auth remove-all` | ✅ `~/.config/gog/` | ✅ 없음 |
| wacli | ✅ `wacli logout` | ✅ `~/.config/wacli/` | ✅ 없음 |
| sag | ✅ 없음 | ✅ 없음 | ✅ `ELEVENLABS_API_KEY` |
| 1password | ✅ `op signout --all` | ✅ 없음 | ✅ 없음 |
| spotify-player | ✅ `spogo auth logout` | ✅ `~/.config/spogo/` | ✅ 없음 |

---

## ⚠️ 수정 필요 항목

### 1. Windows 플랫폼 + Brew 설치 불일치

| 스킬 | 문서 Windows 설치 | 구현 | 문제 |
|------|------------------|------|------|
| `1password` | `winget install AgileBits.1Password.CLI` | `platform.windows=true` + `Brew` | ❌ Brew는 Windows에서 작동 안 함 |
| `video-frames` | `winget install Gyan.FFmpeg` | `platform.windows=true` + `Brew` | ❌ Brew는 Windows에서 작동 안 함 |

**수정 방안**:
```rust
// Option A: Windows 지원 제거
platform: PlatformSupport { windows: false, macos: true, linux: true },

// Option B: 플랫폼별 설치 명령어 추가 (구조 변경 필요)
install_commands: {
    "macos": "brew install ...",
    "linux": "brew install ...",
    "windows": "winget install ...",
}
```

### 2. summarize 환경변수 누락

**문서**:
```
삭제할 것: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, FIRECRAWL_API_KEY, APIFY_API_TOKEN
```

**구현**:
```rust
env_vars: vec!["OPENAI_API_KEY".into(), "ANTHROPIC_API_KEY".into(), "GEMINI_API_KEY".into()],
// ❌ FIRECRAWL_API_KEY, APIFY_API_TOKEN 누락
```

### 3. gifgrep setup 모호성

**문서**: `🔑 API 키 (선택)` - GIPHY, TENOR 둘 다 선택적
**구현**: `SetupRequirement::ApiKey { vars: vec!["GIPHY_API_KEY".into()] }` - 필수처럼 보임

**수정 방안**: 선택적임을 명시하거나 `SetupRequirement::None`으로 변경

---

## 📋 세부 검수 결과

### 플랫폼 지원 정확성

| 스킬 | 문서 플랫폼 | 구현 플랫폼 | 상태 |
|------|------------|------------|------|
| apple-notes | macOS only | macOS only | ✅ |
| apple-reminders | macOS only | macOS only | ✅ |
| bear-notes | macOS only | macOS only | ✅ |
| imsg | macOS only | macOS only | ✅ |
| model-usage | macOS only | macOS only | ✅ |
| peekaboo | macOS only | macOS only | ✅ |
| things-mac | macOS only | macOS only | ✅ |
| camsnap | macOS, Linux | macOS, Linux | ✅ |
| gog | macOS, Linux | macOS, Linux | ✅ |
| himalaya | macOS, Linux | macOS, Linux | ✅ |
| tmux | macOS, Linux | macOS, Linux | ✅ |
| blogwatcher | All | All | ✅ |
| blucli | All | All | ✅ |
| gifgrep | All | All | ✅ |
| food-order | All | All | ✅ |

### SetupRequirement 정확성

| 스킬 | 문서 | 구현 | 상태 |
|------|------|------|------|
| sag | 🔑 API 키 | ApiKey(ELEVENLABS) | ✅ |
| goplaces | 🔑 API 키 | ApiKey(GOOGLE_PLACES) | ✅ |
| gog | 🔐 로그인 | Login | ✅ |
| wacli | 🔐 로그인 | Login | ✅ |
| apple-notes | 🍎 권한 | MacPermission | ✅ |
| imsg | 🍎 권한 2개 | MacPermission(FDA+Auto) | ✅ |
| peekaboo | 🍎 권한 2개 | MacPermission(Screen+A11y) | ✅ |
| camsnap | ⚙️ Config | Config | ✅ |
| himalaya | ⚙️ Config | Config | ✅ |
| blucli | 🔌 하드웨어 | Hardware | ✅ |
| sonoscli | 🔌 하드웨어 | Hardware | ✅ |
| blogwatcher | ✅ 없음 | None | ✅ |
| tmux | ✅ 없음 | None | ✅ |

### 설치 명령어 정확성

| 스킬 | 문서 | 구현 | 상태 |
|------|------|------|------|
| sag | `brew install steipete/tap/sag` | ✅ 일치 | ✅ |
| gog | `brew install steipete/tap/gogcli` | ✅ 일치 | ✅ |
| wacli | `brew install steipete/tap/wacli` | ✅ 일치 | ✅ |
| blogwatcher | `go install .../blogwatcher@latest` | ✅ 일치 | ✅ |
| clawhub | `npm install -g clawhub` | ✅ 일치 | ✅ |
| local-places | `uv tool install local-places` | ✅ 일치 | ✅ |

---

## 🔧 수정 코드

### 1. summarize env_vars 수정

```rust
// skill_definitions.rs - summarize
disconnect: DisconnectConfig {
    logout_command: None,
    config_paths: vec!["~/.summarize/".into()],
    env_vars: vec![
        "OPENAI_API_KEY".into(), 
        "ANTHROPIC_API_KEY".into(), 
        "GEMINI_API_KEY".into(),
        "FIRECRAWL_API_KEY".into(),    // 추가
        "APIFY_API_TOKEN".into(),      // 추가
    ],
    mac_permissions: None,
},
```

### 2. 1password / video-frames Windows 지원 제거 (간단한 해결책)

```rust
// 1password
platform: PlatformSupport { windows: false, macos: true, linux: true },

// video-frames  
platform: PlatformSupport { windows: false, macos: true, linux: true },
```

### 3. gifgrep setup 수정 (선택적임을 반영)

```rust
// gifgrep - API 키가 선택적이므로 None으로 변경
setup: SetupRequirement::None,
// disconnect에서 env_vars는 유지 (연결 해제 시 정리용)
```

---

## 결론

| 항목 | 상태 |
|------|------|
| 스킬 개수 | ✅ 정상 (44개) |
| Hidden 스킬 | ✅ 정상 (4개) |
| 플랫폼 지원 | ⚠️ 2개 수정 필요 |
| 연결 해제 설정 | ⚠️ 1개 수정 필요 |
| 설치 명령어 | ✅ 정상 |
| SetupRequirement | ⚠️ 1개 수정 필요 |

**총 수정 필요: 4건 (경미)**
