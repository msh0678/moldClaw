# Windows에서 리소스 디렉토리 디버깅

## 문제 가능성

1. **리소스 경로 문제**
   - 설치된 앱에서 `resource_dir()`가 잘못된 경로 반환
   - Windows에서 경로 구분자 문제 (`/` vs `\`)

2. **번들링 문제**
   - `resources/**/*` 패턴이 제대로 작동하지 않음
   - node-portable 폴더가 실제로 번들에 포함되지 않음

3. **권한 문제**
   - 설치된 경로에서 파일 접근 권한 없음

## 디버깅 코드 추가

OpenClawManager에 로깅 추가:

```rust
pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("리소스 디렉토리 오류: {}", e))?;
    
    // 디버깅: 실제 경로 출력
    println!("Resource dir: {:?}", resource_dir);
    
    let node_dir = resource_dir.join("node-portable");
    println!("Node dir: {:?}", node_dir);
    
    let bundled_node = if cfg!(windows) {
        node_dir.join("node.exe")
    } else {
        node_dir.join("bin/node")
    };
    
    println!("Node exe path: {:?}", bundled_node);
    println!("Node exe exists: {}", bundled_node.exists());
}
```

## Windows에서 확인할 사항

1. **설치 경로 확인**
   ```powershell
   # 일반적인 설치 경로
   C:\Program Files\moldClaw\
   C:\Users\%USERNAME%\AppData\Local\Programs\moldClaw\
   ```

2. **리소스 폴더 존재 여부**
   ```powershell
   # 설치 경로에서
   Get-ChildItem -Recurse | Where-Object {$_.Name -like "*node-portable*"}
   ```

3. **MSI 내용 확인**
   ```powershell
   # MSI 파일 내용 보기 (7-Zip 필요)
   7z l moldClaw_0.1.0_x64_en-US.msi | Select-String "node-portable"
   ```