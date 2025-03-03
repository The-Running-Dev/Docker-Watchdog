Clear-Host

# Include and execute the set-environment.ps1 script
. (Join-Path $PSScriptRoot 'set-environment.ps1')

if (-not $env:BaseUrl -or -not $env:APIKey) {
    Write-Output "Error: The BaseUrl or APIKey environment variables are not set."
    
    exit 1
}

# Define the URL of the webhook using the BaseUrl from environment variables
$webhookUrl = "$($env:BaseUrl)/webhook"

# Read the payload from webhook-sample.json
$payloadFilePath = Join-Path (Split-Path -Parent $PSScriptRoot) '.\data\webhook-sample.json'
$payload = Get-Content -Raw -Path $payloadFilePath | ConvertFrom-Json

# Convert the payload to JSON
$jsonPayload = $payload | ConvertTo-Json

# Send the POST request
$response = Invoke-RestMethod `
    -Uri $webhookUrl `
    -Method Post `
    -Body $jsonPayload `
    -ContentType 'application/json' `
    -Headers @{ "x-api-key" = $env:apiKey }

# Output the response
Write-Output $response