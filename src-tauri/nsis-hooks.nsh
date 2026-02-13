; NSIS 설치 시 OpenClaw 자동 설치

!macro customInstall
  ; OpenClaw 전역 설치 시도
  DetailPrint "OpenClaw 설치 중..."
  
  ; npm이 설치되어 있는지 확인
  nsExec::ExecToLog '"$SYSDIR\cmd.exe" /C "where npm >nul 2>&1"'
  Pop $0
  
  ${If} $0 == 0
    ; npm이 있으면 OpenClaw 설치
    DetailPrint "npm 발견, OpenClaw 설치 시작..."
    nsExec::ExecToLog '"$SYSDIR\cmd.exe" /C "npm install -g openclaw --no-optional --registry https://registry.npmjs.org"'
    Pop $0
    
    ${If} $0 == 0
      DetailPrint "OpenClaw 설치 성공!"
    ${Else}
      DetailPrint "OpenClaw 자동 설치 실패 (나중에 앱에서 설치됩니다)"
    ${EndIf}
  ${Else}
    DetailPrint "npm이 없음 - OpenClaw는 앱 실행 시 설치됩니다"
  ${EndIf}
!macroend

!macro customUninstall
  ; OpenClaw 제거 (선택적)
  DetailPrint "OpenClaw 제거 중..."
  nsExec::ExecToLog '"$SYSDIR\cmd.exe" /C "npm uninstall -g openclaw 2>nul"'
!macroend