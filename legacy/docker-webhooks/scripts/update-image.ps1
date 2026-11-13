Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'create-env.ps1') -runInteractively $false

if (-not $env:BaseUrl -or -not $env:APIKey) {
    Write-Output "Error: The BaseUrl or APIKey environment variables are not set."
    
    exit 1
}

# Define the URL of the webhook using the BaseUrl from environment variables
$updateUrl = "$($env:BaseUrl)/update"

# Send the POST request
$response = Invoke-RestMethod `
    -Uri $updateUrl `
    -Method Post `
    -Body $jsonPayload `
    -ContentType 'application/json' `
    -Headers @{ "x-api-key" = $env:apiKey }

# Output the response
Write-Output $response