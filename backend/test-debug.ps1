$base = "https://apex-data-api.polar-baseball.workers.dev"
Write-Output "=== Debug Connectivity ==="
try { (Invoke-RestMethod "$base/debug/connectivity") | ConvertTo-Json -Depth 2 } catch { Write-Output "Error: $($_.Exception.Message)" }
