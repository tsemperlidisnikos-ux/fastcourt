@echo off
setlocal EnableExtensions
cd /d "%~dp0" || (
  echo [FastCourt] Folder not found: %~dp0
  pause
  exit /b 1
)

set "MODE=%~1"
if "%MODE%"=="" set "MODE=dev"
if /I "%MODE%"=="production" set "MODE=prod"

where node >nul 2>&1
if errorlevel 1 (
  echo [FastCourt] Node.js not found in PATH.
  echo Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [FastCourt] npm not found in PATH.
  echo Reinstall Node.js and try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [FastCourt] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [FastCourt] npm install failed.
    pause
    exit /b 1
  )
)

if /I "%MODE%"=="prod" goto :PROD
if /I "%MODE%"=="dev" goto :DEV

echo [FastCourt] Unknown mode "%MODE%". Use: start.bat [dev^|prod]
pause
exit /b 1

:DEV
echo.
echo [FastCourt] Starting development server...
echo [FastCourt] URL: http://localhost:3000
echo [FastCourt] Close this window to stop the app.
echo.
REM Open browser shortly after Next.js starts listening.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000/login/"
call npm run dev
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [FastCourt] Dev server exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%

:PROD
echo.
echo [FastCourt] Starting production server...
if not exist ".next\BUILD_ID" (
  echo [FastCourt] Building application (first run)...
  call npm run build
  if errorlevel 1 (
    echo [FastCourt] Build failed.
    pause
    exit /b 1
  )
)
echo [FastCourt] URL: http://localhost:3000
echo [FastCourt] Close this window to stop the app.
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000/login/"
call npm run start
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [FastCourt] Production server exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
