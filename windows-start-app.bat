@echo off
REM ============================================================
REM  Portfolio Tracker - START THE APP (Windows)
REM  Double-click this AFTER starting the price engine.
REM  A QR code will appear - scan it with Expo Go on your phone.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "mobile\node_modules" (
    echo.
    echo   XX  It looks like setup hasn't been run yet.
    echo   Please double-click  windows-setup.bat  first.
    echo.
    pause
    exit /b 1
)

REM ---- Find this computer's Wi-Fi address so the phone can connect ----
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

if defined IP (
    set "EXPO_PUBLIC_API_URL=http://!IP!:8123"
) else (
    set "EXPO_PUBLIC_API_URL=http://localhost:8123"
)

echo.
echo ============================================================
echo   Starting the app...
echo   It will connect to the price engine at: !EXPO_PUBLIC_API_URL!
echo.
echo   In a moment a QR CODE will appear below.
echo   Open the "Expo Go" app on your phone and scan it.
echo   Your phone and this computer must be on the SAME Wi-Fi.
echo ============================================================
echo.

cd mobile
call npx expo start
pause
