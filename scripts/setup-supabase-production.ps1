# FastCourt - configure Supabase for local + Vercel production
#
# Usage:
#   .\scripts\setup-supabase-production.ps1
#   .\scripts\setup-supabase-production.ps1 -SupabaseUrl "https://abc.supabase.co" -AnonKey "eyJ..."
#   npm run setup:supabase
#
param(
  [string]$SupabaseUrl = "",
  [string]$AnonKey = "",
  [string]$ServiceRoleKey = "",
  [switch]$SkipVercel,
  [switch]$SkipRedeploy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvLocal = Join-Path $Root ".env.local"

function Test-SupabaseUrl([string]$Url) {
  return $Url -match '^https://[a-z0-9-]+\.supabase\.co/?$'
}

function Test-AnonKey([string]$Key) {
  if ($Key.Length -lt 20) { return $false }
  if ($Key -match '^sb_(publishable|secret)_') { return $false }
  return $true
}

function Read-EnvLocal([hashtable]$Map) {
  if (-not (Test-Path $EnvLocal)) { return }
  Get-Content $EnvLocal | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $Map[$name] = $value
  }
}

function Write-EnvLocal([hashtable]$Map) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# FastCourt local / deploy secrets - do not commit")
  $lines.Add("")

  $order = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_APP_BUILD",
    "NEXT_PUBLIC_ADMIN_EMAIL",
    "NEXT_PUBLIC_MASTER_ADMIN_EMAIL",
    "NEXT_PUBLIC_ADMIN_EMAILS"
  )

  $written = @{}
  foreach ($name in $order) {
    if ($Map.ContainsKey($name) -and $Map[$name]) {
      $lines.Add("$name=$($Map[$name])")
      $written[$name] = $true
    }
  }

  foreach ($name in ($Map.Keys | Sort-Object)) {
    if ($written.ContainsKey($name)) { continue }
    if ($name -eq "NODE_ENV") { continue }
    if ($Map[$name]) {
      $lines.Add("$name=$($Map[$name])")
    }
  }

  Set-Content -Path $EnvLocal -Value ($lines -join "`n") -Encoding utf8
}

Write-Host "=== FastCourt Supabase production setup ===" -ForegroundColor Cyan
Write-Host ""

if (-not $SupabaseUrl) {
  $SupabaseUrl = Read-Host "Supabase Project URL (https://YOUR_REF.supabase.co)"
}
if (-not $AnonKey) {
  $AnonKey = Read-Host "Supabase anon public key (eyJ... from Settings -> API)"
}
if (-not $ServiceRoleKey) {
  $ServiceRoleKey = Read-Host "Service role key (optional, Enter to skip)"
}

$SupabaseUrl = $SupabaseUrl.Trim().TrimEnd("/")
$AnonKey = $AnonKey.Trim()
$ServiceRoleKey = $ServiceRoleKey.Trim()

if (-not (Test-SupabaseUrl $SupabaseUrl)) {
  throw "Invalid NEXT_PUBLIC_SUPABASE_URL. Use Project URL from Supabase Settings -> API (https://xxxx.supabase.co), not publishable/secret keys."
}
if (-not (Test-AnonKey $AnonKey)) {
  throw "Invalid anon key. Use the anon public JWT from Supabase Settings -> API."
}

$envMap = @{}
Read-EnvLocal $envMap
$envMap["NEXT_PUBLIC_SUPABASE_URL"] = $SupabaseUrl
$envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = $AnonKey
if ($ServiceRoleKey) {
  $envMap["SUPABASE_SERVICE_ROLE_KEY"] = $ServiceRoleKey
}
if (-not $envMap["NEXT_PUBLIC_APP_BUILD"]) {
  $envMap["NEXT_PUBLIC_APP_BUILD"] = "next-v7"
}
if (-not $envMap["NEXT_PUBLIC_ADMIN_EMAIL"]) {
  $envMap["NEXT_PUBLIC_ADMIN_EMAIL"] = "admin@fastcourt.eu"
}

Write-EnvLocal $envMap
Write-Host "Updated $EnvLocal" -ForegroundColor Green

Write-Host ""
Write-Host "Supabase dashboard — Authentication -> URL configuration:" -ForegroundColor Yellow
Write-Host "  Site URL: https://fastcourt-next.vercel.app"
Write-Host "  Redirect URLs:"
Write-Host "    https://fastcourt-next.vercel.app/auth/callback"
Write-Host "    http://localhost:3000/auth/callback"
Write-Host "  (Add https://fastcourt.eu/auth/callback when domain is live)"
Write-Host ""
Write-Host "Run SQL migrations in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "  scripts\build-supabase-schema.ps1  ->  supabase\schema-combined.sql"
Write-Host ""

if (-not $SkipVercel) {
  Push-Location $Root
  try {
    $targets = @("production", "preview", "development")
    foreach ($target in $targets) {
      Write-Host "Setting Vercel env ($target): NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Cyan
      $SupabaseUrl | vercel env add NEXT_PUBLIC_SUPABASE_URL $target --force 2>&1 | Out-Host
      Write-Host "Setting Vercel env ($target): NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Cyan
      $AnonKey | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY $target --force 2>&1 | Out-Host
      if ($ServiceRoleKey) {
        Write-Host "Setting Vercel env ($target): SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Cyan
        $ServiceRoleKey | vercel env add SUPABASE_SERVICE_ROLE_KEY $target --force 2>&1 | Out-Host
      }
    }
    Write-Host "Vercel environment variables updated." -ForegroundColor Green
  } finally {
    Pop-Location
  }
}

if (-not $SkipRedeploy) {
  Write-Host ""
  Write-Host "Redeploying production..." -ForegroundColor Cyan
  Push-Location $Root
  try {
    vercel deploy --prod --yes 2>&1 | Out-Host
  } finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "Done. Test: https://fastcourt-next.vercel.app/login" -ForegroundColor Green
