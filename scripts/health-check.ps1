# FastCourt Next — health check (Windows wrapper)
#
# Usage:
#   .\scripts\health-check.ps1
#   .\scripts\health-check.ps1 -Lint -Build
#   .\scripts\health-check.ps1 -JsonOut health-check-report.json

param(
  [switch]$Lint,
  [switch]$Build,
  [string]$JsonOut = ""
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ErrorActionPreference = "Stop"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error "Node.js is required. Install Node 20+ and retry."
}

$args = @("$Root\scripts\health-check.mjs")
if ($Lint) { $args += "--lint" }
if ($Build) { $args += "--build" }
if ($JsonOut) { $args += "--json=$JsonOut" }

Push-Location $Root
try {
  & node @args
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
