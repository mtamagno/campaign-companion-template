@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non e' installato.
  echo Scarica Node.js 24 da https://nodejs.org/ e riprova.
  pause
  exit /b 1
)

node tools\campaign-manager\server.mjs --open
if errorlevel 1 pause
