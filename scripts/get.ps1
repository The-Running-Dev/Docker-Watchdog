& clear

# Load the .env file
$envFilePath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'

if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        if ($_ -match "^(.*?)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

# Define the URL of the webhook
$webhookUrl = "http://localhost:4000"

# Get the API key from the environment variables
$apiKey = [System.Environment]::GetEnvironmentVariable("APIKey")

# Send the GET request with the API key in the headers
$response = Invoke-RestMethod `
    -Uri $webhookUrl `
    -Method Get `
    -ContentType "application/json" `
    -Headers @{ "x-api-key" = $apiKey }

# Output the response
Write-Output $response