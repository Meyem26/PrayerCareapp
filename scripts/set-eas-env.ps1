# Sets client-safe EAS env vars from local .env (never uploads service_role).
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

$map = @{}
Get-Content .\.env | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $eq = $line.IndexOf('=')
  if ($eq -lt 1) { return }
  $map[$line.Substring(0, $eq).Trim()] = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
}

$url = $map['EXPO_PUBLIC_SUPABASE_URL']
$anon = $map['EXPO_PUBLIC_SUPABASE_ANON_KEY']
if (-not $url -or -not $anon) { throw 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env' }
if (($map.Keys -join ',') -match 'SERVICE_ROLE|service_role') { throw 'Refusing to upload service-role keys' }

$items = @(
  @{ Name = 'EXPO_PUBLIC_SUPABASE_URL'; Value = $url; Visibility = 'plaintext' }
  @{ Name = 'EXPO_PUBLIC_SUPABASE_ANON_KEY'; Value = $anon; Visibility = 'sensitive' }
  @{ Name = 'EXPO_PUBLIC_LANDING_URL'; Value = 'https://www.prayercare.online'; Visibility = 'plaintext' }
  @{ Name = 'EXPO_PUBLIC_WEB_APP_URL'; Value = 'https://app.prayercare.online'; Visibility = 'plaintext' }
  @{ Name = 'EXPO_PUBLIC_BETA_MODE'; Value = 'false'; Visibility = 'plaintext' }
  @{ Name = 'EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED'; Value = 'false'; Visibility = 'plaintext' }
)

$failed = @()
foreach ($item in $items) {
  Write-Host ("Setting {0}..." -f $item.Name)
  $easArgs = @(
    'eas-cli', 'env:create',
    '--name', $item.Name,
    '--value', $item.Value,
    '--type', 'string',
    '--visibility', $item.Visibility,
    '--environment', 'production',
    '--environment', 'preview',
    '--environment', 'development',
    '--force',
    '--non-interactive'
  )
  $raw = & npx @easArgs 2>&1 | Out-String
  $code = $LASTEXITCODE
  $safe = $raw -replace [regex]::Escape($anon), '[REDACTED]' -replace [regex]::Escape($url), '[REDACTED]'
  if ($code -ne 0 -or ($safe -notmatch 'Created|Updated|already')) {
    Write-Host $safe
    if ($code -ne 0) { $failed += $item.Name }
  } else {
    Write-Host '  OK'
  }
}

Write-Host '--- production names ---'
npx eas-cli env:list --environment production 2>&1 | Out-String | ForEach-Object {
  $_ -replace [regex]::Escape($anon), '[REDACTED]' -replace [regex]::Escape($url), '[REDACTED]'
}

if ($failed.Count -gt 0) {
  Write-Host ('FAILED: ' + ($failed -join ', '))
  exit 1
}
Write-Host 'ALL SECRETS SET'
exit 0
