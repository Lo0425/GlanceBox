# Starts the dashboard's Next.js dev server in the background.
# Invoked hidden by the "PersonalDashboardDevServer" scheduled task at logon.
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
$logFile = Join-Path $logDir "dev-server.log"

function Write-Log($message) {
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) $message"
}

Set-Location $projectRoot

$portInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Log "Port 3000 already in use - dev server appears to be running already. Skipping start."
    exit 0
}

Write-Log "Starting 'npm run dev' in $projectRoot ..."
try {
    & npm run dev *>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
    Write-Log "npm run dev exited with an error: $_"
}
