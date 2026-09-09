# Stops the dashboard dev server if it's currently running on port 3000.
$ErrorActionPreference = "Stop"

$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "Nothing is listening on port 3000."
    exit 0
}

$conn | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    Stop-Process -Id $_ -Force
    Write-Host "Stopped process $_ (was listening on port 3000)."
}
