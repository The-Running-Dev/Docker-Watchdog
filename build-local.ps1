Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'build.ps1') -gitHubPush $false -runInteractively $true