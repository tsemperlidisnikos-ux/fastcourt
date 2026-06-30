# FastCourt Next — project backup (zip + git bundle)
#
# Usage:
#   .\scripts\backup.ps1
#   .\scripts\backup.ps1 -OutDir D:\other-backups
#   npm run backup

param(
  [string]$OutDir = "C:\fastcourt-next-backups"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ts = Get-Date -Format "yyyy-MM-dd_HHmm"

$zipName = "fastcourt-backup_$ts.zip"
$bundleName = "fastcourt-git-restore-point_$ts.bundle"
$zipPath = Join-Path $OutDir $zipName
$bundlePath = Join-Path $OutDir $bundleName

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Push-Location $Root
try {
  Write-Host "=== FastCourt Backup ===" -ForegroundColor Cyan
  Write-Host "Output: $OutDir`n"

  Write-Host "Creating git bundle..."
  git bundle create $bundlePath --all

  Write-Host "Creating project zip..."
  tar -a -c -f $zipPath `
    --exclude=node_modules `
    --exclude=.next `
    --exclude=.git `
    --exclude=backups `
    --exclude=.cursor `
    --exclude=test-results `
    --exclude=reports/playwright-html `
    .

  Write-Host "`nBackup complete:`n"
  Get-ChildItem $OutDir -Filter "*$ts*" | ForEach-Object {
    $mb = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name)  ($mb MB)"
  }
} finally {
  Pop-Location
}
