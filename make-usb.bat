@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1

set "MODE=%~1"
if "%MODE%"=="" set "MODE=folder"
if /I "%MODE%"=="usb" set "MODE=folder"
if /I "%MODE%"=="exe" set "MODE=electron"
if /I "%MODE%"=="all" set "MODE=all"

if /I "%MODE%"=="help" goto :HELP
if /I "%MODE%"=="-h" goto :HELP
if /I not "%MODE%"=="folder" if /I not "%MODE%"=="electron" if /I not "%MODE%"=="all" goto :HELP

echo ========================================
echo   FastCourt — USB / Portable build
echo ========================================
echo.

echo [1/3] Production build (standalone)…
call npm run build
if errorlevel 1 (
  echo [FastCourt] Build failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Packing USB folder (dist-usb)…
call npm run portable:usb
if errorlevel 1 (
  echo [FastCourt] USB pack failed.
  pause
  exit /b 1
)

if /I "%MODE%"=="folder" goto :DONE_FOLDER

echo.
echo [3/3] Packing Electron portable EXE…
call npx electron-builder --win portable
if errorlevel 1 (
  echo [FastCourt] Electron pack failed.
  pause
  exit /b 1
)

if /I "%MODE%"=="electron" goto :DONE_EXE
goto :DONE_ALL

:DONE_FOLDER
echo.
echo ΕΤΟΙΜΟ — φάκελος USB:
echo   %~dp0dist-usb
echo.
echo Αντέγραψε ΟΛΟ το dist-usb στο USB stick.
echo Στο stick τρέξε: FastCourt.bat
echo.
echo (Για EXE χωρίς Node: make-usb.bat exe)
echo.
pause
exit /b 0

:DONE_EXE
echo.
echo ΕΤΟΙΜΟ — portable EXE:
echo   %~dp0dist-electron
echo.
echo Αντέγραψε το FastCourt-*-portable.exe στο USB stick.
echo Διπλό κλικ στο EXE (δεν χρειάζεται Node στο PC).
echo.
pause
exit /b 0

:DONE_ALL
echo.
echo ΕΤΟΙΜΟ — και τα δύο:
echo   Φάκελος: %~dp0dist-usb
echo   EXE:     %~dp0dist-electron
echo.
echo USB με FastCourt.bat  ή  USB με FastCourt-*-portable.exe
echo.
pause
exit /b 0

:HELP
echo Usage:
echo   make-usb.bat           Φάκελος dist-usb (FastCourt.bat^)
echo   make-usb.bat folder    Ίδιο με πάνω
echo   make-usb.bat exe       Portable EXE (χωρίς Node στο PC^)
echo   make-usb.bat all       Και φάκελος και EXE
echo.
pause
exit /b 0
