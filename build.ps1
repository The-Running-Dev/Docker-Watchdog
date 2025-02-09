#!/usr/bin/env pwsh

# Exit immediately if a command exits with a non-zero status.
$ErrorActionPreference = 'Stop'

# Check if the token is provided
if (-not $env:gitHubPackagesToken) {
    Write-Error "GitHub Packages Token is Required..."

    exit 1
}

$deployDir = './deploy'
$imageTag = 'docker-webhooks'
$ghcrImageTag = "ghcr.io/the-running-dev/$($imageTag):latest"
$gitHubUsername = 'the-running-dev'

# Define an array of files to copy
$filesToCopy = @("package.json", ".env")

# Write secrets to .env file
@"
DiscordBotToken=$($env:discordBotToken)
DiscordWebhookUrl=$($env:discordWebhookUrl)
"@ | Out-File -Encoding utf8 .env

# Create the deploy directory
Write-Host "Create The Deploy Directory..."
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# Build the app
Write-Host "Building the Application..."
try {
    # Install dependencies
    npm install
    
    # Create .env for Production
    Write-Host "Create .env for Production..."
    & npm run prestart:prod
    
    # Build the app
    Write-Host "Building the Application..."
    & npm run build
} catch {
    Write-Error "Node.js Build Failed."

    exit 1
}

# Copy files to the deploy directory
foreach ($file in $filesToCopy) {
    Write-Host "Copying $file to the Deploy Directory..."
    
    Copy-Item -Recurse -Force $file -Destination $deployDir | Out-Null
}

# Build the Docker image
Write-Host "Building the Docker Image..."
docker build -t $imageTag .

# Tag the Docker image for GitHub Container Registry
Write-Host "Tagging the Docker Image for GitHub Container Registry..."
docker tag $imageTag $ghcrImageTag

# Authenticate with GitHub Container Registry
Write-Host "Authenticating with GitHub Container Registry..."
$env:gitHubPackagesToken | docker login ghcr.io -u $gitHubUsername --password-stdin

# Push the Docker image to GitHub Container Registry
Write-Host "Pushing the Docker Image to GitHub Container Registry..."
docker push $ghcrImageTag

# Clean up the deploy directory
Write-Host "Cleaning up the Deploy Directory..."
Remove-Item -Recurse -Force $deployDir | Out-Null