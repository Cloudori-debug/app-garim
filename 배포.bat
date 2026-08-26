@echo off
chcp 65001 >nul
title 가림 암기노트 [배포]
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [오류] Node.js가 설치되어 있지 않습니다.
  echo https://nodejs.org 에서 LTS를 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   아이패드용 사이트에 올리기
echo   주소: https://app-garim.pages.dev
echo ============================================
echo.

call npm run deploy
if errorlevel 1 (
  echo.
  echo 배포에 실패했습니다. 위 메시지를 확인하세요.
  echo 처음이면 브라우저에서 Cloudflare 로그인이 필요할 수 있습니다.
  echo.
  pause
  exit /b 1
)

echo.
echo 배포가 끝났습니다. 아이패드 Safari에서
echo https://app-garim.pages.dev
echo 를 연 뒤 새로고침하세요.
echo.
pause
