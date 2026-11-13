# api/docker/compose-restart.ps1

param (
    [Parameter(Mandatory)] [ValidateScript({ Test-Path $_ })][string]$composeFile,
    [bool]$hardReset = $false
)

# Define the parameters for the down and up commands
$downParams = @()
$upParams = @()

if ($hardReset) {
    $downParams += '-v --remove-orphans'
    $upParams += '--force-recreate'
}

# Stop and remove containers, networks, and volumes if hard reset is true
if ($hardReset) {
    Write-Host "Stopping, Removing Containers, Networks, and Volumes...`"$composeFile`""
}
else {
    Write-Host "Stopping...`"$composeFile`""
}

Invoke-Expression "docker compose -f $composeFile down $($downParams -join ' ')"

# Pull the Latest Images
Write-Host "Pulling the Latest Images...`"$composeFile`""
Invoke-Expression "docker compose -f $composeFile pull"

# Start the services with the Latest Images
Write-Host "Starting...`"$composeFile`""
Invoke-Expression "docker compose -f $composeFile up -d $($upParams -join ' ')"