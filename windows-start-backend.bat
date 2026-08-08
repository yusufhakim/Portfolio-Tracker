@echo off
REM ============================================================
REM  Portfolio Tracker - START THE PRICE ENGINE (Windows)
REM  Double-click this, then leave the window open while you use the app.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\activate.bat" (
    echo.
    echo   XX  It looks like setup hasn't been run yet.
    echo   Please double-click  windows-setup.bat  first.
    echo.
    pause
    exit /b 1
)

REM ---- Find this computer's Wi-Fi address (for your phone) ------------
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "line=%%a"
    set "line=!line: =!"
    echo !line! | findstr /b "192.168." >nul && if not defined IP set "IP=!line!"
)
if not defined IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        set "line=%%a"
        set "line=!line: =!"
        if not defined IP set "IP=!line!"
    )
)

echo.
echo ============================================================
echo   Price engine is starting up...
if defined IP (
echo   Your computer's address is:  !IP!
)
echo.
echo   KEEP THIS WINDOW OPEN while you use the app.
echo   To stop the app later, just close this window.
echo ============================================================
echo.

cd backend
call .venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8123
pause
