Set-Location $PSScriptRoot\..

$url = $null
$key = $null

Get-Content .env | ForEach-Object {
  if ($_ -match '^EXPO_PUBLIC_SUPABASE_URL=(.+)$') {
    $url = $matches[1].Trim().Trim('"').Trim("'")
  }
  if ($_ -match '^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$') {
    $key = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $url) { Write-Host 'MISSING: EXPO_PUBLIC_SUPABASE_URL'; exit 1 }
if (-not $key) { Write-Host 'MISSING: EXPO_PUBLIC_SUPABASE_ANON_KEY'; exit 1 }

Write-Host "URL set: yes"
Write-Host "URL valid pattern: $($url -match '^https://[a-z0-9-]+\.supabase\.co/?$')"
Write-Host "URL is placeholder: $($url -match 'your-project')"
Write-Host "Key set: yes"
Write-Host "Key starts with eyJ: $($key.StartsWith('eyJ'))"
Write-Host "Key length: $($key.Length)"
Write-Host "Key is placeholder: $($key -match 'your-anon')"

try {
  $health = Invoke-WebRequest -Uri "$url/auth/v1/health" -Method GET -UseBasicParsing -TimeoutSec 20
  Write-Host "Supabase reachable: yes (HTTP $($health.StatusCode))"
} catch {
  Write-Host "Supabase reachable: NO"
  Write-Host "Error: $($_.Exception.Message)"
}

try {
  $headers = @{ apikey = $key; 'Content-Type' = 'application/json' }
  $body = '{"email":"test@example.com","password":"testpassword123"}'
  $signup = Invoke-WebRequest -Uri "$url/auth/v1/signup" -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 20
  Write-Host "Auth signup endpoint: HTTP $($signup.StatusCode)"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    Write-Host "Auth signup endpoint reachable: yes (HTTP $([int]$resp.StatusCode))"
  } else {
    Write-Host "Auth signup endpoint reachable: NO"
    Write-Host "Error: $($_.Exception.Message)"
  }
}
