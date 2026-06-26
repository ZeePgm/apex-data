$base = "https://apex-data-api.polar-baseball.workers.dev"
Write-Output "=== Player: origin/ericzhang ==="
try { $r = Invoke-RestMethod "$base/api/player/origin/ericzhang"; $r | ConvertTo-Json -Depth 3 -Compress } catch { Write-Output "Error: $($_.Exception.Message)" }
Write-Output ""
Write-Output "=== Map Rotation (raw) ==="
try { $r = Invoke-WebRequest "$base/api/map-rotation" -UseBasicParsing; Write-Output "Status: $($r.StatusCode)"; Write-Output $r.Content.Substring(0, [Math]::Min(300, $r.Content.Length)) } catch { Write-Output "Error: $($_.Exception.Message)" }
