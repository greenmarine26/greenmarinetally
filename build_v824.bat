@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  Tallyman 검수앱 V8.24 빌드 (수집기 신호 카드)
echo ============================================
where bash >nul 2>nul
if %errorlevel%==0 (
  bash build.sh
) else (
  if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" build.sh
  ) else (
    if exist "C:\Program Files\Git\usr\bin\bash.exe" (
      "C:\Program Files\Git\usr\bin\bash.exe" build.sh
    ) else (
      echo [오류] bash를 못 찾았습니다. git-bash 또는 WSL에서 "bash build.sh"를 직접 실행하세요.
    )
  )
)
echo.
echo ============================================
echo  빌드 종료. 위에 "APP_VERSION (V8.24) ... 박힘" 과
echo  "ZIP 패키징 가능 상태" 가 보이면 성공입니다.
echo  이후: git add -A  ^&^&  git commit -m "V8.24 수집기 신호 카드"  ^&^&  git push
echo ============================================
pause
