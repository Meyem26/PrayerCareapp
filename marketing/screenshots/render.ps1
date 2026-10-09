param(
  [string[]]$Themes = @('navy', 'evergreen'),
  [string[]]$Sizes = @('apple', 'play'),
  [int[]]$Shots = @(1, 2, 3, 4, 5, 6)
)

# Chrome reports progress on stderr; don't treat that as a failure.
$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }

$dims = @{ apple = '1290,2796'; play = '1080,1920' }
$page = 'file:///' + ((Join-Path $here 'campaign.html') -replace '\\', '/')

foreach ($theme in $Themes) {
  foreach ($size in $Sizes) {
    $dir = Join-Path $here "out\$theme\$size"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    foreach ($shot in $Shots) {
      $file = Join-Path $dir ("{0:D2}.png" -f $shot)
      $url = "$page`?shot=$shot&theme=$theme&size=$size"
      & $chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
        --allow-file-access-from-files --window-size=$($dims[$size]) --virtual-time-budget=6000 `
        "--screenshot=$file" $url 2>&1 | Out-Null
      Write-Output "rendered $theme/$size/$("{0:D2}" -f $shot).png"
    }
  }
}
