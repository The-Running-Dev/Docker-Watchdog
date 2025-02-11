& clear

# Define the URL of the webhook
$webhookUrl = "http://localhost:4000/webhook"

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
$response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonPayload -ContentType "application/json"

# Output the response
Write-Output $response