# moldClaw 메신저 필수 설정 가이드

> OpenClaw 공식 스키마 + moldClaw UI 기반 분석
> 작성: 2026-02-23
> **최종 업데이트: 2026-02-24 (groupAllowFrom 추가, 보안 기본값 변경)**

## 공통 필수 개념

### DmPolicy (DM 접근 정책)
모든 메신저에서 공통으로 사용:
```typescript
type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";
```
- `pairing` (기본): 미인증 사용자에게 페어링 코드 발급 → `openclaw pairing approve <channel> <code>`
- `allowlist`: `allowFrom`에 등록된 사용자만 허용
- `open`: 모든 DM 허용 (**⚠️ 보안 위험 — `allowFrom: ["*"]` 필수**)
- `disabled`: DM 완전 차단

### GroupPolicy (그룹/채널 정책)
```typescript
type GroupPolicy = "open" | "disabled" | "allowlist";
// ⚠️ "pairing"은 DmPolicy 전용! GroupPolicy에서 사용 불가
```
- `allowlist` (**moldClaw 기본값 ✅**): 등록된 그룹/채널만 허용
- `open`: 모든 그룹 메시지 허용 (멘션 게이팅만 적용) — ⚠️ 비용 위험
- `disabled`: 그룹 메시지 완전 차단

> ⚠️ **보안 변경 (2026-02-23)**: moldClaw v0.5.3+에서 groupPolicy 기본값이 `"open"` → `"allowlist"`로 변경됨

### allowFrom 스키마 규칙
```typescript
// ⚠️ 중요: dmPolicy="open" 일 때 반드시 ["*"] 포함해야 함
if (dmPolicy === "open") {
  allowFrom = ["*"];  // 필수!
}
```

### groupAllowFrom 스키마 규칙 (신규)
```typescript
// groupPolicy="allowlist" 일 때만 사용
type GroupAllowFrom = Array<string | number>;

// 메신저별 형식:
// - Telegram: 그룹 ID (음수, 예: -1001234567890)
// - Discord: guild:서버ID (예: guild:123456789) 또는 서버 ID
// - WhatsApp: 그룹 JID (예: 123456789@g.us)
// - Slack: 채널 ID (예: C1234567890)
// - Google Chat: Space ID (예: spaces/AAAA...)
// - Mattermost: 채널 이름 (예: general)
```

---

## 1. Telegram

### 연결 방식
BotFather에서 봇 생성 → 토큰 입력

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `botToken` | string | BotFather 토큰 | ✅ 필수 |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### DM 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dmPolicy` | DmPolicy | DM 접근 정책 | "pairing" |
| `allowFrom` | `(string\|number)[]` | 허용 사용자 목록 (ID/username) | [] |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | 그룹 메시지 정책 | "allowlist" |
| `groupAllowFrom` | `(string\|number)[]` | 허용 그룹 ID 목록 | [] |
| `requireMention` | boolean | 멘션 필수 여부 | (그룹별 설정) |

### Config 경로
```yaml
channels:
  telegram:
    botToken: "123456:ABC-DEF..."
    dmPolicy: "pairing"
    allowFrom: []
    groupPolicy: "allowlist"
    groupAllowFrom: [-1001234567890]
```

### groupAllowFrom 입력 예시
```
-1001234567890
-1009876543210
```
> 그룹 ID는 음수. @RawDataBot에게 그룹에서 메시지 보내면 ID 확인 가능.

---

## 2. Discord

### 연결 방식
Discord Developer Portal에서 Bot 생성 → 토큰 입력

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `token` | string | Bot 토큰 | ✅ 필수 |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### DM 정책 설정 (중첩 구조!)
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dm.enabled` | boolean | DM 활성화 | true |
| `dm.policy` | DmPolicy | DM 접근 정책 | "pairing" |
| `dm.allowFrom` | `(string\|number)[]` | 허용 사용자 목록 | [] |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | 길드 채널 정책 | "allowlist" |
| `guilds` | Record | 길드별 설정 | {} |
| `guilds.*.users` | `string[]` | 길드 허용 사용자 (groupAllowFrom 매핑) | [] |

### Config 경로
```yaml
channels:
  discord:
    token: "MTIzNDU2..."
    dm:
      enabled: true
      policy: "pairing"
      allowFrom: []
    groupPolicy: "allowlist"
    guilds:
      "*":
        users: ["guild:123456789"]
```

### groupAllowFrom 입력 예시
```
guild:123456789012345678
guild:987654321098765432
```
> 또는 서버 ID만: `123456789012345678`
> Discord Developer Mode 켜고 서버 우클릭 → Copy ID

---

## 3. WhatsApp

### 연결 방식
QR 코드 스캔 (토큰 없음)

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| (QR 인증) | - | QR 스캔으로 연결 | ✅ 필수 |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### ⚠️ 다중 계정 구조 주의!
```yaml
# ❌ 잘못된 경로
channels.whatsapp.enabled: true

# ✅ 올바른 경로
channels.whatsapp.accounts.default.enabled: true
```

### DM 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dmPolicy` | DmPolicy | DM 접근 정책 | "pairing" |
| `allowFrom` | `string[]` | 허용 전화번호 목록 (E.164) | [] |
| `selfChatMode` | boolean | 본인 번호 사용 모드 | false |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | 그룹 메시지 정책 | "allowlist" |
| `groupAllowFrom` | `string[]` | 허용 그룹 JID 목록 | [] |

### Config 경로
```yaml
channels:
  whatsapp:
    accounts:
      default:
        enabled: true
        dmPolicy: "pairing"
        allowFrom: []
        groupPolicy: "allowlist"
        groupAllowFrom: ["123456789@g.us"]
```

### groupAllowFrom 입력 예시
```
123456789012345678@g.us
987654321098765432@g.us
```
> 그룹 JID는 WhatsApp 내부 ID + `@g.us` 접미사

---

## 4. Slack

### 연결 방식
Slack App 생성 → Bot Token + App Token 입력

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `botToken` | string | xoxb-... 토큰 | ✅ 필수 |
| `appToken` | string | xapp-... 토큰 (Socket Mode) | Socket Mode시 필수 |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### DM 정책 설정 (중첩 구조!)
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dm.enabled` | boolean | DM 활성화 | true |
| `dm.policy` | DmPolicy | DM 접근 정책 | "pairing" |
| `dm.allowFrom` | `(string\|number)[]` | 허용 사용자 목록 | [] |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | 채널 메시지 정책 | "allowlist" |
| `groupAllowFrom` | `string[]` | 허용 채널 ID 목록 | [] |
| `requireMention` | boolean | 멘션 필수 여부 | true |
| `channels` | Record | 채널별 설정 | {} |

### Config 경로
```yaml
channels:
  slack:
    botToken: "xoxb-..."
    appToken: "xapp-..."
    dm:
      enabled: true
      policy: "pairing"
      allowFrom: []
    groupPolicy: "allowlist"
    channels:
      C1234567890:
        enabled: true
    requireMention: true
```

### groupAllowFrom 입력 예시
```
C1234567890
C0987654321
```
> Slack 채널 ID는 C로 시작. 채널 → 우클릭 → Copy Link에서 마지막 부분.

---

## 5. Google Chat

### 연결 방식
GCP 서비스 계정 JSON 파일 업로드

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `serviceAccountFile` | string | JSON 파일 경로 | ✅ (둘 중 하나) |
| `serviceAccount` | object | JSON 인라인 | ✅ (둘 중 하나) |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### DM 정책 설정 (중첩 구조!)
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dm.enabled` | boolean | DM 활성화 | true |
| `dm.policy` | DmPolicy | DM 접근 정책 | "pairing" |
| `dm.allowFrom` | `(string\|number)[]` | 허용 사용자 (ID/이메일) | [] |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | Space 메시지 정책 | "allowlist" |
| `groupAllowFrom` | `(string\|number)[]` | 허용 Space ID 목록 | [] |
| `requireMention` | boolean | 멘션 필수 여부 | true |

### Config 경로
```yaml
channels:
  googlechat:
    serviceAccountFile: "/path/to/service-account.json"
    dm:
      enabled: true
      policy: "pairing"
      allowFrom: []
    groupPolicy: "allowlist"
    groupAllowFrom: ["spaces/AAAAabcd1234"]
    requireMention: true
```

### groupAllowFrom 입력 예시
```
spaces/AAAAabcd1234
spaces/BBBBefgh5678
```
> Google Chat Space ID는 Chat API 또는 Space URL에서 확인

---

## 6. Mattermost

### 연결 방식
서버 관리자 → Bot Account 생성 → 토큰 + URL 입력

### 필수 설정
| 필드 | 타입 | 설명 | 필수 여부 |
|------|------|------|----------|
| `token` | string | Bot 토큰 | ✅ 필수 |
| `baseUrl` | string | 서버 URL | ✅ 필수 |
| `enabled` | boolean | 활성화 여부 | 기본값: true |

### DM 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `dmPolicy` | DmPolicy | DM 접근 정책 | "pairing" |
| `allowFrom` | `string[]` | 허용 사용자명 목록 | [] |

### 그룹 정책 설정
| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `groupPolicy` | GroupPolicy | 채널 메시지 정책 | "allowlist" |
| `groupAllowFrom` | `string[]` | 허용 채널 이름 목록 | [] |
| `requireMention` | boolean | 멘션 필수 여부 | true |

### Config 경로
```yaml
channels:
  mattermost:
    baseUrl: "https://mattermost.example.com"
    token: "..."
    dmPolicy: "pairing"
    allowFrom: []
    groupPolicy: "allowlist"
    groupAllowFrom: ["general", "team-announcements"]
    requireMention: true
```

### groupAllowFrom 입력 예시
```
general
team-chat
announcements
```
> Mattermost 채널 이름 (URL slug)

---

## moldClaw UI 매핑 요약

### 각 메신저 설정 모달에서 보여야 할 필드

| 메신저 | 인증 필드 | DM Policy 경로 | allowFrom 경로 | Group Policy 경로 | groupAllowFrom 경로 |
|--------|----------|----------------|----------------|-------------------|---------------------|
| Telegram | `botToken` | `dmPolicy` | `allowFrom` | `groupPolicy` | `groupAllowFrom` |
| Discord | `token` | `dm.policy` | `dm.allowFrom` | `groupPolicy` | `guilds.*.users` |
| WhatsApp | (QR) | `dmPolicy` | `allowFrom` | `groupPolicy` | `groupAllowFrom` |
| Slack | `botToken`, `appToken` | `dm.policy` | `dm.allowFrom` | `groupPolicy` | `channels.*` |
| Google Chat | `serviceAccountFile` | `dm.policy` | `dm.allowFrom` | `groupPolicy` | `groupAllowFrom` |
| Mattermost | `token`, `baseUrl` | `dmPolicy` | `allowFrom` | `groupPolicy` | `groupAllowFrom` |

### allowFrom 계산 함수 (권장)
```typescript
function computeAllowFrom(
  policy: DmPolicy,
  userInput: string[]
): string[] {
  if (policy === "open") {
    return ["*"];  // 필수!
  }
  if (policy === "allowlist") {
    return userInput.filter(Boolean);
  }
  return [];  // pairing, disabled
}
```

### groupAllowFrom 계산 함수 (권장)
```typescript
function computeGroupAllowFrom(
  policy: GroupPolicy,
  userInput: string[]
): string[] {
  if (policy === "allowlist") {
    return userInput.filter(Boolean);
  }
  return [];  // open, disabled
}
```

---

## moldClaw invoke 아키텍처

### 데이터 흐름
```
Frontend (camelCase)
   ↓ invoke('update_messenger_config', { dmPolicy, allowFrom, groupAllowFrom, ... })
   ↓ (Tauri 2.0 auto-converts: camelCase → snake_case)
Rust lib.rs (snake_case params)
   ↓ dm_policy, allow_from, group_allow_from
Rust openclaw.rs
   ↓ (채널별 스키마에 맞게 매핑)
OpenClaw config (channels.*.dm.policy 등)
```

### update_messenger_config invoke 파라미터
```typescript
// Frontend에서 호출 시 (camelCase)
await invoke('update_messenger_config', {
  channel: 'discord',        // 채널 ID
  token: 'xxxxx',            // 봇 토큰 (WhatsApp은 빈 문자열)
  dmPolicy: 'pairing',       // DM 정책
  allowFrom: ['user1'],      // DM 허용 목록
  groupPolicy: 'allowlist',  // 그룹 정책 (기본값: allowlist)
  groupAllowFrom: ['guild:123'],  // 그룹 허용 목록 ✨ 신규
  requireMention: true,      // 멘션 필수 여부
});
```

### Rust 백엔드 매핑 (채널별)
| 채널 | Frontend param | Config 경로 |
|------|---------------|-------------|
| **Telegram** | `dmPolicy` | `channels.telegram.dmPolicy` |
| | `allowFrom` | `channels.telegram.allowFrom` |
| | `groupPolicy` | `channels.telegram.groupPolicy` |
| | `groupAllowFrom` | `channels.telegram.groupAllowFrom` |
| **Discord** | `dmPolicy` | `channels.discord.dm.policy` |
| | `allowFrom` | `channels.discord.dm.allowFrom` |
| | `groupPolicy` | `channels.discord.groupPolicy` |
| | `groupAllowFrom` | `channels.discord.guilds.*.users` |
| **WhatsApp** | `dmPolicy` | `channels.whatsapp.accounts.default.dmPolicy` |
| | `allowFrom` | `channels.whatsapp.accounts.default.allowFrom` |
| | `groupPolicy` | `channels.whatsapp.groupPolicy` |
| | `groupAllowFrom` | `channels.whatsapp.accounts.default.groupAllowFrom` |
| **Slack** | `dmPolicy` | `channels.slack.dm.policy` |
| | `allowFrom` | `channels.slack.dm.allowFrom` |
| | `groupPolicy` | `channels.slack.groupPolicy` |
| | `groupAllowFrom` | `channels.slack.channels.<id>.enabled` (각 채널) |
| **Google Chat** | `dmPolicy` | `channels.googlechat.dm.policy` |
| | `allowFrom` | `channels.googlechat.dm.allowFrom` |
| | `groupPolicy` | `channels.googlechat.groupPolicy` |
| | `groupAllowFrom` | `channels.googlechat.groupAllowFrom` |
| **Mattermost** | `dmPolicy` | `channels.mattermost.dmPolicy` |
| | `allowFrom` | `channels.mattermost.allowFrom` |
| | `groupPolicy` | `channels.mattermost.groupPolicy` |
| | `groupAllowFrom` | `channels.mattermost.groupAllowFrom` |

### 추가 설정 invoke 명령

| 메신저 | 추가 invoke | 설명 |
|--------|------------|------|
| WhatsApp | `login_whatsapp` | QR 코드 페어링 시작 |
| Slack | `set_slack_app_token` | Socket Mode용 앱 토큰 |
| Google Chat | `set_googlechat_service_account` | 서비스 계정 JSON 경로 |
| Mattermost | `set_mattermost_url` | 서버 URL |

---

## 보안 권장 사항

### ✅ 권장 설정
1. **dmPolicy: "pairing"** — 신규 사용자 인증 코드 필요
2. **groupPolicy: "allowlist"** — 등록된 그룹/채널만 허용
3. **requireMention: true** — 그룹에서 멘션 필수

### ⚠️ 위험 설정
1. **dmPolicy: "open"** — 누구나 DM 가능 → API 비용 폭증 위험
2. **groupPolicy: "open"** — 모든 그룹 메시지 처리 → 비용/개인정보 위험
3. **requireMention: false** — 모든 메시지에 응답 → 토큰 낭비

---

## 참고 문서

- OpenClaw 소스: `/home/sanghyuck/openclaw/src/config/types.*.ts`
- 온보딩 워크플로우: `/home/sanghyuck/openclaw/src/wizard/onboarding.ts`
- Zod 스키마: `/home/sanghyuck/openclaw/src/config/zod-schema.*.ts`
- moldClaw Rust 백엔드: `/home/sanghyuck/workspace/moldClaw/src-tauri/src/openclaw.rs`
- 보안 감사 보고서: `/home/sanghyuck/workspace/moldClaw/docs/SECURITY_AUDIT_2026-02-23.md`
