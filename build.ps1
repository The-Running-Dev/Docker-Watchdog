param(
    [bool]$gitHubPush = $true,
    [bool]$runInteractively = $false
)

Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'scripts\create-env.ps1') -runInteractively $runInteractively

if (-not $env:GitHubPackagesToken -or $env:GitHubPackagesToken -eq 'INSERT_YOUR_TOKEN_HERE') {
    # Check if the token is provided
    Write-Host "GitHub Packages Token is Required..." -ForegroundColor Red

    exit 1
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
docker build -t $env:ImageTag .

# Tag the Docker image for GitHub Container Registry
Write-Host "Tagging the Docker Image for GitHub Container Registry..."
docker tag $env:ImageTag $env:GitHubImageTag

if ($gitHubPush) {
    # Authenticate with GitHub Container Registry
    Write-Host "Authenticating with GitHub Container Registry..."
    $env:GitHubPackagesToken | docker login ghcr.io -u $env:GitHubUsername --password-stdin

    # Push the Docker image to GitHub Container Registry
    Write-Host "Pushing the Docker Image to GitHub Container Registry..."
    docker push $env:GitHubImageTag
}

# Clean up the deploy directory
Write-Host "Cleaning up the Deploy Directory..."
Remove-Item -Recurse -Force $env:DeployDir | Out-Null