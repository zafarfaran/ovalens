# Kill any process listening on port 8000 (e.g. stale uvicorn).
# Run from repo root or apps/api: .\scripts\kill-port-8000.ps1
$port = 8000
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if (-not $listeners) {
  Write-Host "No process listening on port $port."
  exit 0
}
foreach ($procId in $listeners) {
  if ($procId -match '^\d+$') {
    Write-Host "Killing process $procId on port $port..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    taskkill /F /PID $procId 2>$null
  }
}
Write-Host "Done."
Write-Host "Restart API with: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
exit 0
