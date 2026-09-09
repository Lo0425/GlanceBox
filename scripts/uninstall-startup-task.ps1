# Removes the auto-start scheduled task created by install-startup-task.ps1.
$ErrorActionPreference = "Stop"

$taskName = "PersonalDashboardDevServer"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed scheduled task '$taskName'."
} else {
    Write-Host "No scheduled task named '$taskName' was found."
}
