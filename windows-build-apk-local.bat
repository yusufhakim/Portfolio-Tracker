@echo off
REM ============================================================
REM  Portfolio Tracker - Build the APK on THIS computer
REM  Uses the Android SDK that comes with Android Studio.
REM  Produces a standalone, installable app-release.apk.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo   Building Portfolio Tracker on your computer
echo   You need Android Studio installed once first.
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto :noNode

REM ---- Find the Android SDK ----
set "SDK="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools" set "SDK=%LOCALAPPDATA%\Android\Sdk"
if not defined SDK if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools" set "SDK=%ANDROID_HOME%"
if not defined SDK if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools" set "SDK=%ANDROID_SDK_ROOT%"
if not defined SDK goto :noSdk
set "ANDROID_HOME=%SDK%"
set "ANDROID_SDK_ROOT=%SDK%"
echo Using Android SDK:  %SDK%

REM ---- Prefer the Java that ships inside Android Studio ----
set "JBR="
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JBR=%ProgramFiles%\Android\Android Studio\jbr"
if not defined JBR if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" set "JBR=%LOCALAPPDATA%\Programs\Android Studio\jbr"
if defined JBR set "JAVA_HOME=%JBR%"
if defined JAVA_HOME echo Using Java:         %JAVA_HOME%
echo.

cd mobile

echo [1/3] Installing app files. This can take a few minutes...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Generating the Android project...
call npx expo prebuild --platform android --clean
if errorlevel 1 goto :fail

REM Point Gradle at the SDK (forward slashes for local.properties)
set "SDKF=!SDK:\=/!"
> android\local.properties echo sdk.dir=!SDKF!

echo.
echo [3/3] Building the release APK. The FIRST build downloads tools and
echo       can take 10-20 minutes. Later builds are much faster...
cd android
call gradlew.bat assembleRelease
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   SUCCESS!  Your installable app is here:
echo   mobile\android\app\build\outputs\apk\release\app-release.apk
echo.
echo   Copy that file to your phone (email it to yourself, or use a
echo   USB cable) and tap it to install. Allow "install unknown apps"
echo   if Android asks.
echo ============================================================
pause
exit /b 0

:noNode
echo   XX  Node.js was not found. Install it from https://nodejs.org/
echo       then run this file again.
pause
exit /b 1

:noSdk
echo   XX  Could not find the Android SDK.
echo   Open Android Studio once and let it finish its first-time setup,
echo   then run this file again.
pause
exit /b 1

:fail
echo.
echo   XX  A step failed above. Scroll up to the red text, copy the last
echo       20-30 lines, and send them over so I can fix it.
pause
exit /b 1
