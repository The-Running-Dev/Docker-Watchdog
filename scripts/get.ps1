Clear-Host

# Include and execute the set-environment.ps1 script
. (Join-Path $PSScriptRoot 'set-environment.ps1')

if (-not $env:BaseUrl -or -not $env:APIKey) {
    Write-Output "Error: The BaseUrl or APIKey environment variables are not set."
    
    exit 1
}

# Send the GET request with the API key in the headers
$response = Invoke-RestMethod `
    -Uri $env:BaseUrl `
    -Method Get `
    -ContentType "application/json" `
    -Headers @{ "x-api-key" = $env:APIKey }

# Output the response
Write-Output $response