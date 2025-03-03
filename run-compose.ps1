param (
    [switch]$d = $false
)

# Include the environment-functions
. (Join-Path $PSScriptRoot 'scripts\environment-functions.ps1')

Get-Environment `
    -envFilePath $(Join-Path $PSScriptRoot '.env') `
    -envBuildFilePath $(Join-Path $PSScriptRoot 'build.env')

# Check if the image exists
$imageExists = docker images -q $env:imageTag

if (-not $imageExists) {
    Write-Host "Image '$env:imageTag' Does Not Exist. Building the Image..."

    . ./build.ps1 -pushToGitHub $false
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