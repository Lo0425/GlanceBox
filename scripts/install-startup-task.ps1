# Registers a Windows Task Scheduler task that starts the dashboard's dev
# server (hidden, no visible window) whenever you log into this PC.
# Run once, from a normal (non-admin) PowerShell prompt:
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-startup-task.ps1
$ErrorActionPreference = "Stop"

$taskName = "PersonalDashboardDevServer"
$scriptPath = Join-Path $PSScriptRoot "start-dev-server.ps1"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "Installed scheduled task '$taskName'."
Write-Host "It will start the dashboard dev server automatically the next time you log in."
Write-Host ""
Write-Host "To start it right now without logging out/in:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
Write-Host ""
Write-Host "Logs: logs\dev-server.log (in the project root)"
Write-Host "To remove it later: .\scripts\uninstall-startup-task.ps1"
