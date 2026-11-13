Clear-Host

$basePath =  Split-Path $PSScriptRoot -Parent

# Define the event and workflow file
$eventType = "push"  # Change to "pull_request", "workflow_dispatch", etc.
$workflow = Join-Path $basePath '.github\workflows\build-container.yml'
$envFilePath = Join-Path $basePath '.env'

if (-not (Test-Path $envFilePath)) {
    Write-Error "Environment File Not Found: $envFilePath"

    exit 1
}

# Run the Act command
act -C $basePath -W $workflow --env-file $envFilePath $eventType