# Builds the image and pushes it to GHCR by hand. CI (.github/workflows/image.yml) does this on every push to main.
if (-not $env:PackagesToken -or [string]::IsNullOrWhiteSpace($env:PackagesToken)) {
    Write-Host "❌ Packages Token is required..."

    exit 1
}

$imageName = "subzerodev-watchdog"
$ghcrImageTag = "ghcr.io/the-running-dev/$($imageName):latest"
$gitHubUsername = "the-running-dev"
$buildDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "🐳 Building the Docker image..."
& docker build --build-arg "BUILD_DATE=$buildDate" -t $imageName .

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🏷️ Tagging the Docker image for GitHub Container Registry..."
& docker tag $imageName $ghcrImageTag

Write-Host "🔐 Authenticating with GitHub Container Registry..."
$env:PackagesToken | & docker login ghcr.io -u $gitHubUsername --password-stdin

Write-Host "🚀 Pushing the Docker image to GitHub Container Registry..."
& docker push $ghcrImageTag
