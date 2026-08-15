@echo off
REM ============================================================
REM  Portfolio Tracker - ONE-TIME SETUP (Windows)
REM  Double-click this file ONCE before using the app.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo   Portfolio Tracker - First-time setup
echo ============================================================
echo   This gets your computer ready. It only needs to run once.
echo   It may take a few minutes. Please wait until it says DONE.
echo ============================================================
echo.

REM ---- 1. Find a COMPATIBLE Python (3.11 - 3.13) ----------------------
REM Newer Pythons (3.14/3.15) don't yet have ready-made parts for some
REM building blocks on Windows, so we pick a known-good version if present.
echo [1/4] Looking for a compatible Python (version 3.11, 3.12 or 3.13)...
set "PYCMD="
for %%V in (3.13 3.12 3.11) do (
    if not defined PYCMD (
        py -%%V --version >nul 2>&1 && set "PYCMD=py -%%V"
    )
)
if not defined PYCMD (
    echo.
    echo   XX  No compatible Python version was found.
    echo.
    echo   Your Python may be too new for some parts to install.
    echo   Please install Python 3.13 - it is stable and works perfectly:
    echo     1. Go to  https://www.python.org/downloads/windows/
    echo     2. Under "Stable Releases", find a "Python 3.13.x" entry.
    echo     3. Click its "Windows installer 64-bit" link to download.
    echo     4. Run it, TICK "Add python.exe to PATH", then click Install Now.
    echo     5. After it finishes, run this setup file again.
    echo.
    pause
    exit /b 1
)
echo      OK - using Python via:  %PYCMD%
echo.

REM ---- 2. Check Node.js ------------------------------------------------
echo [2/4] Checking that Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   XX  Node.js was not found on your computer.
    echo.
    echo   Please install it first:
    echo     1. Go to  https://nodejs.org/
    echo     2. Click the green "Get Node.js" button.
    echo     3. Run the file you downloaded and click Next / Next / Install.
    echo     4. After it finishes, run this setup file again.
    echo.
    pause
    exit /b 1
)
echo      OK - Node.js found.
echo.

REM ---- 3. Set up the backend (the "engine") ---------------------------
echo [3/4] Setting up the price engine. This can take a few minutes...
cd backend
if exist ".venv" rmdir /s /q .venv
%PYCMD% -m venv .venv
if errorlevel 1 (
    echo   XX  Could not create the Python environment. See message above.
    pause
    exit /b 1
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo   XX  Could not install the engine parts. Check your internet and try again.
    pause
    exit /b 1
)

REM ---- Ask for the Finnhub API key and write .env --------------------
echo.
echo   Now paste your Finnhub API key for US stock prices.
echo   Tip: right-click in this window to paste, then press Enter.
echo.
set "FINNHUB_KEY="
set /p FINNHUB_KEY=Finnhub API key:

(
    echo FINNHUB_API_KEY=!FINNHUB_KEY!
    echo BASE_CURRENCY=USD
    echo DATABASE_URL=sqlite:///./portfolio.db
    echo DEFAULT_USER_ID=1
    echo CORS_ORIGINS=*
) > .env
echo      OK - Saved your settings.
cd ..
echo.

REM ---- 4. Set up the phone app ----------------------------------------
echo [4/4] Setting up the app. This can take a few minutes...
cd mobile
call npm install
if errorlevel 1 (
    echo   XX  Could not set up the app. Check your internet and try again.
    pause
    exit /b 1
)
cd ..
echo.

echo ============================================================
echo   DONE!  Setup finished successfully.
echo ============================================================
echo   Next time, you only need to:
echo     1. Double-click  windows-start-backend.bat
echo     2. Double-click  windows-start-app.bat
echo     3. Scan the QR code with the Expo Go app on your phone.
echo ============================================================
echo.
pause
