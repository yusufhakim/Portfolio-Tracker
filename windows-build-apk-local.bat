@echo off
REM ============================================================
REM  Portfolio Tracker - Build the APK on THIS computer
REM  Uses the Java + Android SDK that ship with Android Studio,
REM  so it works even if your system Java is too new for Gradle.
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

REM ---- Prefer a real JDK 17/21 (Android Studio stores downloaded JDKs here) ----
REM  Gradle needs Java 17-24; some machines ship Java 25, which is too new.
set "JBR="
for /d %%D in ("%USERPROFILE%\.jdks\*17*") do if not defined JBR if exist "%%~fD\bin\java.exe" set "JBR=%%~fD"
if not defined JBR for /d %%D in ("%USERPROFILE%\.jdks\*21*") do if not defined JBR if exist "%%~fD\bin\java.exe" set "JBR=%%~fD"
if not defined JBR for /d %%D in ("%USERPROFILE%\.jdks\*jdk-17*") do if not defined JBR if exist "%%~fD\bin\java.exe" set "JBR=%%~fD"

REM ---- Otherwise fall back to Android Studio's bundled Java ----
for %%P in (
  "%ProgramFiles%\Android\Android Studio\jbr"
  "%ProgramW6432%\Android\Android Studio\jbr"
  "%ProgramFiles(x86)%\Android\Android Studio\jbr"
  "%LOCALAPPDATA%\Programs\Android Studio\jbr"
) do if not defined JBR if exist "%%~P\bin\java.exe" set "JBR=%%~P"

if not defined JBR (
  for /f "tokens=2,*" %%a in ('reg query "HKLM\SOFTWARE\Android Studio" /v Path 2^>nul ^| findstr /i "REG_SZ"') do (
    if exist "%%b\jbr\bin\java.exe" set "JBR=%%b\jbr"
  )
)
if not defined JBR (
  for /f "tokens=2,*" %%a in ('reg query "HKCU\SOFTWARE\Android Studio" /v Path 2^>nul ^| findstr /i "REG_SZ"') do (
    if exist "%%b\jbr\bin\java.exe" set "JBR=%%b\jbr"
  )
)
if not defined JBR goto :noJava
set "JAVA_HOME=%JBR%"
echo Using Java from Android Studio:  %JBR%

REM ---- Find the Android SDK ----
set "SDK="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools" set "SDK=%LOCALAPPDATA%\Android\Sdk"
if not defined SDK if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools" set "SDK=%ANDROID_HOME%"
if not defined SDK if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools" set "SDK=%ANDROID_SDK_ROOT%"
if not defined SDK goto :noSdk
set "ANDROID_HOME=%SDK%"
set "ANDROID_SDK_ROOT=%SDK%"
echo Using Android SDK:               %SDK%
echo.

cd mobile

echo [1/3] Installing app files. This can take a few minutes...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Generating the Android project...
call npx expo prebuild --platform android --clean
if errorlevel 1 goto :fail

REM Point Gradle at the SDK and at Android Studio's Java (forward slashes).
set "SDKF=!SDK:\=/!"
set "JBRF=!JBR:\=/!"
> android\local.properties echo sdk.dir=!SDKF!
>> android\gradle.properties echo org.gradle.java.home=!JBRF!
REM Build only for modern 64-bit phones (arm64) - much faster, smaller APK.
>> android\gradle.properties echo reactNativeArchitectures=arm64-v8a

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
echo   Put that file on your phone (upload to Google Drive and open it
echo   on the phone, or use a USB cable) and tap it to install.
echo   Allow "install unknown apps" if Android asks.
echo ============================================================
pause
exit /b 0

:noNode
echo   XX  Node.js was not found. Install it from https://nodejs.org/
echo       then run this file again.
pause
exit /b 1

:noJava
echo   XX  Could not find Android Studio's Java automatically.
echo   Easiest fix: build inside Android Studio instead - see
echo   BUILD-APK-WINDOWS.md, the "build inside Android Studio" note.
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
