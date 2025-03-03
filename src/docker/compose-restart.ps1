param (
    [Parameter(Mandatory = $true)] [ValidateScript({ Test-Path $_ })][string]$composeFilePath,
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
    Write-Host "Stopping, Removing Containers, Networks, and Volumes...`"$composeFilePath`""
}
else {
    Write-Host "Stopping...`"$composeFilePath`""
}
Invoke-Expression "docker compose -f $composeFilePath down $($downParams -join ' ')"

# Pull the Latest Images
Write-Host "Pulling the Latest Images...`"$composeFilePath`""
Invoke-Expression "docker compose -f $composeFilePath pull"

# Start the services with the Latest Images
Write-Host "Starting...`"$composeFilePath`""
Invoke-Expression "docker compose -f $composeFilePath up -d $($upParams -join ' ')"