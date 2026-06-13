# Creates fastcourt-deploy.zip for Papaki/Plesk upload (source only — build runs on server).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$out = Join-Path $root "fastcourt-deploy.zip"

if (Test-Path $out) { Remove-Item $out -Force }

$excludeDirs = @(
  "node_modules",
  ".next",
  ".git",
  ".cursor"
)

$excludeFiles = @(
  "fastcourt-deploy.zip",
  ".env",
  ".env.local",
  ".env.production"
)

Push-Location $root
try {
  $items = Get-ChildItem -Force | Where-Object {
    if ($_.PSIsContainer) {
      return $excludeDirs -notcontains $_.Name
    }
    return $excludeFiles -notcontains $_.Name
  }

  Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $out -Force
  Write-Host "Created: $out"
  Write-Host "Upload this zip to Papaki, extract in httpdocs (or a subfolder), then run npm ci && npm run build"
}
finally {
  Pop-Location
}
