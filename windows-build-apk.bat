@echo off
REM ============================================================
REM  Portfolio Tracker - BUILD THE ANDROID APP (APK)
REM  Run this ONCE to build an installable app for your phone.
REM  It builds in Expo's free cloud - your PC just kicks it off.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Building your Portfolio Tracker Android app
echo ============================================================
echo   You'll need a FREE Expo account. If you don't have one,
echo   the login step lets you sign up at expo.dev first.
echo ============================================================
echo.

REM ---- Check Node ----
node --version >nul 2>&1
if errorlevel 1 (
    echo   XX  Node.js was not found. Install it from https://nodejs.org/
    echo       Click the green "Get Node.js" button, install, then run this again.
    pause
    exit /b 1
)

cd mobile

echo [1/3] Installing app files. This can take a few minutes...
call npm install
if errorlevel 1 (
    echo   XX  Could not install app files. Check your internet and try again.
    pause
    exit /b 1
)
echo.

echo [2/3] Signing in to Expo. Follow the prompts to log in or sign up...
call npx eas-cli@latest login
if errorlevel 1 (
    echo   XX  Login did not complete. Run this file again to retry.
    pause
    exit /b 1
)
echo.

echo [3/3] Building the APK in the cloud.
echo   Answer YES to any questions it asks about creating a project or keystore.
echo   When it finishes it prints a link to download your APK.
call npx eas-cli@latest build -p android --profile preview
echo.

echo ============================================================
echo   When the build finishes, open the link it printed above,
echo   then open that link ON YOUR PHONE to download and install
echo   the app. You may need to allow "install unknown apps".
echo ============================================================
pause
