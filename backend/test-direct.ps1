Write-Output "=== Direct: Tracker.gg ==="
try {
  $res = Invoke-WebRequest -Uri "https://public-api.tracker.gg/v2/apex/standard/profile/origin/ericzhang" -Headers @{"TRN-Api-Key"="98c1a5cf-793f-4932-8c2d-ae73dfa5b0d7"} -UseBasicParsing -TimeoutSec 10
  Write-Output "Status: $($res.StatusCode)"
  Write-Output $res.Content.Substring(0, [Math]::Min(200, $res.Content.Length))
} catch { Write-Output "FAILED: $($_.Exception.Message)" }
Write-Output ""
Write-Output "=== Direct: Mozambique ==="
try {
  $res = Invoke-WebRequest -Uri "https://api.mozambiquehe.re/maprotation?version=2&auth=df4864ce3a1c5b947ed32867dbb9d43f" -UseBasicParsing -TimeoutSec 10
  Write-Output "Status: $($res.StatusCode)"
  Write-Output $res.Content.Substring(0, [Math]::Min(300, $res.Content.Length))
} catch { Write-Output "FAILED: $($_.Exception.Message)" }
