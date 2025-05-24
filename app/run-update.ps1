Import-Module (Join-Path $PSScriptRoot "watchdog.psm1") -Force

Get-Config

$update = Start-Update