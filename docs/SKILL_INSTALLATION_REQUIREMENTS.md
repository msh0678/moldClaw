# moldClaw Skill Installation Requirements

49개 스킬의 설치 요구사항, API 키, 특수 설정, 플랫폼별 고려사항 정리.

---

## 요약 테이블

| # | 스킬 | 설치 | API 키 | OAuth/인증 | 특수 설정 | 권한 |
|---|------|------|--------|-----------|----------|------|
| 1 | 1password | brew/winget | - | Desktop app 연동 | tmux 필수 | - |
| 2 | apple-notes | brew | - | - | - | Automation |
| 3 | apple-reminders | brew | - | - | - | Reminders |
| 4 | bear-notes | go | - | Bear API Token | ~/.config/grizzly/token | - |
| 5 | blogwatcher | go | - | - | - | - |
| 6 | blucli | go | - | - | BluOS 스피커 필요 | - |
| 7 | bluebubbles | 채널설정 | - | BB 서버 필요 | channels.bluebubbles | - |
| 8 | camsnap | brew | - | 카메라 인증 | ~/.config/camsnap/config.yaml | - |
| 9 | canvas | 없음 | - | - | canvasHost 설정 | - |
| 10 | clawhub | npm | - | clawhub login | - | - |
| 11 | coding-agent | 별도 | - | 각 에이전트별 | PTY 모드 필수 | - |
| 12 | discord | 채널설정 | - | Bot Token | channels.discord | - |
| 13 | eightctl | go | - | Email/Password | ~/.config/eightctl/config.yaml | - |
| 14 | food-order | go | - | Foodora 로그인 | Chrome 세션 권장 | - |
| 15 | gemini | brew | - | Google 로그인 | 첫 실행 시 인터랙티브 | - |
| 16 | gifgrep | brew/go | GIPHY_API_KEY (선택) | - | TENOR_API_KEY (선택) | - |
| 17 | gog | brew | - | **Google OAuth** | client_secret.json 필요 | - |
| 18 | goplaces | brew | **GOOGLE_PLACES_API_KEY** | - | - | - |
| 19 | healthcheck | 없음 | - | - | - | sudo 가능성 |
| 20 | himalaya | brew | - | IMAP/SMTP 인증 | ~/.config/himalaya/config.toml | - |
| 21 | imsg | brew | - | - | Messages.app 로그인 | FDA + Automation |
| 22 | local-places | uv | **GOOGLE_PLACES_API_KEY** | - | 로컬 서버 실행 | - |
| 23 | mcporter | npm | - | MCP OAuth (선택) | - | - |
| 24 | model-usage | brew | - | - | CodexBar 앱 설치 | - |
| 25 | nano-banana-pro | uv | **GEMINI_API_KEY** | - | - | - |
| 26 | nano-pdf | uv | - | - | - | - |
| 27 | obsidian | brew | - | - | Obsidian 앱 설치 | - |
| 28 | openai-image-gen | python | **OPENAI_API_KEY** | - | - | - |
| 29 | openai-whisper | brew | - | - | 로컬 실행 | - |
| 30 | openai-whisper-api | curl | **OPENAI_API_KEY** | - | - | - |
| 31 | openhue | brew | - | Hue Bridge 페어링 | 버튼 누름 필요 | - |
| 32 | oracle | npm | OPENAI_API_KEY (선택) | 브라우저 자동화 | - | - |
| 33 | ordercli | go/brew | - | Foodora 로그인 | - | - |
| 34 | peekaboo | brew | - | - | - | Screen + Accessibility |
| 35 | sag | brew | **ELEVENLABS_API_KEY** | - | - | - |
| 36 | session-logs | winget | - | - | jq + rg 필요 | - |
| 37 | sherpa-onnx-tts | download | - | - | Runtime + Model 다운로드 | - |
| 38 | skill-creator | 없음 | - | - | - | - |
| 39 | slack | 채널설정 | - | Bot Token | channels.slack | - |
| 40 | songsee | brew | - | - | - | - |
| 41 | sonoscli | go | SPOTIFY_CLIENT_ID (선택) | - | Sonos 스피커 필요 | - |
| 42 | spotify-player | brew | - | 쿠키 import | ~/.config/spotify-player/ | - |
| 43 | summarize | brew | LLM API 키 (하나 이상) | - | - | - |
| 44 | things-mac | go | - | THINGS_AUTH_TOKEN (쓰기용) | - | Full Disk Access |
| 45 | tmux | brew/apt | - | - | - | - |
| 46 | video-frames | brew/winget | - | - | ffmpeg 필요 | - |
| 47 | voice-call | 플러그인설정 | - | Twilio/Telnyx/Plivo | plugins.entries.voice-call | - |
| 48 | wacli | brew/go | - | **QR 코드 로그인** | - | - |
| 49 | weather | curl | - | - | - | - |

---

## 상세 설치 가이드

### 🔑 API 키 필수 (7개)

#### 1. `goplaces` - Google Places API
```bash
# 필수 환경변수
GOOGLE_PLACES_API_KEY=your-key

# Google Cloud Console에서 발급:
# 1. https://console.cloud.google.com/
# 2. APIs & Services → Enable "Places API (New)"
# 3. Credentials → Create API Key
# 4. 제한 설정: Places API만 허용 권장

# moldClaw 설정
env.vars.GOOGLE_PLACES_API_KEY = "your-key"
```

#### 2. `local-places` - Google Places API (로컬 프록시)
```bash
# goplaces와 동일한 키 사용 가능
GOOGLE_PLACES_API_KEY=your-key

# 추가로 로컬 서버 실행 필요
cd ~/.openclaw/skills/local-places
uv venv && uv pip install -e ".[dev]"
uv run uvicorn local_places.main:app --host 127.0.0.1 --port 8000
```

#### 3. `nano-banana-pro` - Gemini API
```bash
# 필수 환경변수
GEMINI_API_KEY=your-key

# Google AI Studio에서 발급:
# https://makersuite.google.com/app/apikey

# moldClaw 설정
env.vars.GEMINI_API_KEY = "your-key"
```

#### 4. `openai-image-gen` - OpenAI API
```bash
# 필수 환경변수
OPENAI_API_KEY=sk-...

# https://platform.openai.com/api-keys

# moldClaw 설정
env.vars.OPENAI_API_KEY = "sk-..."
```

#### 5. `openai-whisper-api` - OpenAI API
```bash
# openai-image-gen과 동일한 키 사용
OPENAI_API_KEY=sk-...
```

#### 6. `sag` - ElevenLabs API
```bash
# 필수 환경변수
ELEVENLABS_API_KEY=your-key

# https://elevenlabs.io/ → Profile → API Keys

# moldClaw 설정
env.vars.ELEVENLABS_API_KEY = "your-key"
```

#### 7. `summarize` - LLM API (하나 이상 필요)
```bash
# 다음 중 하나 이상:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=your-key
XAI_API_KEY=your-key

# 선택적 (YouTube/차단 사이트용):
APIFY_API_TOKEN=apify_...
FIRECRAWL_API_KEY=fc-...

# 기본 모델: google/gemini-3-flash-preview
```

---

### 🔐 OAuth / 특수 인증 필요 (10개)

#### 1. `1password` - 데스크탑 앱 연동
```bash
# 설치
brew install 1password-cli  # macOS
winget install AgileBits.1Password.CLI  # Windows

# 중요: tmux 세션에서 실행 필수!
# 1Password 데스크탑 앱과 연동 필요
op signin --account my.1password.com

# 첫 실행 시 데스크탑 앱에서 승인 팝업 표시됨
```

#### 2. `bear-notes` - Bear API Token
```bash
# macOS 전용, Bear 앱 필요
go install github.com/tylerwince/grizzly/cmd/grizzly@latest

# Bear 토큰 발급:
# Bear 앱 → Help → API Token → Copy Token
echo "YOUR_TOKEN" > ~/.config/grizzly/token
```

#### 3. `eightctl` - Eight Sleep 인증
```bash
go install github.com/steipete/eightctl/cmd/eightctl@latest

# 방법 1: 환경변수
EIGHTCTL_EMAIL=you@example.com
EIGHTCTL_PASSWORD=your-password

# 방법 2: config 파일
# ~/.config/eightctl/config.yaml
email: you@example.com
password: your-password
```

#### 4. `food-order` / `ordercli` - Foodora 로그인
```bash
go install github.com/steipete/ordercli/cmd/ordercli@latest

# 방법 1: 비밀번호 로그인
ordercli foodora config set --country AT
echo "password" | ordercli foodora login --email you@example.com --password-stdin

# 방법 2: Chrome 세션 (권장, 2FA 지원)
ordercli foodora session chrome --url https://www.foodora.at/ --profile "Default"
```

#### 5. `gog` - Google OAuth (복잡!)
```bash
brew install steipete/tap/gogcli

# 1. Google Cloud Console에서 OAuth 자격 증명 생성
#    - APIs & Services → Credentials → OAuth client ID
#    - Desktop app 선택
#    - client_secret.json 다운로드

# 2. 자격 증명 등록
gog auth credentials /path/to/client_secret.json

# 3. 계정 추가 (브라우저 인증 팝업)
gog auth add you@gmail.com --services gmail,calendar,drive,contacts,docs,sheets

# 4. 확인
gog auth list
```

#### 6. `himalaya` - IMAP/SMTP 설정
```bash
brew install himalaya

# 대화형 설정
himalaya account configure

# 또는 수동 설정: ~/.config/himalaya/config.toml
[accounts.personal]
email = "you@example.com"
display-name = "Your Name"

backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.auth.type = "password"
backend.auth.cmd = "pass show email/imap"  # 또는 keyring 사용

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
```

#### 7. `spotify-player` - Spotify 쿠키
```bash
brew install steipete/tap/spogo

# Chrome에서 쿠키 가져오기 (Spotify Premium 필요)
spogo auth import --browser chrome

# 또는 spotify_player 사용
brew install spotify_player
# ~/.config/spotify-player/app.toml 에서 client_id 설정
```

#### 8. `things-mac` - Things Auth Token (쓰기 전용)
```bash
# macOS 전용
GOBIN=/opt/homebrew/bin go install github.com/ossianhempel/things3-cli/cmd/things@latest

# 읽기: 토큰 불필요 (단, Full Disk Access 필요)
things inbox --limit 50

# 쓰기: Things 앱에서 토큰 발급
# Things → Settings → General → Enable Things URLs → Copy Auth Token
export THINGS_AUTH_TOKEN=your-token
things update --id <UUID> --auth-token $THINGS_AUTH_TOKEN "New title"
```

#### 9. `wacli` - WhatsApp QR 로그인
```bash
brew install steipete/tap/wacli  # macOS
# 또는
go install github.com/steipete/wacli/cmd/wacli@latest  # Windows/Linux

# QR 코드 로그인 (휴대폰으로 스캔)
wacli auth

# 동기화 시작
wacli sync --follow
```

#### 10. `clawhub` - ClawHub 로그인
```bash
npm install -g clawhub

# 퍼블리시용 로그인
clawhub login
clawhub whoami
```

---

### ⚙️ 특수 설정/하드웨어 필요 (10개)

#### 1. `bluebubbles` - BlueBubbles 서버 필요
```yaml
# OpenClaw config (channels.bluebubbles)
channels:
  bluebubbles:
    serverUrl: "http://localhost:1234"
    password: "your-bb-password"
    webhookPath: "/webhook/bluebubbles"

# BlueBubbles 서버는 macOS에서 별도 설치 필요
# https://bluebubbles.app/
```

#### 2. `camsnap` - 카메라 설정
```bash
brew install steipete/tap/camsnap

# 카메라 추가
camsnap add --name kitchen --host 192.168.0.10 --user admin --pass password

# 설정 파일: ~/.config/camsnap/config.yaml
# ffmpeg 필요 (PATH에 있어야 함)
```

#### 3. `openhue` - Hue Bridge 페어링
```bash
brew install openhue/cli/openhue-cli

# 1. Bridge 검색
openhue discover

# 2. 페어링 (Bridge 버튼 누르기 필요!)
openhue setup
# → "Press the link button on your Hue Bridge" 메시지 표시
# → 30초 내에 Bridge 물리 버튼 누르기
```

#### 4. `sonoscli` - Sonos 스피커 필요
```bash
go install github.com/steipete/sonoscli/cmd/sonos@latest

# 같은 네트워크에 Sonos 스피커가 있어야 함
sonos discover
sonos status --name "Kitchen"
```

#### 5. `blucli` - BluOS 스피커 필요
```bash
go install github.com/steipete/blucli/cmd/blu@latest

# 같은 네트워크에 Bluesound/NAD 스피커가 있어야 함
blu discover
```

#### 6. `sherpa-onnx-tts` - 런타임 + 모델 다운로드
```bash
# macOS
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-osx-universal2-shared.tar.bz2 | tar -xj -C ~/.openclaw/tools/sherpa-onnx-tts/runtime

# Windows
# https://github.com/k2-fsa/sherpa-onnx/releases 에서 Windows 버전 다운로드

# 모델 다운로드 (영어 예시)
# https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models

# 환경변수 설정
SHERPA_ONNX_RUNTIME_DIR=~/.openclaw/tools/sherpa-onnx-tts/runtime
SHERPA_ONNX_MODEL_DIR=~/.openclaw/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high
```

#### 7. `voice-call` - 통화 서비스 설정
```yaml
# OpenClaw config (plugins.entries.voice-call)
plugins:
  entries:
    voice-call:
      enabled: true
      config:
        provider: "twilio"  # 또는 telnyx, plivo, mock
        fromNumber: "+1234567890"
        twilio:
          accountSid: "AC..."
          authToken: "..."
```

#### 8. `discord` - Bot Token 필요
```yaml
# OpenClaw config (channels.discord)
channels:
  discord:
    botToken: "your-bot-token"
    # https://discord.com/developers/applications 에서 Bot 생성
```

#### 9. `slack` - Bot Token 필요
```yaml
# OpenClaw config (channels.slack)
channels:
  slack:
    botToken: "xoxb-..."
    appToken: "xapp-..."  # Socket Mode용
    # https://api.slack.com/apps 에서 App 생성
```

#### 10. `coding-agent` - PTY 모드 필수
```bash
# claude, codex, opencode, pi 중 하나 설치

# 반드시 pty:true 로 실행!
# moldClaw에서는 Tauri가 PTY 지원해야 함
exec pty:true command:"codex exec 'Your prompt'"
```

---

### 🍎 macOS 권한 필요 (5개)

#### 1. `apple-notes` - Automation 권한
```
System Settings → Privacy & Security → Automation
→ Terminal (또는 OpenClaw) → Notes.app ✓
```

#### 2. `apple-reminders` - Reminders 권한
```
System Settings → Privacy & Security → Reminders
→ Terminal (또는 OpenClaw) ✓

# 또는 CLI에서:
remindctl authorize
```

#### 3. `imsg` - Full Disk Access + Automation
```
# 1. Full Disk Access (Messages.app DB 읽기용)
System Settings → Privacy & Security → Full Disk Access
→ Terminal (또는 OpenClaw) ✓

# 2. Automation (메시지 전송용)
System Settings → Privacy & Security → Automation
→ Terminal → Messages.app ✓
```

#### 4. `peekaboo` - Screen Recording + Accessibility
```
# 1. Screen Recording
System Settings → Privacy & Security → Screen Recording
→ Terminal (또는 OpenClaw) ✓

# 2. Accessibility
System Settings → Privacy & Security → Accessibility
→ Terminal (또는 OpenClaw) ✓

# 권한 확인
peekaboo permissions
```

#### 5. `things-mac` - Full Disk Access
```
# Things DB 읽기용
System Settings → Privacy & Security → Full Disk Access
→ Terminal (또는 OpenClaw) ✓
```

---

### ✅ 설정 없이 바로 사용 가능 (17개)

| 스킬 | 설치 방법 | 비고 |
|------|----------|------|
| blogwatcher | `go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest` | - |
| canvas | 없음 | OpenClaw 내장 |
| healthcheck | 없음 | OpenClaw 내장 |
| mcporter | `npm install -g mcporter` | MCP 서버 호출 |
| nano-pdf | `uv tool install nano-pdf` | - |
| obsidian | `brew install yakitrak/yakitrak/obsidian-cli` | Obsidian 앱 설치 필요 |
| openai-whisper | `brew install openai-whisper` | 로컬 실행 (느림) |
| oracle | `npm install -g @steipete/oracle` | 브라우저 자동화 |
| session-logs | jq + rg 설치 | `winget install jqlang.jq BurntSushi.ripgrep.MSVC` |
| skill-creator | 없음 | OpenClaw 내장 |
| songsee | `brew install steipete/tap/songsee` | - |
| tmux | `brew install tmux` 또는 `apt install tmux` | - |
| video-frames | `brew install ffmpeg` 또는 `winget install Gyan.FFmpeg` | - |
| weather | curl (내장) | API 키 불필요 |
| gifgrep | `go install github.com/steipete/gifgrep/cmd/gifgrep@latest` | API 키 선택 |
| gemini | `brew install gemini-cli` | 첫 실행 시 로그인 |
| model-usage | `brew install --cask steipete/tap/codexbar` | macOS 전용 |

---

## moldClaw UI 구현 가이드

### 스킬 상태 표시
```typescript
type SkillSetupStatus = 
  | 'ready'           // 바로 사용 가능
  | 'needs_install'   // 바이너리 설치 필요
  | 'needs_api_key'   // API 키 입력 필요
  | 'needs_auth'      // OAuth/로그인 필요
  | 'needs_config'    // 설정 파일 작성 필요
  | 'needs_hardware'  // 하드웨어/서비스 필요
  | 'needs_permission'// macOS 권한 필요
  | 'unavailable';    // 플랫폼 미지원

interface SkillRequirement {
  type: 'api_key' | 'oauth' | 'config' | 'hardware' | 'permission';
  key?: string;           // API 키 이름
  configPath?: string;    // 설정 파일 경로
  description: string;    // UI 설명
  setupUrl?: string;      // 도움말 URL
}
```

### 설정 플로우
```
[스킬 카드 클릭]
    ↓
[상태 체크]
    ├── unavailable → "macOS 전용입니다" (비활성)
    ├── needs_install → [설치 버튼] → 설치 스크립트 실행
    ├── needs_api_key → [API 키 입력 모달]
    ├── needs_auth → [인증 가이드 표시] → 외부 브라우저/앱
    ├── needs_config → [설정 위저드]
    ├── needs_hardware → "Hue Bridge 필요" (안내)
    ├── needs_permission → [권한 요청 버튼] (macOS)
    └── ready → [활성화 토글]
```

### 카테고리별 정리

```typescript
const SKILL_CATEGORIES = {
  productivity: ['1password', 'apple-notes', 'apple-reminders', 'bear-notes', 
                 'obsidian', 'things-mac', 'himalaya'],
  communication: ['discord', 'slack', 'bluebubbles', 'imsg', 'wacli', 'voice-call'],
  media: ['spotify-player', 'songsee', 'gifgrep', 'video-frames', 'camsnap'],
  smart_home: ['openhue', 'sonoscli', 'blucli', 'eightctl'],
  ai: ['sag', 'sherpa-onnx-tts', 'nano-banana-pro', 'openai-image-gen', 
       'openai-whisper', 'openai-whisper-api', 'summarize', 'gemini', 'oracle'],
  development: ['coding-agent', 'mcporter', 'clawhub', 'skill-creator', 
                'session-logs', 'tmux', 'nano-pdf'],
  utility: ['weather', 'goplaces', 'local-places', 'blogwatcher', 'food-order',
            'ordercli', 'gog', 'healthcheck', 'canvas', 'model-usage', 'peekaboo']
};
```
