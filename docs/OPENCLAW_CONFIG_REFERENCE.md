# OpenClaw 설정 전체 레퍼런스

moldClaw에서 래핑 가능한 모든 OpenClaw 설정 목록

---

## 1. Models (모델)
> Config 경로: `models.*`, `auth.profiles.*`

| 항목 | 설명 | CLI |
|------|------|-----|
| Provider 선택 | anthropic, openai, google, groq 등 | `configure --section model` |
| API Key | 각 프로바이더 인증 키 | `configure --section model` |
| Default Model | 기본 사용 모델 | `configure --section model` |
| Auth Profiles | OAuth/API key 프로필 관리 | 수동 편집 |

---

## 2. Channels (메신저)
> Config 경로: `channels.*`

| 채널 | 설정 필드 | CLI |
|------|----------|-----|
| Discord | `token`, `dmPolicy`, `groupPolicy` | `channels add discord` |
| Telegram | `botToken`, `dmPolicy`, `groupPolicy` | `channels add telegram` |
| WhatsApp | `accounts.*.enabled`, `dmPolicy`, `allowFrom` | `channels login` (QR) |
| Slack | `botToken`, `appToken` | `channels add slack` |
| Signal | `number`, `captcha` | `channels add signal` |
| iMessage | macOS 전용 | 수동 설정 |
| Google Chat | `serviceAccountFile` | 수동 설정 |
| Mattermost | `url`, `botToken` | 수동 설정 |
| IRC | `server`, `nick`, `channels` | 수동 설정 |

---

## 3. Tools (도구)
> Config 경로: `tools.*`

### 3.1 Web Tools
| 도구 | Config 경로 | 환경변수 | 설명 |
|------|------------|---------|------|
| Web Search | `tools.web.search` | `BRAVE_API_KEY` | Brave/Perplexity/Grok 검색 |
| Web Fetch | `tools.web.fetch` | - | HTTP 페이지 가져오기 |
| Firecrawl | `tools.web.fetch.firecrawl` | `FIRECRAWL_API_KEY` | 고급 웹 스크래핑 |

### 3.2 Tool Profiles
| 프로필 | 설명 |
|--------|------|
| `minimal` | 최소 도구만 |
| `coding` | 코딩 관련 도구 |
| `messaging` | 메시징 도구 |
| `full` | 모든 도구 |

### 3.3 Exec Tool
| 설정 | 설명 |
|------|------|
| `host` | sandbox / gateway / node |
| `security` | deny / allowlist / full |
| `ask` | off / on-miss / always |
| `pathPrepend` | PATH 추가 디렉토리 |
| `safeBins` | 허용 목록 없이 실행 가능한 바이너리 |
| `timeoutSec` | 실행 제한 시간 |

### 3.4 Media Tools
| 설정 | 설명 |
|------|------|
| `media.image` | 이미지 이해 설정 |
| `media.audio` | 오디오 이해 설정 |
| `media.video` | 비디오 이해 설정 |
| `links` | 링크 프리뷰 설정 |

### 3.5 Memory Search
| 설정 | Config 경로 | 설명 |
|------|------------|------|
| Provider | `tools.memorySearch.provider` | openai/gemini/local/voyage |
| Local Model | `tools.memorySearch.local.modelPath` | 로컬 임베딩 모델 |
| Sources | `tools.memorySearch.sources` | memory/sessions |

---

## 4. Skills (스킬)
> Config 경로: `skills.*`

| 설정 | 설명 |
|------|------|
| `allowBundled` | 번들 스킬 허용 목록 |
| `load.extraDirs` | 추가 스킬 폴더 |
| `load.watch` | 변경 감지 활성화 |
| `entries.<skillId>` | 개별 스킬 설정 (enabled, apiKey, env) |

---

## 5. Environment Variables (환경변수)
> Config 경로: `env.vars.*`

### 5.1 AI Provider Keys
| 변수명 | 프로바이더 |
|--------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `OPENAI_API_KEY` | OpenAI (GPT) |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Google (Gemini) |
| `GROQ_API_KEY` | Groq |
| `OPENROUTER_API_KEY` | OpenRouter |
| `MISTRAL_API_KEY` | Mistral |
| `TOGETHER_API_KEY` | Together AI |
| `CEREBRAS_API_KEY` | Cerebras |
| `XAI_API_KEY` | xAI (Grok) |
| `DEEPGRAM_API_KEY` | Deepgram (음성) |
| `VOYAGE_API_KEY` | Voyage (임베딩) |
| `PERPLEXITY_API_KEY` | Perplexity |
| `OLLAMA_API_KEY` | Ollama (로컬) |
| `MINIMAX_API_KEY` | MiniMax |
| `MOONSHOT_API_KEY` | Moonshot |
| `KIMI_API_KEY` | Kimi |
| `QWEN_PORTAL_API_KEY` | Qwen |
| `QIANFAN_API_KEY` | Qianfan |
| `VENICE_API_KEY` | Venice AI |
| `CHUTES_API_KEY` | Chutes |
| `XIAOMI_API_KEY` | Xiaomi |

### 5.2 Tool Keys
| 변수명 | 용도 |
|--------|------|
| `BRAVE_API_KEY` | Brave Search |
| `FIRECRAWL_API_KEY` | Firecrawl 스크래핑 |
| `ELEVENLABS_API_KEY` / `XI_API_KEY` | ElevenLabs TTS |

### 5.3 Messenger Tokens
| 변수명 | 채널 |
|--------|------|
| `DISCORD_BOT_TOKEN` | Discord |
| `TELEGRAM_BOT_TOKEN` | Telegram |
| `SLACK_BOT_TOKEN` | Slack Bot |
| `SLACK_APP_TOKEN` | Slack App (Socket Mode) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE |
| `LINE_CHANNEL_SECRET` | LINE |

### 5.4 Gateway/Auth
| 변수명 | 용도 |
|--------|------|
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 인증 토큰 |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub 연동 |
| `COPILOT_GITHUB_TOKEN` | GitHub Copilot |

---

## 6. TTS (음성 합성)
> Config 경로: `audio.tts.*`

| 설정 | 옵션 | 설명 |
|------|------|------|
| `auto` | off/always/inbound/tagged | 자동 TTS 모드 |
| `provider` | elevenlabs/openai/edge | TTS 제공자 |
| `mode` | final/all | 적용 범위 |

### Provider별 설정
| Provider | 설정 |
|----------|------|
| ElevenLabs | apiKey, voiceId, modelId, voiceSettings |
| OpenAI | apiKey, model, voice |
| Edge | voice, lang, rate, pitch (무료) |

---

## 7. Browser (브라우저 제어)
> Config 경로: `browser.*`

| 설정 | 설명 |
|------|------|
| `enabled` | 브라우저 도구 활성화 |
| `cdpUrl` | Chrome DevTools Protocol URL |
| `headless` | 헤드리스 모드 |
| `executablePath` | Chrome 실행 경로 |
| `defaultProfile` | 기본 프로필 |
| `profiles` | 명명된 브라우저 프로필 |

---

## 8. Gateway (게이트웨이)
> Config 경로: `gateway.*`

| 설정 | 설명 |
|------|------|
| `port` | 포트 (기본: 18789) |
| `bind` | auto/lan/loopback/tailnet/custom |
| `auth.mode` | token/password |
| `auth.token` | 인증 토큰 |
| `tls.enabled` | TLS 활성화 |
| `controlUi.enabled` | 웹 UI 활성화 |
| `tailscale.mode` | off/serve/funnel |

---

## 9. Memory (메모리)
> Config 경로: `memory.*`

| 설정 | 설명 |
|------|------|
| `backend` | builtin/qmd |
| `citations` | auto/on/off |
| `qmd.*` | QMD 백엔드 상세 설정 |

---

## 10. Cron (스케줄러)
> Config 경로: `cron.*`

| 설정 | 설명 |
|------|------|
| `enabled` | 크론 활성화 |
| `maxConcurrentRuns` | 최대 동시 실행 |
| `sessionRetention` | 세션 보관 기간 (예: "24h") |

---

## 11. Hooks (웹훅)
> Config 경로: `hooks.*`

| 설정 | 설명 |
|------|------|
| `enabled` | 훅 활성화 |
| `path` | 훅 엔드포인트 경로 |
| `token` | 인증 토큰 |
| `mappings` | 훅 매핑 규칙 |
| `gmail` | Gmail 푸시 알림 설정 |

---

## 12. Plugins (플러그인)
> Config 경로: `plugins.*`

| 설정 | 설명 |
|------|------|
| `enabled` | 플러그인 활성화 |
| `allow` | 허용 플러그인 목록 |
| `deny` | 차단 플러그인 목록 |
| `entries.<id>` | 개별 플러그인 설정 |

---

## 13. Approvals (승인)
> Config 경로: `approvals.*`

| 설정 | 설명 |
|------|------|
| `exec.enabled` | 실행 승인 포워딩 |
| `exec.mode` | session/targets/both |
| `exec.targets` | 승인 요청 전달 대상 |

---

## 14. Agents (에이전트)
> Config 경로: `agents.*`

| 설정 | 설명 |
|------|------|
| `defaults.model` | 기본 모델 |
| `defaults.workspace` | 작업 공간 |
| `defaults.thinking` | 사고 레벨 |
| `defaults.systemPrompt` | 시스템 프롬프트 |
| `entries.<agentId>` | 개별 에이전트 설정 |

---

## 15. UI (사용자 인터페이스)
> Config 경로: `ui.*`

| 설정 | 설명 |
|------|------|
| `seamColor` | 강조 색상 (hex) |
| `assistant.name` | 어시스턴트 이름 |
| `assistant.avatar` | 어시스턴트 아바타 |

---

## 16. 기타 설정

### Update
| 설정 | 설명 |
|------|------|
| `update.channel` | stable/beta/dev |
| `update.checkOnStart` | 시작 시 업데이트 확인 |

### Logging
| 설정 | 설명 |
|------|------|
| `logging.level` | 로그 레벨 |
| `logging.file` | 로그 파일 경로 |

### Session
| 설정 | 설명 |
|------|------|
| `session.contextWindow` | 컨텍스트 윈도우 크기 |
| `session.reserveTokens` | 예약 토큰 |

---

## CLI 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `openclaw configure` | 대화형 설정 |
| `openclaw configure --section <name>` | 특정 섹션만 설정 |
| `openclaw channels add <channel>` | 채널 추가 |
| `openclaw channels login` | WhatsApp QR 인증 |
| `openclaw plugins enable <plugin>` | 플러그인 활성화 |
| `openclaw skills list` | 스킬 목록 |

### Configure Sections
- `workspace` - 작업 공간
- `model` - AI 모델
- `web` - 웹 검색/가져오기
- `gateway` - 게이트웨이
- `daemon` - 데몬 설정
- `channels` - 메신저 채널
- `skills` - 스킬
- `health` - 헬스체크

---

*Generated from OpenClaw source code analysis*
*Last updated: 2026-02-21*
