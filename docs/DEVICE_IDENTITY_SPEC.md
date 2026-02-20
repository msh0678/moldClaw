# OpenClaw Device Identity 공식 형식 명세서

> moldClaw가 생성하는 device.json은 이 문서의 형식을 **반드시** 준수해야 합니다.
> 출처: OpenClaw 소스코드 `src/infra/device-identity.ts` (2026.2.10 기준)

## 1. 파일 위치

- **Device Identity**: `~/.openclaw/identity/device.json`
- **권한**: `0o600` (소유자만 읽기/쓰기)

## 2. Device Identity 구조

```json
{
  "version": 1,
  "deviceId": "<sha256-hash-of-public-key>",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n",
  "privateKeyPem": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "createdAtMs": 1234567890123
}
```

## 3. 필드 상세 설명

### 3.1 version
- **타입**: `number`
- **값**: `1` (현재 유일한 버전)
- **용도**: 향후 스키마 변경 시 마이그레이션 지원

### 3.2 deviceId
- **타입**: `string`
- **형식**: 64자 hex 문자열 (SHA-256 해시)
- **생성 방법**: publicKeyPem의 raw bytes → SHA-256 해시 → hex 인코딩
- **용도**: 장치 고유 식별자

```javascript
// OpenClaw의 deviceId 생성 로직
function fingerprintPublicKey(publicKeyPem) {
  const raw = derivePublicKeyRaw(publicKeyPem);
  return crypto.createHash("sha256").update(raw).digest("hex");
}
```

### 3.3 publicKeyPem
- **타입**: `string`
- **형식**: PEM 인코딩된 Ed25519 공개키
- **예시**:
```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAK6yctJl9JhPttX9N90o6ePWgoXvl8BHT8b4b5M+jEtc=
-----END PUBLIC KEY-----
```

### 3.4 privateKeyPem
- **타입**: `string`
- **형식**: PEM 인코딩된 Ed25519 개인키 (PKCS#8)
- **예시**:
```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIFzAivRqweh+FfLqeU7gQplgzMb+B+OvAACIsK1eGn63
-----END PRIVATE KEY-----
```

### 3.5 createdAtMs
- **타입**: `number`
- **형식**: Unix timestamp (밀리초)
- **예시**: `1708425600000` (2026-02-20 12:00:00.000 UTC)

## 4. 키 생성 알고리즘

### 4.1 OpenClaw 원본 (Node.js)

```javascript
import crypto from "node:crypto";

function generateIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const deviceId = fingerprintPublicKey(publicKeyPem);
  return { deviceId, publicKeyPem, privateKeyPem };
}
```

### 4.2 Rust 구현 (moldClaw용)

```rust
use ed25519_dalek::{SigningKey, VerifyingKey};
use rand::rngs::OsRng;
use sha2::{Sha256, Digest};
use base64::{engine::general_purpose::STANDARD, Engine};

/// Ed25519 SPKI prefix (RFC 8410)
const ED25519_SPKI_PREFIX: [u8; 12] = [
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
];

/// Ed25519 PKCS#8 prefix
const ED25519_PKCS8_PREFIX: [u8; 16] = [
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20
];

pub struct DeviceIdentity {
    pub device_id: String,
    pub public_key_pem: String,
    pub private_key_pem: String,
    pub created_at_ms: u64,
}

pub fn generate_device_identity() -> DeviceIdentity {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();
    
    // Public key를 SPKI 형식으로 인코딩
    let public_bytes = verifying_key.as_bytes();
    let mut spki = Vec::with_capacity(ED25519_SPKI_PREFIX.len() + 32);
    spki.extend_from_slice(&ED25519_SPKI_PREFIX);
    spki.extend_from_slice(public_bytes);
    let public_key_pem = format!(
        "-----BEGIN PUBLIC KEY-----\n{}\n-----END PUBLIC KEY-----\n",
        STANDARD.encode(&spki)
    );
    
    // Private key를 PKCS#8 형식으로 인코딩
    let private_bytes = signing_key.as_bytes();
    let mut pkcs8 = Vec::with_capacity(ED25519_PKCS8_PREFIX.len() + 32);
    pkcs8.extend_from_slice(&ED25519_PKCS8_PREFIX);
    pkcs8.extend_from_slice(private_bytes);
    let private_key_pem = format!(
        "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----\n",
        STANDARD.encode(&pkcs8)
    );
    
    // deviceId = SHA256(raw public key bytes)
    let mut hasher = Sha256::new();
    hasher.update(public_bytes);
    let device_id = hex::encode(hasher.finalize());
    
    let created_at_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    DeviceIdentity {
        device_id,
        public_key_pem,
        private_key_pem,
        created_at_ms,
    }
}
```

## 5. 주의사항

### 5.1 키 생성 시점
- **한 번만 생성**: 최초 설정 시 생성 후 유지
- **절대 재생성 금지**: deviceId가 바뀌면 Gateway가 새 장치로 인식 → pairing 문제 발생

### 5.2 파일 권한
- **필수**: `0o600` (소유자만 읽기/쓰기)
- 보안상 중요: 개인키가 포함되어 있음

### 5.3 디렉토리 생성
- `~/.openclaw/identity/` 디렉토리가 없으면 먼저 생성
- 디렉토리 권한: `0o700` 권장

### 5.4 기존 파일 처리
- 기존 device.json이 있으면 **절대 덮어쓰지 않음**
- 기존 파일 검증:
  - `version === 1` 확인
  - `deviceId`, `publicKeyPem`, `privateKeyPem` 필드 존재 확인
  - deviceId가 publicKeyPem에서 유도된 값과 일치하는지 확인

### 5.5 OpenClaw의 자동 복구 동작
```javascript
// OpenClaw은 deviceId 불일치 시 자동 수정
const derivedId = fingerprintPublicKey(parsed.publicKeyPem);
if (derivedId && derivedId !== parsed.deviceId) {
  // deviceId를 올바른 값으로 수정
  const updated = { ...parsed, deviceId: derivedId };
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
}
```

moldClaw도 동일한 검증 로직을 구현해야 합니다.

## 6. 검증 체크리스트

device.json 생성 전 확인 사항:

- [ ] `~/.openclaw/identity/` 디렉토리 존재 확인 (없으면 생성)
- [ ] 기존 device.json 존재 여부 확인
- [ ] 기존 파일이 있으면 읽어서 유효성 검증
- [ ] 유효한 기존 파일이 있으면 재사용 (생성하지 않음)
- [ ] 새로 생성 시 Ed25519 키 쌍 생성
- [ ] deviceId가 publicKeyPem에서 올바르게 유도되었는지 확인
- [ ] 파일 권한 0o600 설정

---

*이 문서는 OpenClaw 2026.2.10 소스코드 `src/infra/device-identity.ts`를 기반으로 작성되었습니다.*
*최종 업데이트: 2026-02-20*
