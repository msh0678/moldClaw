# Windows 디버깅 가이드

## 1. 설치된 파일 구조 확인

```powershell
# moldClaw가 설치된 경로 찾기
$installPath = Get-ChildItem "C:\Program Files\moldClaw", "C:\Program Files (x86)\moldClaw", "$env:LOCALAPPDATA\Programs\moldClaw" -ErrorAction SilentlyContinue | Select-Object -First 1

# 리소스 폴더 확인
Get-ChildItem -Path $installPath -Recurse | Where-Object {$_.Name -eq "node-portable" -or $_.Name -eq "resources"}
```

## 2. 콘솔 로그 확인

moldClaw를 명령 프롬프트에서 실행:
```cmd
# 설치 경로로 이동
cd "C:\Program Files\moldClaw"

# 콘솔에서 실행 (오류 메시지 보기)
moldClaw.exe
```

## 3. 임시 해결책 (테스트용)

```powershell
# AppData에 수동으로 node-portable 복사
$appData = "$env:LOCALAPPDATA\moldClaw"
New-Item -Path "$appData\resources" -ItemType Directory -Force
Copy-Item -Path "src-tauri\resources\node-portable" -Destination "$appData\resources\" -Recurse
```

## 4. 번들링 확인

빌드 시 콘솔 출력에서:
```
Info Target: x64
Bundling resources...
```

이런 메시지가 나오는지 확인

## 5. 대안: 시스템 Node.js 사용

임시로 시스템 Node.js를 사용하도록 수정:
```rust
// 시스템 Node.js 폴백
if !self.bundled_node.exists() {
    // Windows PATH에서 node.exe 찾기
    match std::process::Command::new("where")
        .arg("node")
        .output()
    {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim();
            // 시스템 node 사용
        }
    }
}
```