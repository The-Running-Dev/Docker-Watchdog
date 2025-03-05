param (
    [switch]$d = $false
)

Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'create-env.ps1') -runInteractively $true

# Check if the image exists
$imageExists = docker images -q $env:imageTag

if (-not $imageExists) {
    Write-Host "Image '$env:imageTag' Does Not Exist. Building the Image..."

    . ./build.ps1 -gitHubPush $false
} else {
    Write-Host "Image '$env:imageTag' Exists."
}

if (-not (Get-Command "docker-compose" -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Compose Is Not Installed. Please Install It First..."
    
    exit 1
}

# Run docker-compose up
$command = "docker-compose up" + ($d ? " -d" : "")
Invoke-Expression $command