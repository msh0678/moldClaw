# 설정 패널 엔드포인트 QA 결과

> 검증일: 2026-02-25  
> 검증 범위: 7개 설정 탭, 22개 엔드포인트

---

## 탭 1: 🤖 AI 모델 (ModelSettings)

| 기능 | Frontend invoke | lib.rs | 실제 처리 (openclaw.rs) | Config 경로 |
|------|----------------|--------|------------------------|-------------|
| 저장 | `update_model_config` | `openclaw::update_model_config` | `add_model_to_config` (재사용) | `models.providers.{provider}.apiKey` |

---

## 탭 2: 💬 메신저 (MessengerSettings)

| 기능 | Frontend invoke | lib.rs | 실제 처리 | Config/파일 경로 |
|------|----------------|--------|----------|-----------------|
| 설정 저장 | `update_messenger_config` | `openclaw::update_messenger_config` | 채널별 분기 처리 | `channels.{type}.*` |
| 연결 해제 | `update_messenger_config` (token:'') | 위와 동일 | 삭제 모드 분기 | enabled=false 또는 섹션 삭제 |
| Slack App Token | `set_slack_app_token` | `openclaw::set_slack_app_token` | config 직접 설정 | `channels.slack.appToken` |
| Google Chat | `set_googlechat_service_account` | `openclaw::set_googlechat_service_account` | 파일 경로 검증 후 저장 | `channels.googlechat.serviceAccountPath` |
| Mattermost URL | `set_mattermost_url` | `openclaw::set_mattermost_url` | config 직접 설정 | `channels.mattermost.url` |
| WhatsApp 연결 | `login_whatsapp` | `openclaw::login_whatsapp` | 터미널에서 QR | `~/.openclaw/credentials/whatsapp/` |

---

## 탭 3: 🔧 도구 (ToolsSettings)

| 기능 | Frontend invoke | lib.rs | 실제 처리 | Config 경로 |
|------|----------------|--------|----------|-------------|
| API 키 저장 | `update_integrations_config` | `openclaw::update_integrations_config` | env.vars 머지 | `env.vars.{envVar}` |
| API 키 삭제 | `update_integrations_config` (빈값) | 위와 동일 | env.vars 키 삭제 | 키 삭제 |

---

## 탭 4: 🎯 스킬 (SkillsSettings)

### API 연동 (11개)
| 기능 | Frontend invoke | 실제 처리 | Config 경로 |
|------|----------------|----------|-------------|
| API 키 저장 | `update_integrations_config` | `openclaw::update_integrations_config` | `env.vars.{envVar}` |

### CLI 도구 (38개)
| 기능 | Frontend invoke | 실제 처리 (skills.rs) | 대상 |
|------|----------------|----------------------|------|
| 상태 조회 | `get_skills_status` | 바이너리 존재 확인 | 파일 시스템 |
| 정의 조회 | `get_skill_definitions` | `SKILL_DEFINITIONS` | static 배열 |
| Prerequisite | `get_prerequisites` | go/uv/brew/npm 체크 | 바이너리 |
| 설치 | `install_skill` | brew/go/npm/uv/winget 분기 | CLI |
| API 키 설정 | `configure_skill_api_key` | config env.vars 직접 쓰기 | `env.vars` |
| 로그인 터미널 | `open_skill_login_terminal` | AppleScript/cmd/gnome-terminal | 터미널 |
| 연결 해제 | `disconnect_skill` | logout 명령 + config 삭제 | CLI + config |

---

## 탭 5: 🔊 TTS (TTSSettings)

| 기능 | Frontend invoke | 실제 처리 | Config 경로 |
|------|----------------|----------|-------------|
| API 키 저장 | `update_integrations_config` | `openclaw::update_integrations_config` | `env.vars.{envVar}` |

---

## 탭 6: 📧 Gmail (GmailSettings)

| 기능 | Frontend invoke | lib.rs | 실제 처리 | 대상 |
|------|----------------|--------|----------|------|
| gog 설치 확인 | `check_gog_installed` | `openclaw::check_gog_installed` | 바이너리 체크 | which/where |
| 인증 상태 | `check_gog_auth` | `openclaw::check_gog_auth` | `gog auth list` | CLI |
| 연결 해제 | `disconnect_gmail` | `openclaw::disconnect_gmail` | `gog auth remove` | CLI |
| credentials 등록 | `register_gog_credentials` | `openclaw::register_gog_credentials` | `gog auth credentials` | CLI |

---

## 탭 7: 🌐 브라우저 (BrowserSettings)

| 기능 | Frontend invoke | lib.rs | 실제 처리 | 대상/Config |
|------|----------------|--------|----------|-------------|
| 설정 조회 | `get_browser_config` | `openclaw::get_browser_config` | config 읽기 | `browser.*` |
| 설치 | `install_browser_control` | `openclaw::install_browser_control` | `openclaw browser create-profile` | CLI |
| 저장 | `save_browser_config` | `openclaw::save_browser_config` | config 쓰기 | `browser.enabled=true` |
| 비활성화 | `disable_browser_config` | `openclaw::disable_browser_config` | config 쓰기 | `browser.enabled=false` |

---

## Config 파일 구조 요약

```json
{
  "models": {
    "providers": {
      "{provider}": { "apiKey": "..." }
    }
  },
  "channels": {
    "telegram": { "enabled": true, "botToken": "..." },
    "whatsapp": { /* 세션 기반 - enabled 없음 */ },
    "slack": { "botToken": "...", "appToken": "..." },
    "googlechat": { "serviceAccountPath": "..." },
    "mattermost": { "url": "...", "botToken": "..." }
  },
  "env": {
    "vars": {
      "BRAVE_API_KEY": "...",
      "ELEVENLABS_API_KEY": "...",
      "NOTION_API_KEY": "..."
    }
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "chrome"
  }
}
```

---

## QA 결과

| 탭 | invoke 개수 | 엔드포인트 검증 | 상태 |
|----|------------|---------------|------|
| AI 모델 | 1 | ✅ | 정상 |
| 메신저 | 5 | ✅ | 정상 |
| 도구 | 1 | ✅ | 정상 |
| 스킬 | 7 | ✅ | 정상 |
| TTS | 1 | ✅ | 정상 |
| Gmail | 4 | ✅ | 정상 |
| 브라우저 | 4 | ✅ | 정상 |

**총 22개 엔드포인트 검증 완료**

---

*문서 작성: 2026-02-25*
