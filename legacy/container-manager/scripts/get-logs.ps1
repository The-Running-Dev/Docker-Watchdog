Clear-Host

# Include the and execute the create-env script
. (Join-Path $PSScriptRoot 'create-env.ps1') -runInteractively $false

if (-not $env:BaseUrl -or -not $env:APIKey) {
    Write-Output "Error: The BaseUrl or APIKey environment variables are not set."
    
    exit 1
}

# Define the URL of the webhook using the BaseUrl from environment variables
$logsUrl = "$($env:BaseUrl)/logs"

# Send the GET request with the API key in the headers
$response = Invoke-RestMethod `
    -Uri $logsUrl `
    -Method Get `
    -ContentType "application/json" `
    -Headers @{ "x-api-key" = $env:APIKey }

# Output the response
Write-Output $response