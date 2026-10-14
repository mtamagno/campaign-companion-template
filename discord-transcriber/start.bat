@echo off
setlocal

cd /d "%~dp0"

set "POWERSHELL_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL_EXE%" (
    echo Windows PowerShell could not be found.
    pause
    exit /b 1
)

"%POWERSHELL_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set "BOT_EXIT_CODE=%ERRORLEVEL%"

if not "%BOT_EXIT_CODE%"=="0" (
    echo.
    echo The bot stopped with exit code %BOT_EXIT_CODE%.
    pause
)

exit /b %BOT_EXIT_CODE%
