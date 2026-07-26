@echo off
chcp 65001 >nul
title 암기노트 [실행]
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [오류] Node.js가 설치되어 있지 않습니다.
  echo.
  echo 1. https://nodejs.org 에 접속
  echo 2. LTS 버전 설치
  echo 3. 이 파일을 다시 더블클릭
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   암기노트 실행
echo   ▶ 브라우저가 자동으로 열립니다
echo   ▶ 종료: 이 검은 창에서 Ctrl+C
echo ============================================
echo.

node scripts\launch.mjs dev
if errorlevel 1 pause
