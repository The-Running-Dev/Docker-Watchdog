param(
    [bool]$gitHubPush = $true,
    [bool]$runInteractively = $false,
    [bool]$isProduction = $true
)

Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'scripts\create-env.ps1') -runInteractively $runInteractively

$packagesFilePath = Join-Path $PSScriptRoot 'package.json'

# Check and install the GitHubCLI
Install-GitHubCli

$releaseNotes = Get-ReleaseNotes -packagesFilePath $packagesFilePath

if (-not $env:GitHubPackagesToken -or $env:GitHubPackagesToken -eq 'INSERT_YOUR_TOKEN_HERE') {
    # Check if the token is provided
    Write-Host "GitHub Packages Token is Required..." -ForegroundColor Red
    
    exit 1
}

$dockerTags = @{
    local = @(
        "$($env:ImageTag):latest"
        "$($env:ImageTag):$($releaseNotes.Version)"
    );
    remote = @(
        "$($env:GitHubImageTag):latest"
        "$($env:GitHubImageTag):$($releaseNotes.Version)"
    )
}

# Define a hashtable of files to copy with destination as key and array of files as values
$filesToCopy = @{
    $env:DeployDir = @("package.json", ".env", "pnpm-lock.yaml")
    (Join-Path $env:DeployDir 'docker') = (Get-ChildItem -Path './src/docker' -Filter '*.ps1' | ForEach-Object { $_.FullName })
}

# Create the deploy directory
Write-Host "Create The Deploy Directory..."
New-Item -ItemType Directory -Force -Path $env:DeployDir | Out-Null

# Build the app
Write-Host "Building the Application..."
try {
    # Install dependencies
    pnpm install

    if ($isProduction -and $gitHubPush) {
        # Bump the version
        npm version patch --no-git-tag-version
    }

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

# Enable Docker BuildKit
$env:DOCKER_BUILDKIT = 1

# Build the Docker image
Write-Host "Building the Docker Image..."

# Build the Docker image with the first tag
$baseTag = $($dockerTags.local | Select-Object -First 1)
docker build -t $baseTag .

# Tag the image with additional tags
$dockerTags.local | Select-Object -Skip 1 | ForEach-Object {
    docker tag $baseTag $_
}

if ($gitHubPush) {
    # Create a GitHub package for Docker Image
    Write-Host "Creating GitHub Package for Docker Image..."
    $dockerTagsRemote = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "^ghcr.io/$env:GitHubUsername/$($env:GitHubImageTag)" }

    $dockerTagsRemote | ForEach-Object {
        if (-not [string]::IsNullOrEmpty($_)) {
            $parts = $_.Split(':')

            if ($parts.Length -eq 2) { # Expecting two parts now
                $tagName = $parts[1].Trim() # Tag is the second part

                if ($tagName -match "^[a-zA-Z0-9._-]+$") {
                    $imageUrl = "ghcr.io/$($env:GitHubUsername)/$($env:GitHubImageTag):$tagName"
                    $imageUrlFile = "$env:DeployDir/$tagName.txt"
                    $imageUrl | Out-File -FilePath $imageUrlFile -Encoding utf8

                    gh package create $tagName `
                        --repo the-running-dev/docker-webhooks `
                        --title "Docker Image: $tagName" `
                        --notes "Docker Image: $tagName"

                    gh package upload $tagName $imageUrlFile
                } else {
                    Write-Host "Invalid Tag Name: $tagName" -ForegroundColor Red
                }
            } else {
                Write-Host "Unexpected Docker Images Output: $_" -ForegroundColor Red
            }
        }
    }
#    # Tag the Docker image for GitHub Container Registry
#    Write-Host "Tagging the Docker Image for GitHub Container Registry..."
#    $dockerTags.remote | ForEach-Object { docker tag $baseTag $_ }
#
#    # Authenticate with GitHub Container Registry
#    Write-Host "Authenticating with GitHub Container Registry..."
#    $env:GitHubPackagesToken | docker login ghcr.io -u $env:GitHubUsername --password-stdin
#
#    # Push the Docker image to GitHub Container Registry
#    Write-Host "Pushing the Docker Image to GitHub Container Registry..."
#    $dockerTags.remote | ForEach-Object { docker push $_ }
#
#    # Create a GitHub package for Docker Image
#    Write-Host "Creating GitHub Package for Docker Image..."
#    $dockerTagsRemote = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "^ghcr.io/$env:GitHubUsername/$($env:GitHubImageTag)" }
#
#    $dockerTagsRemote | ForEach-Object {
#        if (-not [string]::IsNullOrEmpty($_)) {
#            $parts = $_.Split(':')
#            
#            if ($parts.Length -eq 2) { # Expecting two parts now
#                $tagName = $parts[1].Trim() # Tag is the second part
#                
#                if ($tagName -match "^[a-zA-Z0-9._-]+$") {
#                    $imageUrl = "ghcr.io/$($env:GitHubUsername)/$($env:GitHubImageTag):$tagName"
#                    $imageUrlFile = "$env:DeployDir/$tagName.txt"
#                    $imageUrl | Out-File -FilePath $imageUrlFile -Encoding utf8
#
#                    gh release create $tagName `
#                        --repo the-running-dev/docker-webhooks `
#                        --title "Docker Image: $tagName" `
#                        --notes "Docker Image: $tagName"
#
#                    gh release upload $tagName $imageUrlFile
#                } else {
#                    Write-Host "Invalid Tag Name: $tagName" -ForegroundColor Red
#                }
#            } else {
#                Write-Host "Unexpected docker images output: $_" -ForegroundColor Red
#            }
#        }
#    }
}

# Clean up the deploy directory
Write-Host "Cleaning up the Deploy Directory..."
Remove-Item -Recurse -Force $env:DeployDir | Out-Null