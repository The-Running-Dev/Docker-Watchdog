#!/usr/bin/env pwsh

$gunicorn = "/opt/venv/bin/gunicorn"

$ErrorActionPreference = "Stop"

Import-Module "$PSScriptRoot/watchdog.psm1"

if (-not (Get-Command Write-Log -ErrorAction SilentlyContinue)) {
    Write-Error "❌ ERROR: Write-Log() Function Not Found. Failed to Load watchdog.psm1"

    exit 1
}

# Ensure PORT is set
if (-not $env:PORT) {
    $env:PORT = "80"

    Write-Log "⚠️ PORT Not Set, Using Default: 80"
}

# Check required files
if (-not (Test-Path "/app/api/api.py")) {
    Write-Error "❌ ERROR: api.py Not Found!"

    exit 1
}
if (-not (Test-Path $gunicorn)) {
    Write-Log "❌ ERROR: Gunicorn Not Found at $gunicorn"

    exit 1
}

Get-Config

$env:SEND_API_NOTIFICATIONS=$script:config.SendAPINotifications
$env:DISCORD_WEBHOOK_URL=$script:config.DiscordWebhookUrl
$env:TIME_ZONE=$script:config.TimeZone

# Start Flask API via Gunicorn
Write-Log "🚀 Starting Flask API On Port $($env:PORT), Notifications: $($env:SEND_API_NOTIFICATIONS)..."

Start-Process -FilePath $gunicorn `
  -ArgumentList "-w", "2", "--timeout", "120", "-b", "0.0.0.0:$env:PORT", "api.api:app" `
  -NoNewWindow -PassThru | ForEach-Object { $apiPid = $_.Id }

Start-Sleep -Seconds 2

if (-not (Get-Process -Id $apiPid -ErrorAction SilentlyContinue)) {
    Write-Log "❌ ERROR: Flask API Failed to Start!"

    exit 1
}

# Handle shutdown
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Log "🔻 Shutting Down..."

    try {
        Stop-Process -Id $apiPid -Force -ErrorAction SilentlyContinue
    } catch {}

    Write-Log "👋 Goodbye!"
}

Install-Updater

Start-Watchdog