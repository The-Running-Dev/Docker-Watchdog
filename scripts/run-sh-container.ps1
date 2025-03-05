Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'create-env.ps1') -runInteractively $true

# Check if the image exists
$imageExists = docker images -q $env:imageTag

if (-not $imageExists) {
    Write-Host "Image '$env:imageTag' Does Not Exist. Building the Image..."

    . ./build.ps1 -gitHubPush $false
}

& docker run -it $env:imageTag sh