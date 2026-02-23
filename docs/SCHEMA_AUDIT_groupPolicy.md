# groupPolicy / groupAllowFrom 스키마 검수 보고서

> 작성일: 2026-02-23
> 검수 대상: moldClaw 백엔드 (`update_messenger_config`)
> 기준: OpenClaw 공식 스키마 (`/home/sanghyuck/openclaw/src/config/types.*.ts`)

---

## 검수 결과 요약

| 채널 | groupPolicy 경로 | groupAllowFrom 경로 | 상태 |
|------|-----------------|--------------------|----|
| Telegram | ✅ 정상 | ✅ 정상 | ✅ |
| Discord | ✅ 정상 | ✅ 정상 (guilds.*.users) | ✅ |
| WhatsApp | ⚠️ 수정 필요 | ✅ 정상 | ⚠️ |
| Slack | ✅ 정상 | ✅ 정상 (channels.<id>) | ✅ |
| Google Chat | ✅ 정상 | ✅ 정상 | ✅ |
| Mattermost | ⚠️ 플러그인 | ⚠️ 플러그인 | ⚠️ |

---

## 상세 분석

### 1. Telegram ✅

**OpenClaw 스키마** (`types.telegram.ts:75-82`):
```typescript
groupAllowFrom?: Array<string | number>;
groupPolicy?: GroupPolicy;
```

**moldClaw 구현**:
```rust
set_nested_value(&mut config, &["channels", "telegram", "groupPolicy"], json!(group_policy));
set_nested_value(&mut config, &["channels", "telegram", "groupAllowFrom"], json!(group_allow_from));
```

**결과**: ✅ 정합성 일치

---

### 2. Discord ✅

**OpenClaw 스키마** (`types.discord.ts:129`):
```typescript
groupPolicy?: GroupPolicy;
// ⚠️ groupAllowFrom 없음 - guilds.*.users 사용
```

**moldClaw 구현**:
```rust
set_nested_value(&mut config, &["channels", "discord", "groupPolicy"], json!(group_policy));
set_nested_value(&mut config, &["channels", "discord", "guilds", "*", "users"], json!(group_allow_from));
```

**결과**: ✅ 정합성 일치 (Discord는 guilds.*.users로 관리)

---

### 3. WhatsApp ⚠️ 수정 필요

**OpenClaw 스키마** (`types.whatsapp.ts:57, 130`):
```typescript
// WhatsAppConfig (채널 레벨)
groupPolicy?: GroupPolicy;

// WhatsAppAccountConfig (계정 레벨)  
groupAllowFrom?: string[];
groupPolicy?: GroupPolicy;  // ← 계정 레벨에도 있음!
```

**moldClaw 현재 구현**:
```rust
set_nested_value(&mut config, &["channels", "whatsapp", "groupPolicy"], json!(group_policy));
set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupAllowFrom"], json!(group_allow_from));
```

**문제점**: 
- `groupPolicy`가 채널 레벨에만 설정됨
- 계정 레벨 (`accounts.default.groupPolicy`)에도 설정해야 일관성 있음

**수정 필요**:
```rust
// 둘 다 설정하거나, 계정 레벨만 설정
set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupPolicy"], json!(group_policy));
```

---

### 4. Slack ✅

**OpenClaw 스키마** (`types.slack.ts:112`):
```typescript
groupPolicy?: GroupPolicy;
// ⚠️ groupAllowFrom 없음 - channels.<id> 사용
```

**moldClaw 구현**:
```rust
set_nested_value(&mut config, &["channels", "slack", "groupPolicy"], json!(group_policy));
for channel_id in group_allow_from {
    set_nested_value(&mut config, &["channels", "slack", "channels", channel_id, "enabled"], json!(true));
}
```

**결과**: ✅ 정합성 일치 (Slack은 channels.<id> 구조 사용)

---

### 5. Google Chat ✅

**OpenClaw 스키마** (`types.googlechat.ts:54-56`):
```typescript
groupPolicy?: GroupPolicy;
groupAllowFrom?: Array<string | number>;
```

**moldClaw 구현**:
```rust
set_nested_value(&mut config, &["channels", "googlechat", "groupPolicy"], json!(group_policy));
set_nested_value(&mut config, &["channels", "googlechat", "groupAllowFrom"], json!(group_allow_from));
```

**결과**: ✅ 정합성 일치

---

### 6. Mattermost ⚠️ 플러그인

**OpenClaw 스키마**: 없음 (Mattermost는 공식 채널이 아님 - 플러그인)

**moldClaw 구현**:
```rust
set_nested_value(&mut config, &["channels", "mattermost", "groupPolicy"], json!(group_policy));
set_nested_value(&mut config, &["channels", "mattermost", "groupAllowFrom"], json!(group_allow_from));
```

**결과**: ⚠️ 플러그인 스키마 미확인 - 일반적인 패턴 따름

---

## 수정 필요 사항

### P1: WhatsApp groupPolicy 경로 수정

**현재**:
```rust
set_nested_value(&mut config, &["channels", "whatsapp", "groupPolicy"], json!(group_policy));
```

**수정**:
```rust
// 계정 레벨에 설정 (multi-account 구조와 일관성)
set_nested_value(&mut config, &["channels", "whatsapp", "accounts", "default", "groupPolicy"], json!(group_policy));
```

---

## GroupPolicy 유효값 확인

**OpenClaw 스키마** (`types.base.ts`):
```typescript
export type GroupPolicy = "open" | "disabled" | "allowlist";
```

**moldClaw 프론트엔드**:
```tsx
<option value="allowlist">허용 목록만 (안전)</option>
<option value="open">모두 허용 ⚠️</option>
<option value="disabled">비활성화</option>
```

**결과**: ✅ 유효값 일치

---

## 결론

1. **즉시 수정**: WhatsApp `groupPolicy` 경로를 계정 레벨로 변경
2. **확인 완료**: Telegram, Discord, Slack, Google Chat - 스키마 정합성 OK
3. **미확인**: Mattermost는 플러그인이라 공식 스키마 없음
