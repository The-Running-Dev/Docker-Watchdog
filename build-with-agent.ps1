param (
    [switch]$interactive,
    [string]$imageName = "ghcr.io/the-running-dev/build-agent:latest",
    [string]$projectPath = "$(Resolve-Path .)"
)

$absoluteProjectPath = (Resolve-Path $projectPath).Path

Write-Host "🛠️ Using Image: $imageName"
Write-Host "📂 Mounting Project: $absoluteProjectPath"

$dockerArgs = @('--rm')

if ($interactive.IsPresent) {
    $dockerArgs += '-it'
}

$dockerArgs += @(
    '-v', "${absoluteProjectPath}:/workspace",
    '-w', '/workspace',
    '-e', 'DOCKER_HOST=tcp://host.docker.internal:2375',
    $imageName,
    'pwsh'
)

if (-not $interactive.IsPresent) {
    $dockerArgs += @('-Command', 'docker-ci')
}

docker run @dockerArgs