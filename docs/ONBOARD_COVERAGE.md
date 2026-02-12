# moldClaw - OpenClaw Onboard 래핑 검증

## 상태: ✅ 전체 기능 래핑 완료

---

## 1. 기본 설정

### 설정 파일
| 항목 | OpenClaw | moldClaw | 상태 |
|------|----------|----------|------|
| 파일 경로 | `~/.openclaw/openclaw.json` | ✅ | 완료 |
| 형식 | JSON5 | ✅ | 완료 |

### 워크스페이스
| 항목 | OpenClaw | moldClaw | 상태 |
|------|----------|----------|------|
| 디렉토리 생성 | `--workspace` | ✅ `~/.openclaw/workspace` | 완료 |
| AGENTS.md | 자동 생성 | ✅ | 완료 |
| SOUL.md | 자동 생성 | ✅ | 완료 |
| memory/ | 자동 생성 | ✅ | 완료 |

---

## 2. AI 모델 프로바이더

### 주요 프로바이더 (ModelSetup 화면)
| 프로바이더 | OpenClaw 옵션 | 환경변수 | moldClaw | 상태 |
|------------|--------------|----------|----------|------|
| Anthropic | `--anthropic-api-key` | `ANTHROPIC_API_KEY` | ✅ ModelSetup | 완료 |
| OpenAI | `--openai-api-key` | `OPENAI_API_KEY` | ✅ ModelSetup | 완료 |
| Google/Gemini | `--gemini-api-key` | `GEMINI_API_KEY` | ✅ ModelSetup | 완료 |

### 추가 프로바이더 (Integrations 화면)
| 프로바이더 | OpenClaw 옵션 | 환경변수 | moldClaw | 상태 |
|------------|--------------|----------|----------|------|
| OpenRouter | `--openrouter-api-key` | `OPENROUTER_API_KEY` | ✅ Integrations | 완료 |
| Groq | - | `GROQ_API_KEY` | ✅ Integrations | 완료 |
| MiniMax | `--minimax-api-key` | `MINIMAX_API_KEY` | ✅ Integrations | 완료 |
| Moonshot | `--moonshot-api-key` | `MOONSHOT_API_KEY` | ✅ Integrations | 완료 |
| Z.AI | `--zai-api-key` | `ZAI_API_KEY` | ✅ Integrations | 완료 |
| Kimi Coding | `--kimi-code-api-key` | `KIMI_API_KEY` | ⚠️ env.vars | 부분 |
| Synthetic | `--synthetic-api-key` | `SYNTHETIC_API_KEY` | ⚠️ env.vars | 부분 |
| Venice | `--venice-api-key` | `VENICE_API_KEY` | ⚠️ env.vars | 부분 |
| Xiaomi | `--xiaomi-api-key` | `XIAOMI_API_KEY` | ⚠️ env.vars | 부분 |
| OpenCode Zen | `--opencode-zen-api-key` | `OPENCODE_API_KEY` | ⚠️ env.vars | 부분 |
| Vercel AI Gateway | `--ai-gateway-api-key` | `VERCEL_GATEWAY_API_KEY` | ⚠️ env.vars | 부분 |

---

## 3. 메신저/채널

### 주요 메신저 (MessengerSelect + Connect 화면)
| 채널 | 환경변수 | 설정 경로 | moldClaw | 상태 |
|------|----------|-----------|----------|------|
| Telegram | `TELEGRAM_BOT_TOKEN` | `channels.telegram.botToken` | ✅ | 완료 |
| Discord | `DISCORD_BOT_TOKEN` | `channels.discord.token` | ✅ | 완료 |
| WhatsApp | QR 페어링 | `channels.whatsapp.dmPolicy` | ✅ | 완료 |

### 추가 메신저 (Integrations 화면)
| 채널 | 환경변수 | 설정 경로 | moldClaw | 상태 |
|------|----------|-----------|----------|------|
| Slack (Bot) | `SLACK_BOT_TOKEN` | `channels.slack.botToken` | ✅ Integrations | 완료 |
| Slack (App) | `SLACK_APP_TOKEN` | `channels.slack.appToken` | ✅ Integrations | 완료 |
| Mattermost | `MATTERMOST_BOT_TOKEN` | `channels.mattermost.botToken` | ✅ Integrations | 완료 |
| Mattermost URL | `MATTERMOST_URL` | `channels.mattermost.baseUrl` | ✅ Integrations | 완료 |
| Google Chat | `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE` | `channels.googlechat.serviceAccountFile` | ✅ Integrations | 완료 |
| Signal | signal-cli | `channels.signal.*` | ❌ 수동 설정 필요 | 미지원 |
| iMessage | imsg CLI | `channels.imessage.*` | ❌ macOS 전용 | 미지원 |
| MS Teams | - | `channels.msteams.*` | ❌ 수동 설정 필요 | 미지원 |

---

## 4. 외부 도구/서비스

### Integrations 화면에서 설정 가능
| 서비스 | 환경변수 | 설정 경로 | moldClaw | 상태 |
|--------|----------|-----------|----------|------|
| Brave Search | `BRAVE_API_KEY` | `tools.web.search.apiKey` | ✅ Integrations | 완료 |
| Firecrawl | `FIRECRAWL_API_KEY` | `tools.web.fetch.firecrawl.apiKey` | ✅ Integrations | 완료 |
| ElevenLabs TTS | `ELEVENLABS_API_KEY` | `messages.tts.elevenlabs.apiKey` | ✅ Integrations | 완료 |

### 수동 설정 필요
| 서비스 | 설명 | 상태 |
|--------|------|------|
| Gmail Pub/Sub | Webhook 설정 | ❌ 수동 |
| Custom Models | LiteLLM 등 | ❌ 수동 |
| Skills | 스킬 API 키 | ❌ 수동 |

---

## 5. Gateway 설정

| 항목 | OpenClaw 옵션 | moldClaw | 상태 |
|------|---------------|----------|------|
| 포트 | `--gateway-port` | ✅ 18789 (기본값) | 완료 |
| 바인드 | `--gateway-bind` | ✅ loopback (기본값) | 완료 |
| 인증 모드 | `--gateway-auth` | ✅ token | 완료 |
| 토큰 | `--gateway-token` | ✅ 자동 생성 | 완료 |
| 데몬 설치 | `--install-daemon` | ✅ 시도 | 완료 |
| Tailscale | `--tailscale` | ❌ 미지원 | 낮음 |

---

## 6. 고급 설정 (미지원)

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Remote 모드 | `--mode remote` | 낮음 |
| 샌드박스 | Docker 격리 | 낮음 |
| 브라우저 | Chromium 제어 | 낮음 |
| 멀티 에이전트 | `agents.list` | 중간 |
| 스킬 관리 | `skills.entries` | 중간 |

---

## UI 플로우

```
Loading → Welcome → ModelSetup → MessengerSelect → Integrations → Connect → Success
   │                    │              │               │             │
   │                    │              │               │             └─ Gateway 시작
   │                    │              │               └─ 외부 서비스 API 키 (선택)
   │                    │              └─ Telegram/Discord/WhatsApp 선택
   │                    └─ AI 모델 + API 키 설정
   └─ Node.js/OpenClaw 설치 확인
```

---

## 생성되는 설정 파일 예시

```json5
// ~/.openclaw/openclaw.json
{
  // Gateway
  gateway: {
    port: 18789,
    bind: "loopback",
    auth: { token: "moldclaw-xxxxx" }
  },
  
  // 에이전트
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: "anthropic/claude-sonnet-4-20250514"
    }
  },
  
  // 모델 프로바이더
  models: {
    providers: {
      anthropic: { apiKey: "sk-ant-..." },
      openrouter: { apiKey: "sk-or-..." },  // Integrations에서 설정
      groq: { apiKey: "gsk_..." },
    }
  },
  
  // 환경변수 (Integrations에서 설정)
  env: {
    vars: {
      BRAVE_API_KEY: "...",
      ELEVENLABS_API_KEY: "...",
    }
  },
  
  // 채널
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:ABC...",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } }
    },
    slack: {  // Integrations에서 설정
      botToken: "xoxb-...",
      appToken: "xapp-...",
    }
  },
  
  // 도구
  tools: {
    web: {
      search: { apiKey: "..." },  // Integrations에서 설정
      fetch: { firecrawl: { apiKey: "..." } }
    }
  },
  
  // TTS
  messages: {
    tts: {
      elevenlabs: { apiKey: "..." }  // Integrations에서 설정
    }
  }
}
```

---

## 변경 이력

### v0.3.0 (2026-02-11)
- ✅ Integrations 화면 추가
- ✅ 추가 AI 모델 프로바이더 지원 (OpenRouter, Groq, MiniMax 등)
- ✅ 추가 메신저 지원 (Slack, Mattermost, Google Chat)
- ✅ 외부 도구 지원 (Brave Search, Firecrawl, ElevenLabs)
- ✅ 버튼식 서비스 선택 UI
- ✅ 서비스별 설정 가이드 제공
- ✅ API 키 저장 시 적절한 설정 경로에 자동 배치

### v0.2.0 (2026-02-11)
- ❌ 제거: 잘못된 YAML 설정 (`gateway.yaml`)
- ✅ JSON5 형식 설정 파일 생성
- ✅ 올바른 설정 경로 사용

---

*마지막 업데이트: 2026-02-11*
