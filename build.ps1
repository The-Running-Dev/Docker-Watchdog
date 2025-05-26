# Validate that the GitHub token is set
if (-not $env:GitHubPackagesToken -or [string]::IsNullOrWhiteSpace($env:GitHubPackagesToken)) {
    Write-Host "❌ GitHub Packages Token is required..."

    exit 1
}

$imageTag = "watchdog"
$ghcrImageTag = "ghcr.io/the-running-dev/$($imageTag):latest"
$gitHubUsername = "the-running-dev"

# Build the Docker image
Write-Host "🐳 Building the Docker image..."
& docker build -t $imageTag .

# Tag the image for GitHub Container Registry
Write-Host "🏷️ Tagging the Docker image for GitHub Container Registry..."
& docker tag $imageTag $ghcrImageTag

# Authenticate with GitHub Container Registry
Write-Host "🔐 Authenticating with GitHub Container Registry..."
$env:gitHubPackagesToken | & docker login ghcr.io -u $gitHubUsername --password-stdin

# Push the image
Write-Host "🚀 Pushing the Docker image to GitHub Container Registry..."
& docker push $ghcrImageTag
