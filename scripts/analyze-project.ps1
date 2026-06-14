# FastCourt Next - deep project analyzer
# Walks every folder layer, import graph, env audit, optional build/lint.
#
# Usage:
#   .\scripts\analyze-project.ps1
#   .\scripts\analyze-project.ps1 -JsonOut .\project-analysis.json
#   .\scripts\analyze-project.ps1 -VerboseTree -RunChecks
#   .\scripts\analyze-project.ps1 -SkipImports -MaxDepth 4

param(
  [string]$Root = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),
  [string]$JsonOut = "",
  [int]$MaxDepth = 0,
  [switch]$VerboseTree,
  [switch]$IncludeBuildDirs,
  [switch]$RunChecks,
  [switch]$SkipImports
)

$ErrorActionPreference = "Stop"

$ExcludeDirs = if ($IncludeBuildDirs) { @(".git") } else { @("node_modules", ".next", ".git", "backups", ".cursor") }

function Test-ExcludedPath {
  param([string]$RelativePath)
  foreach ($dir in $ExcludeDirs) {
    if ($RelativePath -eq $dir -or $RelativePath -like "$dir\*") { return $true }
  }
  return $false
}

function Get-RelativePath {
  param([string]$FullPath)
  return $FullPath.Substring($Root.Length).TrimStart("\", "/")
}

function Format-Bytes {
  param([long]$Bytes)
  if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
  if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
  if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
  return "$Bytes B"
}

function Get-DirDepth {
  param([string]$RelativePath)
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return 0 }
  return ($RelativePath -split '[\\/]').Count
}

function Get-PropCount {
  param($Obj)
  if ($null -eq $Obj) { return 0 }
  return @($Obj.PSObject.Properties).Count
}

function Invoke-NpmCheck {
  param([string]$Label, [string[]]$Command)
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npmCmd) {
    return [PSCustomObject]@{ Label = $Label; Status = "skipped"; Detail = "npm not found" }
  }
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    Push-Location $Root
    $out = & npm @Command 2>&1 | Out-String
    $code = $LASTEXITCODE
    $status = if ($code -eq 0) { "pass" } else { "fail" }
    $lines = ($out -split "`n" | Where-Object { $_.Trim() }) | Select-Object -Last 8
    return [PSCustomObject]@{
      Label  = $Label
      Status = $status
      ExitCode = $code
      Detail = ($lines -join " | ").Trim()
    }
  } finally {
    Pop-Location
    $ErrorActionPreference = $prev
  }
}

function Get-EnvAudit {
  $vars = [ordered]@{
    "NEXT_PUBLIC_SUPABASE_URL"       = "Supabase project URL (cloud auth)"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"  = "Supabase anon key (cloud auth)"
    "NEXT_PUBLIC_APP_BUILD"          = "Build tag shown in UI (default: next-v7)"
    "NEXT_PUBLIC_ADMIN_EMAIL"        = "Admin contact email"
    "NEXT_PUBLIC_MASTER_ADMIN_EMAIL" = "Bootstrap admin on signup"
  }

  $results = @()
  foreach ($name in $vars.Keys) {
    $val = [Environment]::GetEnvironmentVariable($name)
    $fileVal = $null
    foreach ($envFile in @(".env.local", ".env", ".env.production")) {
      $p = Join-Path $Root $envFile
      if (-not (Test-Path $p)) { continue }
      $line = Get-Content $p -ErrorAction SilentlyContinue | Where-Object { $_ -match "^\s*$([regex]::Escape($name))\s*=" } | Select-Object -First 1
      if ($line) {
        $fileVal = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
        break
      }
    }
    $effective = if ($val) { $val } elseif ($fileVal) { $fileVal } else { $null }
    $masked = if ($effective -and $name -match "KEY|SECRET|PASSWORD") {
      if ($effective.Length -le 8) { "***" } else { $effective.Substring(0, 4) + "..." + $effective.Substring($effective.Length - 4) }
    } elseif ($effective) { $effective } else { "(not set)" }

    $results += [PSCustomObject]@{
      Name        = $name
      Description = $vars[$name]
      Status      = if ($effective) { "set" } else { "missing" }
      Value       = $masked
      Source      = if ($val) { "process" } elseif ($fileVal) { "file" } else { "none" }
    }
  }
  return $results
}

function Get-AuditChecklist {
  $auditPath = Join-Path $Root "AUDIT.md"
  if (-not (Test-Path $auditPath)) { return $null }

  $lines = Get-Content $auditPath -Encoding UTF8
  $done = 0; $pending = 0; $items = @()
  foreach ($line in $lines) {
    if ($line -match '^\s*-\s*\[x\]\s*(.+)$') {
      $done++; $items += [PSCustomObject]@{ Status = "done"; Text = $Matches[1].Trim() }
    } elseif ($line -match '^\s*-\s*\[\s*\]\s*(.+)$') {
      $pending++; $items += [PSCustomObject]@{ Status = "pending"; Text = $Matches[1].Trim() }
    }
  }
  return [PSCustomObject]@{
    doneCount    = $done
    pendingCount = $pending
    pendingItems = ($items | Where-Object Status -eq "pending" | Select-Object -First 15)
    doneItems    = ($items | Where-Object Status -eq "done" | Select-Object -First 5)
  }
}

function Get-GitSummary {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) { return $null }
  Push-Location $Root
  try {
    if (-not (Test-Path (Join-Path $Root ".git"))) { return $null }
    $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
    $status = git status --porcelain 2>$null
    $changed = if ($status) { @($status).Count } else { 0 }
    $lastCommit = (git log -1 --format="%h %s (%cr)" 2>$null).Trim()
    return [PSCustomObject]@{
      branch       = $branch
      changedFiles = $changed
      lastCommit   = $lastCommit
    }
  } finally { Pop-Location }
}

function Invoke-ImportAnalysis {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Warning "Node.js not found - skipping import graph analysis"
    return $null
  }
  $script = Join-Path $Root "scripts\analyze-imports.mjs"
  if (-not (Test-Path $script)) {
    Write-Warning "analyze-imports.mjs not found"
    return $null
  }
  $json = & node $script $Root 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Import analysis failed: $json"
    return $null
  }
  return $json | ConvertFrom-Json
}

# -- Collect files -------------------------------------------------------------
$allFiles = @()
$allDirs = @()

Get-ChildItem -Path $Root -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $rel = Get-RelativePath $_.FullName
  if (Test-ExcludedPath $rel) { return }
  if ($MaxDepth -gt 0 -and (Get-DirDepth $rel) -gt $MaxDepth) { return }

  if ($_.PSIsContainer) {
    $allDirs += [PSCustomObject]@{ Path = $rel; Depth = (Get-DirDepth $rel) }
  } else {
    $allFiles += [PSCustomObject]@{
      Path      = $rel
      Name      = $_.Name
      Extension = if ($_.Extension) { $_.Extension.ToLowerInvariant() } else { "(no ext)" }
      Size      = $_.Length
      Depth     = (Get-DirDepth $rel)
      Dir       = Split-Path $rel -Parent
    }
  }
}

# -- Layer mapping -------------------------------------------------------------
$layers = [ordered]@{
  "app-routes"    = "src\app"
  "components"    = "src\components"
  "hooks"         = "src\hooks"
  "stores"        = "src\stores"
  "lib"           = "src\lib"
  "types"         = "src\types"
  "styles"        = "src\styles"
  "public-assets" = "public"
  "scripts"       = "scripts"
  "config-root"   = ""
}

$layerStats = @{}
foreach ($key in $layers.Keys) {
  $prefix = $layers[$key]
  if ($prefix -eq "") {
    $matched = $allFiles | Where-Object { $_.Dir -eq "" -or $_.Dir -eq $null }
  } else {
    $matched = $allFiles | Where-Object { $_.Path -like "$prefix*" }
  }
  $layerStats[$key] = [PSCustomObject]@{
    Prefix     = if ($prefix) { $prefix } else { "(root)" }
    FileCount  = @($matched).Count
    TotalBytes = ($matched | Measure-Object -Property Size -Sum).Sum
    Extensions = ($matched | Group-Object Extension | Sort-Object Count -Descending |
      Select-Object -First 8 | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ", "
  }
}

$libSubLayers = $allFiles |
  Where-Object { $_.Path -like "src\lib\*" } |
  ForEach-Object { ($_.Path -split '\\')[2] } |
  Group-Object | Sort-Object Count -Descending | Select-Object Name, Count

$componentSubLayers = $allFiles |
  Where-Object { $_.Path -like "src\components\*" } |
  ForEach-Object { ($_.Path -split '\\')[2] } |
  Group-Object | Sort-Object Count -Descending | Select-Object Name, Count

$routes = $allFiles |
  Where-Object { $_.Name -in @("page.tsx", "page.ts", "route.ts", "layout.tsx", "layout.ts", "error.tsx", "global-error.tsx") } |
  Sort-Object Path | Select-Object Path, Name

$stores = $allFiles |
  Where-Object { $_.Path -like "src\stores\*" } |
  Sort-Object Path |
  Select-Object Path, @{N = "Lines"; E = {
    try { (Get-Content (Join-Path $Root $_.Path) -ErrorAction Stop).Count } catch { 0 }
  }}

$cssFiles = $allFiles |
  Where-Object { $_.Extension -eq ".css" } |
  Sort-Object Size -Descending |
  Select-Object Path, @{N = "Size"; E = { Format-Bytes $_.Size } }

$largest = $allFiles |
  Where-Object { $_.Extension -in @(".ts", ".tsx", ".js", ".css") } |
  Sort-Object Size -Descending |
  Select-Object -First 15 Path, @{N = "Size"; E = { Format-Bytes $_.Size } }

$extSummary = $allFiles |
  Group-Object Extension |
  Sort-Object Count -Descending |
  Select-Object @{N = "Extension"; E = { $_.Name } }, Count,
  @{N = "TotalSize"; E = { Format-Bytes ($_.Group | Measure-Object Size -Sum).Sum }}

$pkgPath = Join-Path $Root "package.json"
$pkg = $null
if (Test-Path $pkgPath) {
  $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-TreeLines {
  param([string]$BasePath, [int]$Depth = 0, [int]$Limit = 200)
  $lines = [System.Collections.Generic.List[string]]::new()

  if ($BasePath -eq "") {
    $topDirs = $allDirs | Where-Object { $_.Depth -eq 1 } | Sort-Object Path
    foreach ($d in $topDirs) {
      $indent = "  " * $Depth
      $fileCount = (@($allFiles | Where-Object { $_.Path -like "$($d.Path)\*" -or $_.Dir -eq $d.Path })).Count
      $lines.Add("$indent$($d.Path)/  ($fileCount files)")
      if ($lines.Count -ge $Limit) { return $lines }
      if ($VerboseTree -or $Depth -lt 2) {
        $childLines = Get-TreeLines -BasePath $d.Path -Depth ($Depth + 1) -Limit ($Limit - $lines.Count)
        foreach ($cl in $childLines) { $lines.Add($cl); if ($lines.Count -ge $Limit) { return $lines } }
      }
    }
    return $lines
  }

  $childDirs = $allDirs |
    Where-Object { $_.Path -like "$BasePath\*" -and ((Get-DirDepth $_.Path) -eq ((Get-DirDepth $BasePath) + 1)) } |
    Sort-Object Path

  foreach ($d in $childDirs) {
    $indent = "  " * $Depth
    $fc = (@($allFiles | Where-Object { $_.Path -like "$($d.Path)\*" -or $_.Dir -eq $d.Path })).Count
    $shortName = $d.Path.Substring($BasePath.Length).TrimStart('\')
    $lines.Add("${indent}${shortName}/  ($fc files)")
    if ($lines.Count -ge $Limit) { return $lines }
    if ($VerboseTree) {
      $childLines = Get-TreeLines -BasePath $d.Path -Depth ($Depth + 1) -Limit ($Limit - $lines.Count)
      foreach ($cl in $childLines) { $lines.Add($cl); if ($lines.Count -ge $Limit) { return $lines } }
    }
  }
  return $lines
}

$treeLines = Get-TreeLines -BasePath ""

# -- Extended analysis ---------------------------------------------------------
$importReport = if (-not $SkipImports) { Invoke-ImportAnalysis } else { $null }
$envAudit = Get-EnvAudit
$auditChecklist = Get-AuditChecklist
$gitSummary = Get-GitSummary

$healthChecks = @()
if ($RunChecks) {
  Write-Host "Running npm checks (may take a few minutes)..." -ForegroundColor DarkGray
  $healthChecks += Invoke-NpmCheck -Label "lint" -Command @("run", "lint")
  $healthChecks += Invoke-NpmCheck -Label "build" -Command @("run", "build")
}

# -- Build report object -------------------------------------------------------
$report = [ordered]@{
  generatedAt        = (Get-Date).ToString("o")
  projectRoot        = $Root
  projectName        = if ($pkg) { $pkg.name } else { "unknown" }
  version            = if ($pkg) { $pkg.version } else { "unknown" }
  summary            = [ordered]@{
    totalFiles   = $allFiles.Count
    totalDirs    = $allDirs.Count
    totalSize    = Format-Bytes (($allFiles | Measure-Object Size -Sum).Sum)
    excludedDirs = $ExcludeDirs -join ", "
  }
  git                = $gitSummary
  npmScripts         = if ($pkg) { $pkg.scripts } else { $null }
  dependencies       = if ($pkg) { $pkg.dependencies } else { $null }
  devDependencies    = if ($pkg) { $pkg.devDependencies } else { $null }
  layers             = $layerStats
  libSubLayers       = $libSubLayers
  componentSubLayers = $componentSubLayers
  extensions         = $extSummary
  routes             = $routes
  stores             = $stores
  cssFiles           = $cssFiles
  largestSource      = $largest
  directoryTree      = $treeLines
  environment        = $envAudit
  auditChecklist     = $auditChecklist
  imports            = $importReport
  healthChecks       = $healthChecks
}

# -- Console output ------------------------------------------------------------
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  FastCourt Next - Project Deep Analysis (extended)" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Root:      $Root"
Write-Host "Generated: $($report.generatedAt)"
Write-Host ""

Write-Host "-- Summary ---------------------------------------------------" -ForegroundColor Yellow
Write-Host "  Files: $($allFiles.Count)  |  Dirs: $($allDirs.Count)  |  Size: $($report.summary.totalSize)"
Write-Host "  Excluded: $($report.summary.excludedDirs)"
if ($gitSummary) {
  Write-Host "  Git: branch=$($gitSummary.branch)  changed=$($gitSummary.changedFiles)  last=$($gitSummary.lastCommit)"
}
Write-Host ""

if ($pkg) {
  Write-Host "-- Package: $($pkg.name) v$($pkg.version) ---------------------" -ForegroundColor Yellow
  Write-Host "  Scripts: $($pkg.scripts.PSObject.Properties.Name -join ', ')"
  Write-Host "  Runtime deps: $(Get-PropCount $pkg.dependencies)  |  Dev deps: $(Get-PropCount $pkg.devDependencies)"
  if ($pkg.dependencies) {
    Write-Host "  Key deps: next, react, konva, zustand, @supabase/supabase-js, idb, pdfjs-dist"
  }
  Write-Host ""
}

Write-Host "-- Environment variables -------------------------------------" -ForegroundColor Yellow
$envAudit | ForEach-Object {
  $color = if ($_.Status -eq "set") { "Green" } else { "DarkYellow" }
  Write-Host ("  [{0,-7}] {1,-35} {2}" -f $_.Status, $_.Name, $_.Value) -ForegroundColor $color
}
Write-Host ""

if ($auditChecklist) {
  Write-Host "-- AUDIT.md checklist ----------------------------------------" -ForegroundColor Yellow
  Write-Host "  Done: $($auditChecklist.doneCount)  |  Pending: $($auditChecklist.pendingCount)"
  Write-Host "  Top pending gaps:"
  $auditChecklist.pendingItems | Select-Object -First 10 | ForEach-Object {
    Write-Host "    [ ] $($_.Text)"
  }
  Write-Host ""
}

if ($importReport) {
  Write-Host "-- Import graph ----------------------------------------------" -ForegroundColor Yellow
  Write-Host "  Source files: $($importReport.sourceFiles)  |  Entry points: $($importReport.entryPoints)  |  Reachable: $($importReport.reachableFromEntries)"
  Write-Host "  Orphan files (not reachable from routes): $($importReport.orphanCount)"
  if ($importReport.orphanCount -gt 0) {
    $importReport.orphans | Select-Object -First 12 | ForEach-Object { Write-Host "    $_" }
    if ($importReport.orphanCount -gt 12) { Write-Host "    ... +$($importReport.orphanCount - 12) more" }
  }
  Write-Host ""
  Write-Host "  Route map:"
  $importReport.routes | ForEach-Object {
    Write-Host ("    {0,-22} [{1,3}]  {2}" -f $_.url, $_.type, $_.file)
  }
  Write-Host ""
  Write-Host "  Most imported modules:"
  $importReport.topImported | Select-Object -First 10 | ForEach-Object {
    Write-Host ("    {0,4}x  {1}" -f $_.count, $_.file)
  }
  Write-Host ""
  Write-Host "  NPM packages used in src:"
  $importReport.externalPackages | Select-Object -First 12 | ForEach-Object {
    Write-Host ("    {0,4}x  {1}" -f $_.count, $_.pkg)
  }
  Write-Host ""
  Write-Host "  Layer coupling (imports):"
  $importReport.layerCoupling | Select-Object -First 10 | ForEach-Object {
    Write-Host ("    {0,4}x  {1}" -f $_.count, $_.edge)
  }
  Write-Host ""
  Write-Host "  Zustand store usage (files referencing store):"
  $importReport.storeUsage.PSObject.Properties | Sort-Object { $_.Value.files } -Descending | ForEach-Object {
    Write-Host ("    {0,-35} {1,3} files" -f $_.Name, $_.Value.files)
  }
  if ($importReport.circularDependencies.Count -gt 0) {
    Write-Host ""
    Write-Host "  Circular dependencies:"
    $importReport.circularDependencies | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
  }
  if ($importReport.unresolvedImports.Count -gt 0) {
    Write-Host ""
    Write-Host "  Unresolved local imports: $($importReport.unresolvedImports.Count)"
    $importReport.unresolvedImports | Select-Object -First 5 | ForEach-Object {
      Write-Host "    $($_.file) -> $($_.spec)"
    }
  }
  if ($importReport.emptyDirectories.Count -gt 0) {
    Write-Host ""
    Write-Host "  Empty directories: $($importReport.emptyDirectories.Count)"
    $importReport.emptyDirectories | Select-Object -First 8 | ForEach-Object { Write-Host "    $_/" }
  }
  Write-Host ""
}

Write-Host "-- Architectural Layers --------------------------------------" -ForegroundColor Yellow
foreach ($key in $layerStats.Keys) {
  $ls = $layerStats[$key]
  Write-Host ("  {0,-18} {1,4} files  {2,10}  [{3}]" -f $key, $ls.FileCount, (Format-Bytes $ls.TotalBytes), $ls.Extensions)
}
Write-Host ""

Write-Host "-- src/lib sub-modules ---------------------------------------" -ForegroundColor Yellow
$libSubLayers | ForEach-Object { Write-Host ("  {0,-20} {1,3} files" -f $_.Name, $_.Count) }
Write-Host ""

Write-Host "-- src/components domains ------------------------------------" -ForegroundColor Yellow
$componentSubLayers | ForEach-Object { Write-Host ("  {0,-20} {1,3} files" -f $_.Name, $_.Count) }
Write-Host ""

Write-Host "-- Zustand stores --------------------------------------------" -ForegroundColor Yellow
$stores | ForEach-Object { Write-Host ("  {0,-45} {1,5} lines" -f $_.Path, $_.Lines) }
Write-Host ""

Write-Host "-- File extensions -------------------------------------------" -ForegroundColor Yellow
$extSummary | Select-Object -First 12 | ForEach-Object {
  Write-Host ("  {0,-12} {1,5} files  {2,10}" -f $_.Extension, $_.Count, $_.TotalSize)
}
Write-Host ""

Write-Host "-- Largest source files --------------------------------------" -ForegroundColor Yellow
$largest | ForEach-Object { Write-Host ("  {0,-10}  {1}" -f $_.Size, $_.Path) }
Write-Host ""

Write-Host "-- CSS stylesheets ($($cssFiles.Count) total) ---------------------------" -ForegroundColor Yellow
$cssFiles | Select-Object -First 8 | ForEach-Object { Write-Host ("  {0,-10}  {1}" -f $_.Size, $_.Path) }
if ($cssFiles.Count -gt 8) { Write-Host "  ... +$($cssFiles.Count - 8) more" }
Write-Host ""

if ($healthChecks.Count -gt 0) {
  Write-Host "-- Health checks (npm) ---------------------------------------" -ForegroundColor Yellow
  foreach ($hc in $healthChecks) {
    $color = if ($hc.Status -eq "pass") { "Green" } elseif ($hc.Status -eq "skipped") { "DarkGray" } else { "Red" }
    Write-Host ("  [{0,-7}] {1}" -f $hc.Status, $hc.Label) -ForegroundColor $color
    if ($hc.Detail) { Write-Host "           $($hc.Detail)" -ForegroundColor DarkGray }
  }
  Write-Host ""
}

Write-Host "-- Directory tree (top levels$(if ($VerboseTree) { ', verbose' })) ----------------------" -ForegroundColor Yellow
$treeLines | Select-Object -First 50 | ForEach-Object { Write-Host $_ }
if ($treeLines.Count -gt 50) { Write-Host "  ... +$($treeLines.Count - 50) more (use -VerboseTree)" }
Write-Host ""

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Flags: -RunChecks (lint+build)  -SkipImports  -VerboseTree  -JsonOut path"
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

if ($JsonOut) {
  $jsonPath = if ([System.IO.Path]::IsPathRooted($JsonOut)) { $JsonOut } else { Join-Path $Root $JsonOut }
  $report | ConvertTo-Json -Depth 12 | Set-Content -Path $jsonPath -Encoding UTF8
  Write-Host "JSON report saved: $jsonPath" -ForegroundColor Green
}
