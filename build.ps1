param(
    [bool]$pushToGitHub = $true
)

Clear-Host

# Exit immediately if a command exits with a non-zero status.
$ErrorActionPreference = 'Stop'

# Include the environment-functions
. (Join-Path $PSScriptRoot 'scripts\environment-functions.ps1')

$envFile = Join-Path $PSScriptRoot '.env' -Resolve
$envBuildFile = Join-Path $PSScriptRoot '.env.build' -Resolve

Write-Host "envFile: $envFile"
Write-Host "envBuildFile: $envBuildFile"

# Debugging: Check if the files exist
if (Test-Path $envFile) {
    Write-Host "File Exists: $envFile"
} else {
    Write-Host "File Not Found: $envFile"
}

if (Test-Path $envBuildFile) {
    Write-Host "File Exists: $envBuildFile"
} else {
    Write-Host "File Not Found: $envBuildFile"
}

Get-Environment `
    -envFilePath $(Join-Path $PSScriptRoot '.env') `
    -envBuildFilePath $(Join-Path $PSScriptRoot '.env.build')

# Iterate over all environment variables and print their names and values
Write-Host "Environment Variables:"
Get-ChildItem Env: | ForEach-Object {
    Write-Host "$($_.Name) = $($_.Value)"
}

# Check if the token is provided
if (-not $env:gitHubPackagesToken) {
    Write-Error "GitHub Packages Token is Required..."

    exit 1
}

write-host "deployDir: $($env:deployDir)"

# Define a hashtable of files to copy with destination as key and array of files as values
$filesToCopy = @{
    $env:deployDir = @("package.json", ".env", "pnpm-lock.yaml")
    (Join-Path $env:deployDir 'docker') = (Get-ChildItem -Path './src/docker' -Filter '*.ps1' | ForEach-Object { $_.FullName })
}

# Create the deploy directory
Write-Host "Create The Deploy Directory..."
New-Item -ItemType Directory -Force -Path $env:deployDir | Out-Null

# Build the app
Write-Host "Building the Application..."
try {
    # Install dependencies
    pnpm install
    
    Write-Host "Building the Application..."
    & pnpm run prod
} catch {
    Write-Error "Node.js Build Failed...."

    exit 1
}

# Copy files to the deploy directory
foreach ($destination in $filesToCopy.Keys) {
    foreach ($file in $filesToCopy[$destination]) {
        Write-Host "Copying $((Get-Item $file).Name) to the $destination..."
        
        Copy-Item -Recurse -Force $file -Destination $destination | Out-Null
    }
}

# Build the Docker image
Write-Host "Building the Docker Image..."
docker build -t $env:imageTag .

# Tag the Docker image for GitHub Container Registry
Write-Host "Tagging the Docker Image for GitHub Container Registry..."
docker tag $env:imageTag $env:ghcrImageTag

if ($pushToGitHub) {
    # Authenticate with GitHub Container Registry
    Write-Host "Authenticating with GitHub Container Registry..."
    $env:gitHubPackagesToken | docker login ghcr.io -u $env:gitHubUsername --password-stdin

    # Push the Docker image to GitHub Container Registry
    Write-Host "Pushing the Docker Image to GitHub Container Registry..."
    docker push $env:ghcrImageTag
}

# Clean up the deploy directory
Write-Host "Cleaning up the Deploy Directory..."
Remove-Item -Recurse -Force $env:deployDir | Out-Null