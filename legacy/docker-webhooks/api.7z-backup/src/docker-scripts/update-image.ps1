# api/docker/update-image.ps1

# Clear-Host

# Pull the latest image
docker pull ghcr.io/the-running-dev/docker-webhooks:latest | Out-Null

# Stop the running container
docker stop docker-webhooks | Out-Null

# Remove the old container
docker rm docker-webhooks | Out-Null

if (-not (Get-Command "docker-compose" -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Compose Is Not Installed. Please Install It First..."

    exit 1
}

# Run docker-compose up
docker-compose up -d --quiet --remove-orphans