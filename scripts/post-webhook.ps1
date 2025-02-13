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
$webhookUrl = "http://localhost:4000/webhook"

# Get the API key from the environment variables
$apiKey = [System.Environment]::GetEnvironmentVariable("APIKey")

# Define the payload to send in the POST request
$payload = @{
    event = "webhook"
    data = @{
        imageTag = "barstrad-ui"
    }
}

# Convert the payload to JSON
$jsonPayload = $payload | ConvertTo-Json

# Send the POST request
$response = Invoke-RestMethod `
    -Uri $webhookUrl `
    -Method Post `
    -Body $jsonPayload `
    -ContentType 'application/json' `
    -Headers @{ "x-api-key" = $apiKey }

# Output the response
Write-Output $response