& clear

$basePath =  Split-Path $PSScriptRoot -Parent

# Define the event and workflow file
$eventType = "push"  # Change to "pull_request", "workflow_dispatch", etc.
$workflow = Join-Path $basePath '.github\workflows\build-container.yml'

# Run the Act command
act -W $workflow $eventType