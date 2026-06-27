Write-Output "=== Direct: Tracker.gg ==="
$trackerKey = $env:TRACKER_API_KEY
try {
  if (-not $trackerKey) {
    Write-Output "SKIPPED: TRACKER_API_KEY is not set"
  } else {
    $res = Invoke-WebRequest -Uri "https://public-api.tracker.gg/v2/apex/standard/profile/origin/ericzhang" -Headers @{"TRN-Api-Key"=$trackerKey} -UseBasicParsing -TimeoutSec 10
    Write-Output "Status: $($res.StatusCode)"
    Write-Output $res.Content.Substring(0, [Math]::Min(200, $res.Content.Length))
  }
} catch { Write-Output "FAILED: $($_.Exception.Message)" }
Write-Output ""
Write-Output "=== Direct: Mozambique ==="
$mozambiqueKey = $env:MOZAMBIQUE_API_KEY
try {
  if (-not $mozambiqueKey) {
    Write-Output "SKIPPED: MOZAMBIQUE_API_KEY is not set"
  } else {
    $res = Invoke-WebRequest -Uri "https://api.mozambiquehe.re/maprotation?version=2&auth=$mozambiqueKey" -UseBasicParsing -TimeoutSec 10
    Write-Output "Status: $($res.StatusCode)"
    Write-Output $res.Content.Substring(0, [Math]::Min(300, $res.Content.Length))
  }
} catch { Write-Output "FAILED: $($_.Exception.Message)" }
