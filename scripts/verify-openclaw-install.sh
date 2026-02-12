#!/bin/bash
# OpenClaw 설치 검증 스크립트

echo "=== OpenClaw 설치 검증 ==="
echo

# 테스트할 설치 경로들
TEST_PATHS=(
    "$HOME/.local/share/moldClaw/openclaw"
    "$HOME/AppData/Local/moldClaw/openclaw"
    "/tmp/test install path/openclaw"
    "$HOME/테스트 한글/moldClaw/openclaw"
)

for INSTALL_DIR in "${TEST_PATHS[@]}"; do
    echo "테스트 경로: $INSTALL_DIR"
    
    # 1. 디렉토리 생성 가능한지
    if mkdir -p "$INSTALL_DIR/.test" 2>/dev/null; then
        echo "  ✓ 디렉토리 생성 가능"
        rmdir "$INSTALL_DIR/.test"
    else
        echo "  ✗ 디렉토리 생성 불가 (권한 문제?)"
    fi
    
    # 2. npm prefix로 설치 시뮬레이션
    if [ -n "$NODE_PORTABLE_PATH" ]; then
        NPM_CMD="$NODE_PORTABLE_PATH/npm"
        
        echo "  npm 명령 테스트:"
        echo "  $NPM_CMD install openclaw --prefix \"$INSTALL_DIR\" --dry-run"
        
        # 실제로는 --dry-run으로 테스트
        if "$NPM_CMD" install openclaw --prefix "$INSTALL_DIR" --dry-run 2>&1 | grep -q "error"; then
            echo "  ✗ npm 설치 실패할 가능성"
        else
            echo "  ✓ npm 설치 가능"
        fi
    fi
    
    echo
done

echo "=== 권장사항 ==="
echo "1. 설치 경로에 공백이나 한글이 있어도 작동해야 합니다"
echo "2. npm cache는 설치 디렉토리 내부에 생성되어야 합니다"
echo "3. Windows에서는 .cmd 파일이 생성되는지 확인하세요"
echo "4. Unix에서는 실행 권한(755)이 자동 설정되어야 합니다"