# OpenClaw Onboard 완전 분석 보고서

## 목적
`openclaw onboard` 명령의 모든 사용자 선택 변수를 분석하여 moldClaw UI에서 완전히 래핑되었는지 검증

---

## 1. 온보딩 플로우 단계 (Page Order)

공식 문서 기준 (`/docs/start/onboarding.md`):

```
1. Welcome + Security Notice
2. Gateway Selection (Local / Remote / Configure later)
3. Auth (인증 프로바이더 선택)
4. Setup Wizard (Gateway-driven)
5. Permissions (macOS TCC 권한)
6. CLI 설치 (선택)
7. Onboarding Chat (첫 대화)
8. Ready
```

---

## 2. 전체 CLI 옵션 분석

### 2.1 워크스페이스 설정

| 옵션 | 타입 | 기본값 | 설명 | moldClaw |
|------|------|--------|------|----------|
| `--workspace <dir>` | string | `~/.openclaw/workspace` | 에이전트 워크스페이스 경로 | ✅ 기본값 사용 |
| `--reset` | boolean | false | 설정/인증/세션/워크스페이스 초기화 후 시작 | ❌ 미지원 |

### 2.2 위저드 플로우

| 옵션 | 타입 | 선택지 | 설명 | moldClaw |
|------|------|--------|------|----------|
| `--flow <flow>` | enum | `quickstart` \| `advanced` \| `manual` | 위저드 모드 | ✅ quickstart 고정 |
| `--mode <mode>` | enum | `local` \| `remote` | Gateway 위치 | ✅ local 고정 |
| `--non-interactive` | boolean | - | 프롬프트 없이 실행 | ✅ UI가 대체 |
| `--accept-risk` | boolean | - | 위험 인지 동의 | ✅ Welcome에서 처리 |

### 2.3 인증 (Auth) - ⚠️ 가장 중요

| 옵션 | 타입 | 설명 | moldClaw |
|------|------|------|----------|
| `--auth-choice` | enum | 인증 방식 선택 | ⚠️ 부분 |

**`--auth-choice` 선택지 전체 (19개):**

| auth-choice 값 | 설명 | 환경변수 | moldClaw |
|----------------|------|----------|----------|
| `setup-token` | Claude CLI 토큰 (claude setup-token) | - | ❌ |
| `token` | 수동 토큰 입력 | - | ❌ |
| `chutes` | Chutes 인증 | - | ❌ |
| `openai-codex` | OpenAI Codex OAuth | - | ❌ |
| `openai-api-key` | OpenAI API 키 | `OPENAI_API_KEY` | ✅ ModelSetup |
| `openrouter-api-key` | OpenRouter API 키 | `OPENROUTER_API_KEY` | ✅ Integrations |
| `ai-gateway-api-key` | Vercel AI Gateway | `VERCEL_GATEWAY_API_KEY` | ⚠️ env.vars |
| `moonshot-api-key` | Moonshot API 키 | `MOONSHOT_API_KEY` | ✅ Integrations |
| `kimi-code-api-key` | Kimi Coding API 키 | `KIMI_API_KEY` | ⚠️ env.vars |
| `synthetic-api-key` | Synthetic API 키 | `SYNTHETIC_API_KEY` | ⚠️ env.vars |
| `venice-api-key` | Venice API 키 | `VENICE_API_KEY` | ⚠️ env.vars |
| `gemini-api-key` | Google Gemini API 키 | `GEMINI_API_KEY` | ✅ ModelSetup |
| `zai-api-key` | Z.AI API 키 | `ZAI_API_KEY` | ✅ Integrations |
| `xiaomi-api-key` | Xiaomi API 키 | `XIAOMI_API_KEY` | ⚠️ env.vars |
| `apiKey` | Anthropic API 키 | `ANTHROPIC_API_KEY` | ✅ ModelSetup |
| `minimax-api` | MiniMax API 키 | `MINIMAX_API_KEY` | ✅ Integrations |
| `minimax-api-lightning` | MiniMax Lightning | `MINIMAX_API_KEY` | ⚠️ env.vars |
| `opencode-zen` | OpenCode Zen API 키 | `OPENCODE_API_KEY` | ⚠️ env.vars |
| `skip` | 인증 건너뛰기 | - | ❌ |

### 2.4 직접 API 키 옵션

| 옵션 | 환경변수 | moldClaw |
|------|----------|----------|
| `--anthropic-api-key` | `ANTHROPIC_API_KEY` | ✅ ModelSetup |
| `--openai-api-key` | `OPENAI_API_KEY` | ✅ ModelSetup |
| `--openrouter-api-key` | `OPENROUTER_API_KEY` | ✅ Integrations |
| `--ai-gateway-api-key` | `VERCEL_GATEWAY_API_KEY` | ❌ |
| `--moonshot-api-key` | `MOONSHOT_API_KEY` | ✅ Integrations |
| `--kimi-code-api-key` | `KIMI_API_KEY` | ❌ |
| `--gemini-api-key` | `GEMINI_API_KEY` | ✅ ModelSetup |
| `--zai-api-key` | `ZAI_API_KEY` | ✅ Integrations |
| `--xiaomi-api-key` | `XIAOMI_API_KEY` | ❌ |
| `--minimax-api-key` | `MINIMAX_API_KEY` | ✅ Integrations |
| `--synthetic-api-key` | `SYNTHETIC_API_KEY` | ❌ |
| `--venice-api-key` | `VENICE_API_KEY` | ❌ |
| `--opencode-zen-api-key` | `OPENCODE_API_KEY` | ❌ |

### 2.5 토큰 관련 (수동 토큰 설정)

| 옵션 | 설명 | moldClaw |
|------|------|----------|
| `--token-provider <id>` | 토큰 프로바이더 ID | ❌ |
| `--token <token>` | 토큰 값 | ❌ |
| `--token-profile-id <id>` | 인증 프로필 ID | ❌ |
| `--token-expires-in <duration>` | 토큰 만료 기간 | ❌ |

### 2.6 Gateway 설정

| 옵션 | 타입 | 기본값 | 선택지 | moldClaw |
|------|------|--------|--------|----------|
| `--gateway-port` | number | 18789 | - | ✅ 기본값 |
| `--gateway-bind` | enum | loopback | `loopback` \| `tailnet` \| `lan` \| `auto` \| `custom` | ✅ loopback 고정 |
| `--gateway-auth` | enum | token | `token` \| `password` | ✅ token 고정 |
| `--gateway-token` | string | auto | - | ✅ 자동 생성 |
| `--gateway-password` | string | - | - | ❌ |

### 2.7 Remote 모드

| 옵션 | 설명 | moldClaw |
|------|------|----------|
| `--remote-url <url>` | 원격 Gateway WebSocket URL | ❌ |
| `--remote-token <token>` | 원격 Gateway 토큰 | ❌ |

### 2.8 Tailscale 통합

| 옵션 | 선택지 | moldClaw |
|------|--------|----------|
| `--tailscale` | `off` \| `serve` \| `funnel` | ❌ |
| `--tailscale-reset-on-exit` | boolean | ❌ |

### 2.9 데몬/서비스

| 옵션 | 설명 | moldClaw |
|------|------|----------|
| `--install-daemon` | 서비스 설치 | ✅ 시도 |
| `--no-install-daemon` | 서비스 설치 건너뛰기 | ❌ |
| `--skip-daemon` | 서비스 설치 건너뛰기 (alias) | ❌ |
| `--daemon-runtime` | `node` \| `bun` | ✅ node 고정 |

### 2.10 건너뛰기 옵션

| 옵션 | 설명 | moldClaw |
|------|------|----------|
| `--skip-channels` | 채널 설정 건너뛰기 | ❌ (채널은 필수) |
| `--skip-skills` | 스킬 설정 건너뛰기 | ✅ 건너뜀 |
| `--skip-health` | 헬스체크 건너뛰기 | ⚠️ 부분 |
| `--skip-ui` | Control UI/TUI 프롬프트 건너뛰기 | ✅ UI가 대체 |

### 2.11 기타

| 옵션 | 설명 | moldClaw |
|------|------|----------|
| `--node-manager` | `npm` \| `pnpm` \| `bun` | ✅ npm 고정 |
| `--json` | JSON 출력 | ❌ (불필요) |

---

## 3. 채널 설정 (Interactive Wizard)

`configure --section channels` 또는 `channels add` 에서 설정하는 항목:

### 3.1 WhatsApp
| 항목 | 설정 경로 | moldClaw |
|------|----------|----------|
| dmPolicy | `channels.whatsapp.dmPolicy` | ✅ Connect |
| allowFrom | `channels.whatsapp.allowFrom` | ❌ |
| groups | `channels.whatsapp.groups` | ✅ 기본값 |

### 3.2 Telegram
| 항목 | 설정 경로 | moldClaw |
|------|----------|----------|
| botToken | `channels.telegram.botToken` | ✅ Connect |
| enabled | `channels.telegram.enabled` | ✅ |
| dmPolicy | `channels.telegram.dmPolicy` | ✅ Connect |
| allowFrom | `channels.telegram.allowFrom` | ❌ |
| groups | `channels.telegram.groups` | ✅ 기본값 |

### 3.3 Discord
| 항목 | 설정 경로 | moldClaw |
|------|----------|----------|
| token | `channels.discord.token` | ✅ Connect |
| enabled | `channels.discord.enabled` | ✅ |
| dm.enabled | `channels.discord.dm.enabled` | ✅ |
| dm.policy | `channels.discord.dm.policy` | ✅ Connect |
| dm.allowFrom | `channels.discord.dm.allowFrom` | ❌ |
| guilds | `channels.discord.guilds` | ❌ |

### 3.4 Slack
| 항목 | 설정 경로 | moldClaw |
|------|----------|----------|
| botToken | `channels.slack.botToken` | ✅ Integrations |
| appToken | `channels.slack.appToken` | ✅ Integrations |
| dm.policy | `channels.slack.dm.policy` | ❌ |
| channels | `channels.slack.channels` | ❌ |

### 3.5 기타 채널
| 채널 | moldClaw |
|------|----------|
| Mattermost | ✅ Integrations |
| Google Chat | ✅ Integrations |
| Signal | ❌ (signal-cli 필요) |
| iMessage | ❌ (macOS 전용) |
| MS Teams | ❌ |

---

## 4. 외부 도구 설정 (configure --section web)

| 항목 | 환경변수 | 설정 경로 | moldClaw |
|------|----------|-----------|----------|
| Brave Search | `BRAVE_API_KEY` | `tools.web.search.apiKey` | ✅ Integrations |
| Firecrawl | `FIRECRAWL_API_KEY` | `tools.web.fetch.firecrawl.apiKey` | ✅ Integrations |

---

## 5. TTS 설정 (messages.tts)

| 항목 | 환경변수 | 설정 경로 | moldClaw |
|------|----------|-----------|----------|
| ElevenLabs | `ELEVENLABS_API_KEY` | `messages.tts.elevenlabs.apiKey` | ✅ Integrations |
| OpenAI TTS | `OPENAI_API_KEY` | `messages.tts.openai.apiKey` | ⚠️ (메인 키 공유) |

---

## 6. 스킬 설정 (configure --section skills)

| 항목 | 설명 | moldClaw |
|------|------|----------|
| skills.allowBundled | 허용할 번들 스킬 | ❌ |
| skills.entries.*.apiKey | 스킬별 API 키 | ❌ |
| skills.entries.*.env | 스킬별 환경변수 | ❌ |
| skills.install.nodeManager | npm/pnpm/bun | ❌ |

---

## 7. 뒤로가기 문제 분석

### 콘솔 onboard의 한계
```
Welcome → Auth → Gateway → Channels → Skills → Done
   ↓        ↓       ↓         ↓         ↓
  [선택]   [선택]  [선택]    [선택]    [선택]
   
※ 한번 선택하면 뒤로 갈 수 없음
※ 잘못 선택시 --reset 후 재시작 필요
```

### UI에서 뒤로가기 처리 방안

#### 방안 1: 즉시 저장 + 덮어쓰기 (현재)
```
각 단계에서 설정 즉시 저장
뒤로 가면 이전 화면만 표시
다시 진행하면 새 값으로 덮어쓰기
```
**장점**: 단순함, 중간에 종료해도 일부 저장
**단점**: 임시 상태 발생 가능

#### 방안 2: 최종 확인 후 일괄 저장 (권장)
```
각 단계에서 메모리에만 저장
마지막 "완료" 버튼에서 일괄 저장
뒤로 가면 메모리 상태만 변경
```
**장점**: 일관된 상태 보장, 뒤로가기 자연스러움
**단점**: 중간 종료시 설정 소실

#### 방안 3: 단계별 확정 + 명시적 되돌리기
```
각 단계 완료시 "확정" 버튼으로 저장
"뒤로" 대신 "이전 단계 수정" 버튼
수정시 해당 설정만 업데이트
```
**장점**: 명시적 사용자 의도
**단점**: 복잡한 UI

---

## 8. 현재 moldClaw 커버리지 요약

### 완전 지원 ✅ (17개)
- Anthropic/OpenAI/Gemini API 키
- OpenRouter/Groq/MiniMax/Moonshot/Z.AI
- Telegram/Discord/WhatsApp 기본 설정
- Slack/Mattermost/Google Chat 토큰
- Brave Search/Firecrawl/ElevenLabs
- Gateway 기본 설정 (port/bind/auth/token)
- Workspace 초기화

### 부분 지원 ⚠️ (8개)
- Kimi/Synthetic/Venice/Xiaomi/OpenCode Zen (env.vars에만 저장)
- Vercel AI Gateway
- MiniMax Lightning
- 채널 allowFrom/allowlist 설정

### 미지원 ❌ (15개)
- setup-token (Claude CLI 토큰)
- token 수동 입력 + 프로필 관리
- chutes/openai-codex OAuth
- Remote 모드
- Tailscale 통합
- password 인증
- Signal/iMessage/MS Teams
- Skills 관리
- --reset 기능
- 채널 guilds/channels 세부 설정

---

## 9. 권장 수정 사항

### 즉시 수정 (높음)
1. **뒤로가기 로직**: 메모리 저장 → 최종 일괄 저장 방식으로 변경
2. **누락 프로바이더**: Kimi, Synthetic, Venice, Xiaomi, OpenCode Zen, Vercel Gateway 추가
3. **allowFrom 설정**: 최소한 자신의 ID를 allowlist에 추가하는 옵션

### 향후 수정 (중간)
4. **setup-token 지원**: Claude CLI 토큰 연동 옵션
5. **채널 세부 설정**: guilds, channels allowlist 설정 UI
6. **Skills 페이지**: 스킬 활성화/비활성화 + API 키 설정

### 선택 사항 (낮음)
7. Remote 모드 지원
8. Tailscale 통합
9. Password 인증 옵션

---

*분석 일자: 2026-02-11*
*OpenClaw 버전: 2026.2.1 (7dfa99a)*
