# Combine supabase/migrations/*.sql into one file for Supabase SQL Editor
param(
  [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$MigrationsDir = Join-Path $Root "supabase\migrations"
if (-not $OutFile) {
  $OutFile = Join-Path $Root "supabase\schema-combined.sql"
}

$files = Get-ChildItem $MigrationsDir -Filter "*.sql" | Sort-Object Name -Unique
if ($files.Count -eq 0) {
  throw "No migration files in $MigrationsDir"
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("-- FastCourt combined schema - run once in Supabase SQL Editor")
[void]$sb.AppendLine("-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
[void]$sb.AppendLine("")

foreach ($file in $files) {
  [void]$sb.AppendLine("-- ---------------------------------------------------------------------------")
  [void]$sb.AppendLine("-- $($file.Name)")
  [void]$sb.AppendLine("-- ---------------------------------------------------------------------------")
  [void]$sb.AppendLine((Get-Content $file.FullName -Raw))
  [void]$sb.AppendLine("")
}

Set-Content -Path $OutFile -Value $sb.ToString() -Encoding utf8
Write-Host "Wrote $OutFile ($($files.Count) migrations)" -ForegroundColor Green
