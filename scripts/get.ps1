# Define the URL of the webhook
$webhookUrl = "http://localhost:4000"

# Send the POST request
$response = Invoke-RestMethod -Uri $webhookUrl -Method Get -ContentType "application/json"

# Output the response
Write-Output $response