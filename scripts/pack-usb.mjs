/**
 * Assemble a USB-ready folder under dist-usb/:
 *   FastCourt.bat  — double-click launcher (needs Node.js on PATH, or .\node\node.exe)
 *   app/           — Next.js standalone server + static assets
 *   README-USB.txt
 *
 * Usage: npm run build && npm run portable:usb
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist-usb");
const appDir = join(outDir, "app");
const standaloneRoot = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");

function fail(message) {
  console.error(`[portable:usb] ${message}`);
  process.exit(1);
}

/** Next may put server.js at standalone/ or standalone/<pkg>/ */
function resolveStandaloneDir() {
  const direct = join(standaloneRoot, "server.js");
  if (existsSync(direct)) return standaloneRoot;
  if (!existsSync(standaloneRoot)) return null;
  for (const name of readdirSync(standaloneRoot)) {
    const nested = join(standaloneRoot, name);
    try {
      if (statSync(nested).isDirectory() && existsSync(join(nested, "server.js"))) {
        return nested;
      }
    } catch {
      // skip
    }
  }
  return null;
}

const standaloneDir = resolveStandaloneDir();
if (!standaloneDir) {
  fail("Missing .next/standalone/server.js — run `npm run build` first.");
}
if (!existsSync(staticDir)) {
  fail("Missing .next/static — run `npm run build` first.");
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });

console.log(`[portable:usb] Copying standalone from ${standaloneDir}…`);
cpSync(standaloneDir, appDir, { recursive: true });

console.log("[portable:usb] Copying static assets…");
mkdirSync(join(appDir, ".next"), { recursive: true });
cpSync(staticDir, join(appDir, ".next", "static"), { recursive: true });

if (existsSync(publicDir)) {
  console.log("[portable:usb] Copying public/…");
  cpSync(publicDir, join(appDir, "public"), { recursive: true });
}

const launcherBat = `@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1
title FastCourt (USB)

set "PORT=3911"
set "HOSTNAME=127.0.0.1"
set "NODE_EXE="

if exist "%~dp0node\\node.exe" set "NODE_EXE=%~dp0node\\node.exe"
if not defined NODE_EXE (
  where node >nul 2>&1
  if errorlevel 1 (
    echo [FastCourt] Node.js not found.
    echo.
    echo Option A: Install Node.js LTS from https://nodejs.org
    echo Option B: Copy a portable Node.js into:
    echo   %~dp0node\\
    echo   so that node.exe is at %~dp0node\\node.exe
    echo.
    echo Or use the Electron portable EXE from: npm run portable:electron
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)

if not exist "%~dp0app\\server.js" (
  echo [FastCourt] Missing app\\server.js — rebuild with npm run portable:usb
  pause
  exit /b 1
)

echo [FastCourt] Starting local server on http://127.0.0.1:%PORT% ...
echo [FastCourt] Close this window to stop the app.
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:%PORT%/library"

cd /d "%~dp0app"
"%NODE_EXE%" server.js
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [FastCourt] Server exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
`;

writeFileSync(join(outDir, "FastCourt.bat"), launcherBat, "utf8");

const readme = `FastCourt — USB portable package
================================

Contents
--------
  FastCourt.bat   Double-click to start (opens browser)
  app/            Application server (do not edit)
  node/           Optional: place portable node.exe here

Requirements
------------
  Windows PC with either:
  - Node.js on PATH, or
  - Portable Node copied to:  node\\node.exe

  Tip: for a single .exe with no Node install, build:
    npm run portable:electron
  then copy dist-electron\\FastCourt-*-portable.exe to the USB stick.

Usage
-----
  1. Copy this whole folder to a USB stick
  2. Double-click FastCourt.bat
  3. Browser opens at http://127.0.0.1:3911/library
  4. Close the console window to stop

Notes
-----
  - Works offline in local-only mode (plays stored in the browser/device).
  - Cloud login / Stripe / AI need internet + env keys from a normal deploy.
  - Do not remove the app\\ folder.
`;

writeFileSync(join(outDir, "README-USB.txt"), readme, "utf8");

console.log(`[portable:usb] Ready: ${outDir}`);
console.log("[portable:usb] Copy dist-usb\\ to a USB stick and run FastCourt.bat");
console.log(
  "[portable:usb] For a single EXE (no Node on target PC): npm run portable:electron",
);
