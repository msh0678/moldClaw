# OpenClaw Config 공식 형식 명세서

> moldClaw가 생성하는 config는 이 문서의 형식을 **반드시** 준수해야 합니다.
> 출처: OpenClaw 소스코드 분석 (2026.2.10 기준)

## 1. 파일 위치

- **Config 파일**: `~/.openclaw/openclaw.json` (JSON5 형식, comments 허용)
- **Device Identity**: `~/.openclaw/identity/device.json`
- **Workspace**: `~/.openclaw/workspace/` (기본값)

## 2. Config 구조 (openclaw.json)

### 2.1 필수 필드

```json5
{
  // 메타데이터 (OpenClaw이 자동 관리)
  "meta": {
    "lastTouchedVersion": "2026.2.10",     // OpenClaw 버전
    "lastTouchedAt": "2026-02-20T12:00:00.000Z"  // ISO 8601 형식
  },

  // 마법사(온보딩) 정보
  "wizard": {
    "lastRunAt": "2026-02-20T12:00:00.000Z",
    "lastRunVersion": "2026.2.10",
    "lastRunCommand": "onboard",  // "onboard" | "configure"
    "lastRunMode": "local"        // "local" | "remote"
  },

  // Gateway 설정 (필수!)
  "gateway": {
    "mode": "local",              // 필수: "local" (로컬 실행 모드)
    "port": 18789,                // 기본값: 18789
    "bind": "loopback",           // "loopback" | "lan" | "auto" | "custom" | "tailnet"
    "auth": {
      "mode": "token",            // "token" | "password"
      "token": "<random-token>"   // token 모드일 때 필수
      // "password": "..."        // password 모드일 때 필수
    }
  },

  // 에이전트 기본 설정
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace"  // 워크스페이스 경로
    }
  }
}
```

### 2.2 선택적 필드

```json5
{
  // 인증 프로필 (API 키 사용 시)
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "token"
      }
    }
  },

  // 모델 프로바이더 설정
  "models": {
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "sk-ant-...",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "claude-sonnet-4-20250514",
            "name": "Claude Sonnet 4",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },

  // 채널 설정 (메신저)
  "channels": {
    "telegram": {
      "botToken": "...",
      "dmPolicy": "pairing",      // "pairing" | "allowlist" | "open" | "disabled"
      "allowFrom": [],            // 허용된 사용자 ID 목록
      "groupPolicy": "allowlist", // "allowlist" | "open" | "disabled"
      "groups": {
        "*": {
          "requireMention": true  // 그룹에서 멘션 필요 여부
        }
      }
    },
    "discord": {
      "botToken": "...",
      "guilds": {}                // 서버별 설정
    }
  },

  // 위험한 노드 명령어 거부 목록 (신규 설치 시 기본값)
  // Gateway가 자동 추가하지만, moldClaw에서 명시적으로 설정하는 것이 안전
  "gateway": {
    "nodes": {
      "denyCommands": [
        "camera.snap",
        "camera.clip",
        "screen.record",
        "calendar.add",
        "contacts.add",
        "reminders.add"
      ]
    }
  }
}
```

## 3. 기본값 정리

| 필드 | 기본값 | 비고 |
|------|--------|------|
| `gateway.port` | `18789` | DEFAULT_GATEWAY_PORT |
| `gateway.bind` | `"loopback"` | 보안상 기본값 |
| `gateway.mode` | `"local"` | **필수 설정** |
| `gateway.auth.mode` | `"token"` | 권장 |
| `agents.defaults.workspace` | `"~/.openclaw/workspace"` | DEFAULT_AGENT_WORKSPACE_DIR |
| `channels.*.dmPolicy` | `"pairing"` | 보안상 기본값 |
| `channels.*.groupPolicy` | `"allowlist"` | 보안상 기본값 |
| `channels.*.groups.*.requireMention` | `true` | 스팸 방지 |

## 4. 주의사항

### 4.1 필수 설정 누락 시 발생하는 문제

| 누락된 필드 | 문제 |
|-------------|------|
| `gateway.mode` | Gateway 시작 거부: "Gateway start blocked: set gateway.mode=local" |
| `gateway.auth.token` (token 모드) | CLI 연결 시 인증 실패 |
| `agents.defaults.workspace` | 워크스페이스 생성 실패 |

### 4.2 빈 값 허용 여부

| 필드 | 빈 문자열 허용 | 비고 |
|------|---------------|------|
| `gateway.auth.token` | ❌ | 비어있으면 생성해야 함 |
| `gateway.auth.password` | ❌ | password 모드에서 필수 |
| `channels.*.botToken` | ❌ | 설정 시 반드시 값 필요 |
| `channels.*.allowFrom` | ✅ | 빈 배열 허용 |

### 4.3 설정 수정 시 주의

기존 config가 있을 때 수정하는 경우:
1. **기존 값 보존**: 변경하지 않는 필드는 그대로 유지
2. **meta 업데이트**: `lastTouchedAt`, `lastTouchedVersion` 갱신
3. **wizard 업데이트**: 온보딩/설정 정보 갱신
4. **깊은 병합**: 중첩 객체는 덮어쓰기 아닌 병합

```javascript
// 올바른 병합 예시
newConfig = {
  ...existingConfig,
  gateway: {
    ...existingConfig.gateway,
    port: newPort,  // 이것만 변경
    auth: {
      ...existingConfig.gateway?.auth,
      token: newToken  // 이것만 변경
    }
  }
}
```

## 5. 토큰 생성 규칙

Gateway 토큰은 OpenClaw의 `randomToken()` 함수와 동일한 방식으로 생성:

```javascript
// OpenClaw의 토큰 생성 방식 (Node.js)
import crypto from 'node:crypto';
const token = crypto.randomBytes(32).toString('base64url');

// 결과 예시: "dGhpcyBpcyBhIHRlc3QgdG9rZW4..."
```

**Rust 구현:**
```rust
use rand::Rng;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

fn generate_gateway_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}
```

## 6. 버전 정보

moldClaw가 config를 생성할 때 사용할 버전:
- `meta.lastTouchedVersion`: moldClaw가 알고 있는 OpenClaw 버전 (예: "2026.2.10")
- `wizard.lastRunVersion`: 동일
- `wizard.lastRunCommand`: "onboard" (초기 설정) 또는 "configure" (수정)

---

*이 문서는 OpenClaw 2026.2.10 소스코드를 기반으로 작성되었습니다.*
*최종 업데이트: 2026-02-20*
