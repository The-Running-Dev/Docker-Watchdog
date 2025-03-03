# Include the environment-functions
. (Join-Path $PSScriptRoot 'environment-functions.ps1')

Get-Environment `
    -envFilePath $(Join-Path $PSScriptRoot '.env') `
    -envBuildFilePath $(Join-Path $PSScriptRoot 'build.env')

# Check if the image exists
$imageExists = docker images -q $env:imageTag

if (-not $imageExists) {
    Write-Host "Image '$env:imageTag' Does Not Exist. Building the Image..."

    . ./build.ps1 -pushToGitHub $false
}

& docker run -it $env:imageTag sh