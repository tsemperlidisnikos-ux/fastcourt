# FastCourt Next - safe disk cleanup
# Removes .next build cache and/or node_modules to free ~1.4 GB.
# Usage:
#   .\clean.ps1              # .next only (fast, ~1 GB)
#   .\clean.ps1 -All         # .next + node_modules (~1.4 GB)
#   .\clean.ps1 -DryRun      # show what would be deleted

param(
    [switch]$All,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Format-Size([long]$bytes) {
    if ($bytes -ge 1GB) { return "{0:N2} GB" -f ($bytes / 1GB) }
    if ($bytes -ge 1MB) { return "{0:N0} MB" -f ($bytes / 1MB) }
    return "{0:N0} KB" -f ($bytes / 1KB)
}

function Get-FolderSize([string]$path) {
    if (-not (Test-Path $path)) { return 0 }
    return (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum
}

function Test-DevServerRunning {
    $nextProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -match "node" -and
            $_.CommandLine -match "next(\.exe)?\s+dev|next dev"
        }
    return [bool]$nextProcs
}

function Remove-Target([string]$label, [string]$path) {
    if (-not (Test-Path $path)) {
        Write-Host "  skip $label (not found)" -ForegroundColor DarkGray
        return 0
    }
    $size = Get-FolderSize $path
    if ($DryRun) {
        Write-Host "  would delete $label : $(Format-Size $size)" -ForegroundColor Yellow
        return $size
    }
    Write-Host "  deleting $label : $(Format-Size $size)..." -ForegroundColor Cyan
    Remove-Item -LiteralPath $path -Recurse -Force
    return $size
}

Write-Host ""
Write-Host "FastCourt Next - cleanup" -ForegroundColor White
Write-Host "Project: $root"
Write-Host ""

if (Test-DevServerRunning) {
    Write-Host "BLOCKED: Next.js dev server is running." -ForegroundColor Red
    Write-Host "Stop it first (Ctrl+C in the dev terminal), then run this script again."
    Write-Host ""
    exit 1
}

$before = Get-FolderSize $root
$targets = @(
    @{ Label = ".next"; Path = Join-Path $root ".next" }
)
if ($All) {
    $targets += @{ Label = "node_modules"; Path = Join-Path $root "node_modules" }
}

if ($DryRun) {
    $modeLabel = "DRY RUN"
} elseif ($All) {
    $modeLabel = "full (.next + node_modules)"
} else {
    $modeLabel = ".next only"
}
Write-Host "Mode: $modeLabel"
Write-Host ""

$freed = 0
foreach ($t in $targets) {
    $freed += Remove-Target $t.Label $t.Path
}

$after = if ($DryRun) { $before - $freed } else { Get-FolderSize $root }

Write-Host ""
if ($DryRun) {
    Write-Host "Would free: $(Format-Size $freed)" -ForegroundColor Yellow
    Write-Host "Run without -DryRun to delete."
} else {
    Write-Host "Freed: $(Format-Size $freed)" -ForegroundColor Green
    Write-Host "Project size now: $(Format-Size $after)"
    Write-Host ""
    if ($All) {
        Write-Host "Next steps:" -ForegroundColor White
        Write-Host "  npm install"
        Write-Host "  npm run dev"
    } else {
        Write-Host "Next step:" -ForegroundColor White
        Write-Host "  npm run dev"
    }
}
Write-Host ""
