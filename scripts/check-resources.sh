#!/bin/bash
# moldClaw 리소스 검증 스크립트

echo "=== moldClaw 리소스 검증 ==="
echo

# 1. 소스 리소스 확인
echo "1. 소스 리소스 확인:"
RESOURCE_DIR="src-tauri/resources/node-portable"
if [ -d "$RESOURCE_DIR" ]; then
    echo "   ✓ $RESOURCE_DIR 존재"
    
    # Node.js 실행파일 확인
    if [ -f "$RESOURCE_DIR/node.exe" ]; then
        echo "   ✓ Windows node.exe 존재"
    else
        echo "   ✗ Windows node.exe 없음!"
    fi
    
    if [ -f "$RESOURCE_DIR/bin/node" ]; then
        echo "   ✓ Linux/macOS bin/node 존재"
    else
        echo "   ✗ Linux/macOS bin/node 없음!"
    fi
else
    echo "   ✗ 리소스 디렉토리 없음!"
fi

echo

# 2. 빌드 후 확인 (Linux)
echo "2. 빌드된 패키지 확인:"
for pkg in src-tauri/target/release/bundle/appimage/*.AppImage \
           src-tauri/target/release/bundle/deb/*.deb; do
    if [ -f "$pkg" ]; then
        echo "   패키지: $(basename "$pkg")"
        
        # AppImage 내용 확인
        if [[ "$pkg" == *.AppImage ]]; then
            # AppImage를 임시로 마운트
            TEMP_MOUNT=$(mktemp -d)
            "$pkg" --appimage-mount &
            MOUNT_PID=$!
            sleep 2
            
            # 마운트 경로 찾기
            MOUNT_PATH=$(ls -d /tmp/.mount_moldClaw* 2>/dev/null | head -1)
            if [ -n "$MOUNT_PATH" ]; then
                echo "   마운트됨: $MOUNT_PATH"
                find "$MOUNT_PATH" -name "node-portable" -type d | head -5
            fi
            
            kill $MOUNT_PID 2>/dev/null
        fi
        
        # DEB 내용 확인
        if [[ "$pkg" == *.deb ]]; then
            echo "   DEB 내용:"
            dpkg -c "$pkg" | grep node-portable | head -5
        fi
    fi
done

echo
echo "=== 권장사항 ==="
echo "1. Node.js Portable이 없다면:"
echo "   - Windows: https://nodejs.org/dist/v22.22.0/node-v22.22.0-win-x64.zip"
echo "   - Linux: https://nodejs.org/dist/v22.22.0/node-v22.22.0-linux-x64.tar.xz"
echo "   다운로드 후 src-tauri/resources/node-portable/에 압축 해제"
echo
echo "2. 빌드 전 확인:"
echo "   - src-tauri/tauri.conf.json의 bundle.resources 설정"
echo "   - 실행 권한: chmod +x src-tauri/resources/node-portable/bin/node"