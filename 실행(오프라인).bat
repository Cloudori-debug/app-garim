@echo off
chcp 65001 >nul
title 암기노트 [오프라인]
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [오류] Node.js가 설치되어 있지 않습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   암기노트 (오프라인 빌드 실행)
echo   ▶ 처음이면 빌드에 시간이 걸릴 수 있습니다
echo   ▶ 종료: 이 창에서 Ctrl+C
echo ============================================
echo.

node scripts\launch.mjs preview
if errorlevel 1 pause
