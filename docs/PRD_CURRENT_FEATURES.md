# moldClaw PRD - 현재 기능 구조

**버전:** 0.6.4  
**작성일:** 2026-02-24  
**목적:** moldClaw의 현재 Skills, Tools, 모델, 메신저 기능 구조 정리

---

## 1. 파일 구조 개요

```
src/
├── data/
│   ├── providers.ts        # AI 모델 프로바이더 정의
│   └── messengers.ts       # 메신저 채널 정의
│
├── components/
│   ├── settings/
│   │   ├── ModelSettings.tsx      # 모델 설정 UI
│   │   ├── MessengerSettings.tsx  # 메신저 설정 UI
│   │   ├── SkillsSettings.tsx     # 스킬 설정 UI
│   │   ├── ToolsSettings.tsx      # 도구 설정 UI
│   │   ├── TTSSettings.tsx        # TTS 설정 UI
│   │   ├── BrowserSettings.tsx    # 브라우저 설정 UI
│   │   ├── GmailSettings.tsx      # Gmail 설정 UI
│   │   └── GeneralSettings.tsx    # 일반 설정 UI
│   │
│   └── onboarding/
│       ├── ModelStep.tsx          # 모델 선택 온보딩
│       ├── MessengerStep.tsx      # 메신저 선택 온보딩
│       └── MessengerConnectStep.tsx # 메신저 연결 온보딩
│
└── types/
    └── config.ts           # 타입 정의
```

---

## 2. AI 모델 프로바이더

**파일:** `src/data/providers.ts`

### 2.1 기본 프로바이더 (BASIC_PROVIDERS) - 3개

| ID | 이름 | 모델 |
|---|---|---|
| `anthropic` | Anthropic | Claude Sonnet 4, Haiku 4.5, Opus 4 |
| `openai` | OpenAI | GPT-4o, GPT-4o Mini, o1, o1-mini |
| `google` | Google | Gemini 2.0 Flash, 1.5 Pro, 2.0 Pro |

### 2.2 추가 프로바이더 (ADDITIONAL_PROVIDERS) - 11개

| ID | 이름 | 특징 |
|---|---|---|
| `openrouter` | OpenRouter | 다중 모델 라우터 |
| `groq` | Groq | 초고속 추론 |
| `mistral` | Mistral | 프랑스 AI |
| `together` | Together AI | Llama 최적화 |
| `cerebras` | Cerebras | 초고속 하드웨어 |
| `xai` | xAI (Grok) | 일론 머스크 AI |
| `perplexity` | Perplexity | 검색 특화 |
| `deepgram` | Deepgram | 음성 인식 |
| `voyage` | Voyage | 임베딩 |
| `minimax` | MiniMax | 중국 AI |
| `moonshot` | Moonshot | 긴 컨텍스트 |
| `qwen` | Qwen (Alibaba) | 알리바바 AI |
| `venice` | Venice AI | 프라이버시 |

**총합:** 14개 프로바이더

### 2.3 지원 제외

- Ollama (로컬 모델)
- AWS Bedrock
- GitHub Copilot

---

## 3. 메신저 채널

**파일:** `src/data/messengers.ts`

### 3.1 기본 메신저 (BASIC_MESSENGERS) - 3개

| ID | 이름 | 난이도 | 인증방식 | 권장 |
|---|---|---|---|---|
| `telegram` | Telegram | ⭐ | Bot Token | ✅ |
| `whatsapp` | WhatsApp | ⭐ | QR Code | |
| `discord` | Discord | ⭐⭐⭐ | Bot Token | |

### 3.2 추가 메신저 (ADDITIONAL_MESSENGERS) - 3개

| ID | 이름 | 난이도 | 인증방식 |
|---|---|---|---|
| `slack` | Slack | ⭐⭐ | Bot Token + App Token |
| `mattermost` | Mattermost | ⭐⭐ | Bot Token |
| `googlechat` | Google Chat | ⭐⭐⭐ | Service Account JSON |

**총합:** 6개 메신저

### 3.3 지원 제외

- iMessage (macOS 전용)
- IRC
- Signal
- MS Teams

---

## 4. 스킬 (Skills)

**파일:** `src/components/settings/SkillsSettings.tsx`

### 4.1 현재 구현된 스킬 - 11개

| ID | 이름 | 환경변수 | OpenClaw 스킬 |
|---|---|---|---|
| `notion` | Notion | `NOTION_API_KEY` | ✅ 있음 |
| `github` | GitHub | `GITHUB_TOKEN` | ✅ 있음 |
| `todoist` | Todoist | `TODOIST_API_TOKEN` | ❌ 없음 |
| `linear` | Linear | `LINEAR_API_KEY` | ❌ 없음 |
| `trello` | Trello | `TRELLO_API_KEY` | ✅ 있음 |
| `figma` | Figma | `FIGMA_ACCESS_TOKEN` | ❌ 없음 |
| `jira` | Jira | `JIRA_API_TOKEN` | ❌ 없음 |
| `asana` | Asana | `ASANA_TOKEN` | ❌ 없음 |
| `airtable` | Airtable | `AIRTABLE_API_KEY` | ❌ 없음 |
| `dropbox` | Dropbox | `DROPBOX_TOKEN` | ❌ 없음 |
| `gitlab` | GitLab | `GITLAB_TOKEN` | ❌ 없음 |

### 4.2 동작 방식

- API 키를 `env.vars`에 저장
- OpenClaw가 `process.env`로 주입
- Agent가 curl/exec로 API 호출 (스킬 없는 경우)
- 스킬 있으면 SKILL.md 참조하여 정확한 API 호출

---

## 5. 도구 (Tools)

**파일:** `src/components/settings/ToolsSettings.tsx`

### 5.1 현재 구현된 도구 - 12개

| ID | 이름 | 환경변수 | OpenClaw 네이티브 |
|---|---|---|---|
| `brave-search` | Brave Search | `BRAVE_API_KEY` | ✅ `tools.web.search` |
| `firecrawl` | Firecrawl | `FIRECRAWL_API_KEY` | ✅ `tools.web.fetch.firecrawl` |
| `jina` | Jina Reader | `JINA_API_KEY` | ❌ |
| `serper` | Serper | `SERPER_API_KEY` | ❌ |
| `tavily` | Tavily | `TAVILY_API_KEY` | ❌ |
| `exa` | Exa | `EXA_API_KEY` | ❌ |
| `browserless` | Browserless | `BROWSERLESS_API_KEY` | ❌ |
| `scraperapi` | ScraperAPI | `SCRAPERAPI_KEY` | ❌ |
| `apify` | Apify | `APIFY_TOKEN` | ❌ |
| `wolfram` | Wolfram Alpha | `WOLFRAM_APP_ID` | ❌ |
| `newsapi` | News API | `NEWS_API_KEY` | ❌ |
| `weatherapi` | Weather API | `WEATHER_API_KEY` | ❌ |

### 5.2 OpenClaw 네이티브 지원

**지원됨 (2개):**
- Brave Search → `tools.web.search.provider: "brave"`
- Firecrawl → `tools.web.fetch.firecrawl`

**환경변수만 (10개):**
- Agent가 curl로 호출 가능하지만 네이티브 통합 아님

---

## 6. TTS (음성 출력)

**파일:** `src/components/settings/TTSSettings.tsx`

### 6.1 현재 구현된 TTS - 2개

| ID | 이름 | 환경변수 | 무료 |
|---|---|---|---|
| `elevenlabs` | ElevenLabs | `ELEVENLABS_API_KEY` | 월 10,000자 |
| `openai-tts` | OpenAI 음성 | `OPENAI_API_KEY` | 유료 |

### 6.2 지원 제외

- Edge TTS (무료, 설정 필요 없음)
- Sherpa-ONNX (로컬)

---

## 7. 내장 도구 프로필 (미구현)

**현재 상태:** UI 없음

### 7.1 OpenClaw 지원 프로필

| 프로필 | 포함 도구 |
|---|---|
| `minimal` | `session_status` 만 |
| `coding` | `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status` |
| `full` | 모든 도구 (제한 없음) |

### 7.2 현재 moldClaw 설정

```json
{
  "tools": {
    "exec": {
      "security": "deny",
      "ask": "on-miss"
    },
    "elevated": {
      "enabled": false
    }
  }
}
```

**문제점:** `tools.profile` 선택 UI 없음

---

## 8. 데이터 저장 방식

### 8.1 API 키 저장

```
moldClaw UI
    ↓ invoke('update_integrations_config')
openclaw.json → env.vars
    ↓ OpenClaw 시작 시
process.env에 주입
    ↓
Agent 사용 가능
```

### 8.2 특수 키 처리

| 환경변수 | 추가 저장 위치 |
|---|---|
| `BRAVE_API_KEY` | `tools.web.search.apiKey` |
| `FIRECRAWL_API_KEY` | `tools.web.fetch.firecrawl.apiKey` |
| `ELEVENLABS_API_KEY` | `messages.tts.elevenlabs.apiKey` |

---

## 9. 개선 필요 사항

### 9.1 누락된 기능

| 기능 | 현재 | 필요 |
|---|---|---|
| 내장 도구 프로필 | ❌ | `tools.profile` 선택 UI |
| exec 보안 설정 | 하드코딩 | UI로 변경 가능 |
| Perplexity 검색 | ❌ | `tools.web.search.provider` 선택 |
| Grok 검색 | ❌ | `tools.web.search.provider` 선택 |
| Edge TTS | ❌ | 무료 TTS 옵션 추가 |

### 9.2 OpenClaw 스킬 없는 항목

**스킬 추가 또는 UI 제거 고려:**
- Todoist, Linear, Figma, Jira, Asana, Airtable, Dropbox, GitLab

### 9.3 네이티브 미지원 도구

**환경변수만 저장 (동작 불안정):**
- Jina, Serper, Tavily, Exa, Browserless, ScraperAPI, Apify, Wolfram, NewsAPI, WeatherAPI

---

## 10. 파일별 항목 수 요약

| 파일 | 항목 수 | 설명 |
|---|---|---|
| `providers.ts` | 14개 | AI 모델 프로바이더 |
| `messengers.ts` | 6개 | 메신저 채널 |
| `SkillsSettings.tsx` | 11개 | 생산성 스킬 |
| `ToolsSettings.tsx` | 12개 | 외부 도구 |
| `TTSSettings.tsx` | 2개 | TTS 프로바이더 |

**총합:** 45개 연동 항목

---

## 11. 권장 개선 우선순위

### P0 (필수)
1. 내장 도구 프로필 UI 추가
2. OpenClaw 스킬 없는 항목 표시 (경고)

### P1 (권장)
3. Perplexity/Grok 검색 프로바이더 선택
4. Edge TTS 추가 (무료)
5. exec 보안 설정 UI

### P2 (선택)
6. 스킬 없는 항목 제거 또는 "실험적" 표시
7. 네이티브 미지원 도구 경고 표시

---

*이 문서는 moldClaw v0.6.4 기준으로 작성되었습니다.*
