# FastCourt Next — full application check (Windows wrapper)
#
# Usage:
#   .\scripts\full-app-check.ps1
#   .\scripts\full-app-check.ps1 -SkipE2e
#   .\scripts\full-app-check.ps1 -JsonOut reports\full-app-check.json

param(
  [switch]$SkipE2e,
  [switch]$SkipBuild,
  [string]$JsonOut = ""
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ErrorActionPreference = "Stop"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error "Node.js is required. Install Node 20+ and retry."
}

$args = @("$Root\scripts\full-app-check.mjs")
if ($SkipE2e) { $args += "--skip-e2e" }
if ($SkipBuild) { $args += "--skip-build" }
if ($JsonOut) { $args += "--json=$JsonOut" }

Push-Location $Root
try {
  & node @args
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
