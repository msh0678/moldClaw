# moldClaw 메신저 필수 설정 가이드

> OpenClaw 공식 스키마 + 온보딩 워크플로우 기반 분석
> 작성: 2026-02-23

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
- `open`: 모든 그룹 메시지 허용 (멘션 게이팅만 적용)
- `disabled`: 그룹 메시지 완전 차단
- `allowlist`: 등록된 그룹/채널만 허용

### allowFrom 스키마 규칙
```typescript
// ⚠️ 중요: dmPolicy="open" 일 때 반드시 ["*"] 포함해야 함
if (dmPolicy === "open") {
  allowFrom = ["*"];  // 필수!
}
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
| `groupPolicy` | GroupPolicy | 그룹 메시지 정책 | "open" |
| `groupAllowFrom` | `(string\|number)[]` | 허용 그룹 발신자 목록 | [] |
| `requireMention` | boolean | 멘션 필수 여부 | (그룹별 설정) |

### Config 경로
```yaml
channels:
  telegram:
    botToken: "123456:ABC-DEF..."
    dmPolicy: "pairing"
    allowFrom: []
    groupPolicy: "open"
```

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
| `groupPolicy` | GroupPolicy | 길드 채널 정책 | "open" |
| `guilds` | Record | 길드별 설정 | {} |

### Config 경로
```yaml
channels:
  discord:
    token: "MTIzNDU2..."
    dm:
      enabled: true
      policy: "pairing"
      allowFrom: []
    groupPolicy: "open"
```

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
| `groupPolicy` | GroupPolicy | 그룹 메시지 정책 | "open" |
| `groupAllowFrom` | `string[]` | 허용 그룹 발신자 (E.164) | [] |

### Config 경로
```yaml
channels:
  whatsapp:
    accounts:
      default:
        enabled: true
        dmPolicy: "pairing"
        allowFrom: []
        groupPolicy: "open"
```

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
| `groupPolicy` | GroupPolicy | 채널 메시지 정책 | "open" |
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
    groupPolicy: "open"
    requireMention: true
```

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
| `groupPolicy` | GroupPolicy | Space 메시지 정책 | "open" |
| `groupAllowFrom` | `(string\|number)[]` | 허용 발신자 목록 | [] |
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
    groupPolicy: "open"
    requireMention: true
```

---

## moldClaw UI 매핑 요약

### 각 메신저 설정 모달에서 보여야 할 필드

| 메신저 | 인증 필드 | DM Policy 경로 | allowFrom 경로 | Group Policy 경로 |
|--------|----------|----------------|----------------|-------------------|
| Telegram | `botToken` | `dmPolicy` | `allowFrom` | `groupPolicy` |
| Discord | `token` | `dm.policy` | `dm.allowFrom` | `groupPolicy` |
| WhatsApp | (QR) | `dmPolicy` | `allowFrom` | `groupPolicy` |
| Slack | `botToken`, `appToken` | `dm.policy` | `dm.allowFrom` | `groupPolicy` |
| Google Chat | `serviceAccountFile` | `dm.policy` | `dm.allowFrom` | `groupPolicy` |

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

---

---

## moldClaw invoke 아키텍처

### 데이터 흐름
```
Frontend (camelCase)
   ↓ invoke('update_messenger_config', { dmPolicy, allowFrom, ... })
   ↓ (Tauri 2.0 auto-converts: camelCase → snake_case)
Rust lib.rs (snake_case params)
   ↓ dm_policy, allow_from
Rust openclaw.rs
   ↓ (채널별 스키마에 맞게 매핑)
OpenClaw config (channels.*.dm.policy 등)
```

### update_messenger_config invoke 파라미터
```typescript
// Frontend에서 호출 시 (camelCase)
await invoke('update_messenger_config', {
  channel: 'discord',      // 채널 ID
  token: 'xxxxx',          // 봇 토큰 (WhatsApp은 빈 문자열)
  dmPolicy: 'pairing',     // DM 정책
  allowFrom: ['user1'],    // 허용 목록
  groupPolicy: 'open',     // 그룹 정책
  requireMention: true,    // 멘션 필수 여부
});
```

### Rust 백엔드 매핑 (채널별)
| 채널 | Frontend param | Config 경로 |
|------|---------------|-------------|
| **Telegram** | `dmPolicy` | `channels.telegram.dmPolicy` |
| | `allowFrom` | `channels.telegram.allowFrom` |
| | `groupPolicy` | `channels.telegram.groupPolicy` |
| **Discord** | `dmPolicy` | `channels.discord.dm.policy` |
| | `allowFrom` | `channels.discord.dm.allowFrom` |
| | `groupPolicy` | `channels.discord.groupPolicy` |
| **WhatsApp** | `dmPolicy` | `channels.whatsapp.accounts.default.dmPolicy` |
| | `allowFrom` | `channels.whatsapp.accounts.default.allowFrom` |
| | `groupPolicy` | `channels.whatsapp.groupPolicy` |
| **Slack** | `dmPolicy` | `channels.slack.dm.policy` |
| | `allowFrom` | `channels.slack.dm.allowFrom` |
| | `groupPolicy` | `channels.slack.groupPolicy` |
| **Google Chat** | `dmPolicy` | `channels.googlechat.dm.policy` |
| | `allowFrom` | `channels.googlechat.dm.allowFrom` |
| | `groupPolicy` | `channels.googlechat.groupPolicy` |

### 추가 설정 invoke 명령

| 메신저 | 추가 invoke | 설명 |
|--------|------------|------|
| WhatsApp | `login_whatsapp` | QR 코드 페어링 시작 |
| Slack | `set_slack_app_token` | Socket Mode용 앱 토큰 |
| Google Chat | `set_googlechat_service_account` | 서비스 계정 JSON 경로 |
| Mattermost | `set_mattermost_url` | 서버 URL |

---

## 참고 문서

- OpenClaw 소스: `/home/sanghyuck/openclaw/src/config/types.*.ts`
- 온보딩 워크플로우: `/home/sanghyuck/openclaw/src/wizard/onboarding.ts`
- Zod 스키마: `/home/sanghyuck/openclaw/src/config/zod-schema.*.ts`
- moldClaw Rust 백엔드: `/home/sanghyuck/workspace/moldClaw/src-tauri/src/openclaw.rs`
