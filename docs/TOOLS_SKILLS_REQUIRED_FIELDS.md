# moldClaw Tools & Skills 필수 설정 가이드

> OpenClaw 공식 스키마 + moldClaw UI 기반 분석
> 작성: 2026-02-24
> 참고: types.tools.ts, types.skills.ts, docs/tools/

---

## 📋 요약

| 카테고리 | 항목 수 | 필수 설정 |
|---------|--------|----------|
| **Tools** (웹 검색) | 3개 | API 키 |
| **Tools** (웹 추출) | 3개 | API 키 (선택) |
| **Tools** (자동화) | 3개 | 설정 플래그 |
| **Skills** (생산성) | 8개 | API 키/토큰 |
| **Skills** (개발) | 2개 | API 토큰 |

---

# Part 1: Tools (도구)

OpenClaw Tools는 AI 에이전트가 외부 서비스나 시스템과 상호작용하는 **내장 기능**입니다.

## 1. Web Search (웹 검색)

### 1.1 Brave Search (기본 권장)

| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `tools.web.search.enabled` | boolean | 웹 검색 활성화 | 기본값: true |
| `tools.web.search.apiKey` | string | Brave Search API 키 | ✅ 필수 |
| `tools.web.search.provider` | string | "brave" | 기본값: brave |
| `tools.web.search.maxResults` | number | 결과 수 (1-10) | 기본값: 5 |
| `tools.web.search.timeoutSeconds` | number | 타임아웃 | 기본값: 30 |
| `tools.web.search.cacheTtlMinutes` | number | 캐시 TTL | 기본값: 15 |

**Config 경로:**
```yaml
tools:
  web:
    search:
      enabled: true
      provider: "brave"
      apiKey: "BSA..."
      maxResults: 5
```

**환경변수 대안:** `BRAVE_API_KEY`

**API 키 발급:**
1. [brave.com/search/api](https://brave.com/search/api/) 접속
2. 무료 계정 생성 (이메일만 필요)
3. "Data for Search" 플랜 선택
4. API Keys 메뉴에서 키 생성

**무료 한도:** 월 2,000회

---

### 1.2 Perplexity Sonar

| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `tools.web.search.provider` | string | "perplexity" | ✅ 필수 |
| `tools.web.search.perplexity.apiKey` | string | API 키 | ✅ 필수 |
| `tools.web.search.perplexity.baseUrl` | string | API 엔드포인트 | 기본값: 자동 |
| `tools.web.search.perplexity.model` | string | 모델 ID | 기본값: perplexity/sonar-pro |

**Config 경로:**
```yaml
tools:
  web:
    search:
      enabled: true
      provider: "perplexity"
      perplexity:
        apiKey: "pplx-..."  # 또는 "sk-or-v1-..." (OpenRouter)
        baseUrl: "https://api.perplexity.ai"  # 또는 OpenRouter
        model: "perplexity/sonar-pro"
```

**환경변수 대안:** `PERPLEXITY_API_KEY` 또는 `OPENROUTER_API_KEY`

**API 키 발급 (OpenRouter 경유):**
1. [openrouter.ai](https://openrouter.ai/) 접속
2. 계정 생성 + 크레딧 충전 (암호화폐/선불 가능)
3. API 키 생성

**모델 옵션:**
| 모델 | 용도 |
|------|------|
| `perplexity/sonar` | 빠른 Q&A |
| `perplexity/sonar-pro` | 복잡한 질문 (기본값) |
| `perplexity/sonar-reasoning-pro` | 심층 분석 |

---

### 1.3 Grok Search

| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `tools.web.search.provider` | string | "grok" | ✅ 필수 |
| `tools.web.search.grok.apiKey` | string | xAI API 키 | ✅ 필수 |
| `tools.web.search.grok.model` | string | 모델 ID | 기본값: grok-4-1-fast |
| `tools.web.search.grok.inlineCitations` | boolean | 인라인 인용 | 기본값: false |

**환경변수 대안:** `XAI_API_KEY`

---

## 2. Web Fetch (웹 추출)

### 2.1 기본 설정

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `tools.web.fetch.enabled` | boolean | 웹 추출 활성화 | true |
| `tools.web.fetch.maxChars` | number | 최대 문자 수 | 50000 |
| `tools.web.fetch.timeoutSeconds` | number | 타임아웃 | 30 |
| `tools.web.fetch.readability` | boolean | Readability 사용 | true |

**Config 경로:**
```yaml
tools:
  web:
    fetch:
      enabled: true
      maxChars: 50000
      timeoutSeconds: 30
      readability: true
```

> ⚠️ `web_fetch`는 JavaScript를 실행하지 않습니다. JS 필요 시 Browser 도구 사용.

---

### 2.2 Firecrawl (봇 차단 우회)

| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `tools.web.fetch.firecrawl.enabled` | boolean | Firecrawl 활성화 | API 키 있으면 자동 |
| `tools.web.fetch.firecrawl.apiKey` | string | API 키 | ✅ 사용 시 필수 |
| `tools.web.fetch.firecrawl.baseUrl` | string | API URL | 기본값: api.firecrawl.dev |
| `tools.web.fetch.firecrawl.onlyMainContent` | boolean | 본문만 추출 | 기본값: true |
| `tools.web.fetch.firecrawl.maxAgeMs` | number | 캐시 기간 | 86400000 (1일) |
| `tools.web.fetch.firecrawl.timeoutSeconds` | number | 타임아웃 | 60 |

**Config 경로:**
```yaml
tools:
  web:
    fetch:
      firecrawl:
        enabled: true
        apiKey: "fc-..."
        onlyMainContent: true
```

**환경변수 대안:** `FIRECRAWL_API_KEY`

**API 키 발급:**
1. [firecrawl.dev](https://firecrawl.dev/) 접속
2. Get Started → 회원가입
3. Dashboard에서 API Key 복사

**무료 한도:** 월 500회

---

## 3. Browser (브라우저 자동화)

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `browser.enabled` | boolean | 브라우저 도구 활성화 | true |
| `browser.defaultProfile` | string | 기본 프로필 | "chrome" |

**Config 경로:**
```yaml
browser:
  enabled: true
  defaultProfile: "chrome"
```

**프로필 관리 액션:**
- `profiles` — 모든 프로필 목록
- `create-profile` — 새 프로필 생성
- `delete-profile` — 프로필 삭제
- `reset-profile` — 프로필 리셋

**주요 액션:**
- `snapshot` — 페이지 접근성 트리 (aria/ai)
- `screenshot` — 스크린샷
- `act` — UI 상호작용 (click/type/press 등)

> ⚠️ API 키 필요 없음. Playwright 또는 시스템 Chrome 사용.

---

## 4. Exec (명령 실행)

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `tools.exec.host` | string | 실행 위치 | "sandbox" |
| `tools.exec.security` | string | 보안 모드 | "deny" |
| `tools.exec.ask` | string | 승인 모드 | "on-miss" |
| `tools.exec.timeoutSec` | number | 타임아웃 | 1800 |

**Config 경로:**
```yaml
tools:
  exec:
    host: "sandbox"      # sandbox | gateway | node
    security: "deny"     # deny | allowlist | full
    ask: "on-miss"       # off | on-miss | always
    timeoutSec: 1800
```

**security 옵션:**
| 값 | 설명 | 위험도 |
|---|------|-------|
| `deny` | 모든 명령 차단 | 🟢 안전 |
| `allowlist` | 허용 목록만 실행 | 🟡 주의 |
| `full` | 모든 명령 허용 | 🔴 위험 |

---

## 5. Memory Search (메모리 검색)

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `tools.memorySearch.enabled` | boolean | 메모리 검색 활성화 | true |
| `tools.memorySearch.provider` | string | 임베딩 제공자 | "openai" |
| `tools.memorySearch.model` | string | 임베딩 모델 | - |

**Config 경로:**
```yaml
tools:
  memorySearch:
    enabled: true
    provider: "openai"  # openai | gemini | local | voyage
    model: "text-embedding-3-small"
```

**provider 옵션:**
| 제공자 | 설명 | 필요 키 |
|--------|------|---------|
| `openai` | OpenAI 임베딩 | OPENAI_API_KEY |
| `gemini` | Google 임베딩 | GOOGLE_AI_API_KEY |
| `local` | 로컬 GGUF 모델 | 없음 |
| `voyage` | Voyage AI | VOYAGE_API_KEY |

---

## 6. Tool Profiles (도구 프로필)

| 프로필 | 포함 도구 | 용도 |
|--------|----------|------|
| `minimal` | `session_status` | 최소 기능 |
| `coding` | `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image` | 코딩 |
| `messaging` | `group:messaging`, `sessions_*`, `session_status` | 메시징 |
| `full` | 모든 도구 | 제한 없음 |

**Config 경로:**
```yaml
tools:
  profile: "coding"
  allow: ["browser"]      # 추가 허용
  deny: ["group:runtime"] # 추가 차단
```

**도구 그룹:**
| 그룹 | 포함 도구 |
|------|----------|
| `group:runtime` | `exec`, `bash`, `process` |
| `group:fs` | `read`, `write`, `edit`, `apply_patch` |
| `group:sessions` | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` |
| `group:memory` | `memory_search`, `memory_get` |
| `group:web` | `web_search`, `web_fetch` |
| `group:ui` | `browser`, `canvas` |
| `group:automation` | `cron`, `gateway` |
| `group:messaging` | `message` |
| `group:nodes` | `nodes` |

---

# Part 2: Skills (스킬)

OpenClaw Skills는 AI 에이전트에게 **특정 서비스 사용법을 가르치는** 확장 모듈입니다.

## 스킬 위치 및 우선순위

```
1. <workspace>/skills     (최우선 - 워크스페이스)
2. ~/.openclaw/skills     (중간 - 관리/로컬)
3. 번들 스킬              (최하위 - 설치 패키지)
```

## 스킬 설정 스키마

```typescript
type SkillConfig = {
  enabled?: boolean;        // 스킬 활성화 여부
  apiKey?: string;          // 주 환경변수 값 (primaryEnv)
  env?: Record<string, string>;  // 추가 환경변수
  config?: Record<string, unknown>;  // 스킬별 커스텀 설정
};
```

**Config 경로:**
```yaml
skills:
  entries:
    notion:
      enabled: true
      apiKey: "secret_..."
    github:
      enabled: true
      apiKey: "ghp_..."
      env:
        GITHUB_USERNAME: "myuser"
```

---

## 1. 생산성 스킬

### 1.1 Notion

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `NOTION_API_KEY` | Internal Integration Token | ✅ 필수 |

**API 키 발급:**
1. [notion.so/my-integrations](https://www.notion.so/my-integrations) 접속
2. `+ New integration` 클릭
3. 이름 입력 후 Submit
4. Internal Integration Token 복사

> ⚠️ **중요:** 연결할 Notion 페이지에서 "Connections" 메뉴로 통합 추가 필요!

---

### 1.2 Todoist

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `TODOIST_API_TOKEN` | API 토큰 | ✅ 필수 |

**API 키 발급:**
1. todoist.com 로그인
2. 설정 → 연동 → 개발자
3. API 토큰 복사

---

### 1.3 Linear

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `LINEAR_API_KEY` | API 키 | ✅ 필수 |

**API 키 발급:**
1. linear.app 로그인
2. Settings → Account → API
3. Personal API keys → Create key
4. 키 복사

---

### 1.4 Trello

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `TRELLO_API_KEY` | API 키 + Token | ✅ 필수 |

**API 키 발급:**
1. [trello.com/power-ups/admin](https://trello.com/power-ups/admin) 접속
2. API Key 확인
3. Token도 필요 (링크 클릭해서 발급)
4. 둘 다 입력

---

### 1.5 Jira

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `JIRA_API_TOKEN` | API 토큰 | ✅ 필수 |

**API 키 발급:**
1. [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
2. Create API token 클릭
3. 토큰 이름 입력 → Create
4. 토큰 복사

---

### 1.6 Asana

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `ASANA_TOKEN` | Personal Access Token | ✅ 필수 |

**API 키 발급:**
1. [app.asana.com/0/developer-console](https://app.asana.com/0/developer-console) 접속
2. Personal access tokens 탭
3. `+ New access token`
4. 토큰 복사

---

### 1.7 Airtable

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `AIRTABLE_API_KEY` | API 키 | ✅ 필수 |

**API 키 발급:**
1. airtable.com/account 접속
2. API 섹션에서 Generate API key
3. 키 복사

---

### 1.8 Figma

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `FIGMA_ACCESS_TOKEN` | Personal Access Token | ✅ 필수 |

**API 키 발급:**
1. figma.com 로그인
2. 계정 설정 → Personal access tokens
3. 토큰 생성 → 복사

---

## 2. 개발 스킬

### 2.1 GitHub

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `GITHUB_TOKEN` | Personal Access Token | ✅ 필수 |

**API 키 발급:**
1. GitHub 로그인 → Settings
2. Developer settings → Personal access tokens
3. Tokens (classic) → Generate new token
4. 필요 권한 선택 (repo, read:user 등)
5. 토큰 복사 (한 번만 표시!)

**권장 권한:**
- `repo` — 저장소 접근
- `read:user` — 사용자 정보 읽기
- `workflow` — GitHub Actions (선택)

---

### 2.2 GitLab

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `GITLAB_TOKEN` | Personal Access Token | ✅ 필수 |

**API 키 발급:**
1. GitLab 로그인
2. User Settings → Access Tokens
3. 토큰 이름, 만료일, 권한 설정
4. Create personal access token → 복사

---

## 3. 기타 스킬

### 3.1 Dropbox

| 필드 | 환경변수 | 설명 | 필수 |
|------|---------|------|------|
| `apiKey` | `DROPBOX_TOKEN` | Access Token | ✅ 필수 |

**API 키 발급:**
1. [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps) 접속
2. Create app 클릭
3. App 설정에서 Generate access token
4. 토큰 복사

---

# Part 3: moldClaw UI 매핑

## Tools 설정 invoke

```typescript
// 도구 API 키 설정
await invoke('set_tool_api_key', {
  tool: 'brave-search',  // 도구 ID
  apiKey: 'BSA...',      // API 키
});
```

**moldClaw 지원 도구:**
| ID | 환경변수 | Config 경로 |
|----|---------|-------------|
| `brave-search` | `BRAVE_API_KEY` | `tools.web.search.apiKey` |
| `firecrawl` | `FIRECRAWL_API_KEY` | `tools.web.fetch.firecrawl.apiKey` |
| `jina` | `JINA_API_KEY` | (환경변수만) |
| `serper` | `SERPER_API_KEY` | (환경변수만) |
| `tavily` | `TAVILY_API_KEY` | (환경변수만) |
| `exa` | `EXA_API_KEY` | (환경변수만) |
| `browserless` | `BROWSERLESS_API_KEY` | (환경변수만) |
| `scraperapi` | `SCRAPERAPI_KEY` | (환경변수만) |
| `apify` | `APIFY_TOKEN` | (환경변수만) |
| `wolfram` | `WOLFRAM_APP_ID` | (환경변수만) |
| `newsapi` | `NEWS_API_KEY` | (환경변수만) |
| `weatherapi` | `WEATHER_API_KEY` | (환경변수만) |

---

## Skills 설정 invoke

```typescript
// 스킬 API 키 설정
await invoke('set_skill_api_key', {
  skill: 'notion',       // 스킬 ID
  apiKey: 'secret_...',  // API 키
});
```

**moldClaw 지원 스킬:**
| ID | 환경변수 | Config 경로 |
|----|---------|-------------|
| `notion` | `NOTION_API_KEY` | `skills.entries.notion.apiKey` |
| `github` | `GITHUB_TOKEN` | `skills.entries.github.apiKey` |
| `todoist` | `TODOIST_API_TOKEN` | `skills.entries.todoist.apiKey` |
| `linear` | `LINEAR_API_KEY` | `skills.entries.linear.apiKey` |
| `trello` | `TRELLO_API_KEY` | `skills.entries.trello.apiKey` |
| `figma` | `FIGMA_ACCESS_TOKEN` | `skills.entries.figma.apiKey` |
| `jira` | `JIRA_API_TOKEN` | `skills.entries.jira.apiKey` |
| `asana` | `ASANA_TOKEN` | `skills.entries.asana.apiKey` |
| `airtable` | `AIRTABLE_API_KEY` | `skills.entries.airtable.apiKey` |
| `dropbox` | `DROPBOX_TOKEN` | `skills.entries.dropbox.apiKey` |
| `gitlab` | `GITLAB_TOKEN` | `skills.entries.gitlab.apiKey` |

---

# Part 4: 보안 권장 사항

## ✅ 안전한 설정

1. **tools.exec.security: "deny"** — 명령 실행 차단 (기본값)
2. **tools.profile: "coding"** — 필요 도구만 허용
3. **스킬별 최소 권한** — 필요한 권한만 부여

## ⚠️ 위험한 설정

1. **tools.exec.security: "full"** — 모든 명령 허용 → 시스템 위험
2. **tools.elevated.enabled: true** — 관리자 권한 → 주의 필요
3. **과도한 API 권한** — 토큰 발급 시 최소 권한 원칙

## 🔒 API 키 보안

- 모든 키는 `~/.openclaw/openclaw.json`에 저장 (로컬 파일)
- 서버 전송 없음 — moldClaw는 서버가 없음
- **config 파일 공유 시 주의** — API 키가 평문으로 저장됨
- 환경변수 대안 사용 권장 (`.env` 파일)

---

## 참고 문서

- OpenClaw Tools 문서: `/home/sanghyuck/openclaw/docs/tools/`
- OpenClaw Skills 문서: `/home/sanghyuck/openclaw/docs/tools/skills.md`
- 타입 정의: `/home/sanghyuck/openclaw/src/config/types.tools.ts`
- 스킬 타입: `/home/sanghyuck/openclaw/src/config/types.skills.ts`
- moldClaw ToolsSettings: `/home/sanghyuck/workspace/moldClaw/src/components/settings/ToolsSettings.tsx`
- moldClaw SkillsSettings: `/home/sanghyuck/workspace/moldClaw/src/components/settings/SkillsSettings.tsx`
