# Apply team library migrations + link Team Test profiles (production setup)
#
# Usage:
#   .\scripts\apply-team-library.ps1
#   .\scripts\apply-team-library.ps1 -LinkTeamTest

param(
  [switch]$LinkTeamTest,
  [string]$OrgName = "Team Test",
  [string]$AdminEmail = "teamtest@gmail.com",
  [string]$CoachEmails = "ntsemperlidis@promitheasbc.gr,tsemperlidis.nikos@gmail.com"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== FastCourt Team Library Setup ===" -ForegroundColor Cyan
Write-Host ""

& (Join-Path $Root "scripts\build-supabase-schema.ps1")

Write-Host ""
Write-Host "1) Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "   Run these files IN ORDER (or use supabase\schema-combined.sql if fresh DB):"
Write-Host "   - supabase\migrations\010_team_library_owner.sql"
Write-Host "   - supabase\migrations\011_team_library_profile_link.sql"
Write-Host "   - supabase\migrations\012_team_library_rls.sql"
Write-Host "   - supabase\migrations\013_admin_link_team_library.sql"
Write-Host ""
Write-Host "2) Link profiles (service role)" -ForegroundColor Yellow
Write-Host "   npm run link-team-library -- --org `"$OrgName`" --admin $AdminEmail --coaches $CoachEmails"
Write-Host ""
Write-Host "3) Test flow" -ForegroundColor Yellow
Write-Host "   a) Login as team admin ($AdminEmail)"
Write-Host "   b) Create/save a play in Library"
Write-Host "   c) Logout, login as coach"
Write-Host "   d) Same play should appear after cloud sync"
Write-Host ""

if ($LinkTeamTest) {
  Write-Host "Linking Team Test profiles..." -ForegroundColor Green
  Push-Location $Root
  try {
    npm run link-team-library -- --org $OrgName --admin $AdminEmail --coaches $CoachEmails
  } finally {
    Pop-Location
  }
}
