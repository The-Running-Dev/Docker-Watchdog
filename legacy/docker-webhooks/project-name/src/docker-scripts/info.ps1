# api/docker/info.ps1

try {
    $dockerVersion = & docker version --format '{{json .}}' 2>&1
    
    if ($dockerVersion -match "Cannot connect to the Docker daemon") {
        return @{
            isRunning = $false
            message = "Cannot Connect to the Docker Daemon."
        } | ConvertTo-Json
    }

    $dockerVersionJson = $dockerVersion | ConvertFrom-Json
    
    if (-not $dockerVersionJson.Server.Version) {
        return @{
            isRunning = $false
            message = "Docker Server is Not Running."
        } | ConvertTo-Json
    }

    return @{
        isRunning = $true
        message = "Docker Server is Running. Version: $($dockerVersionJson.Server.Version)"
    } | ConvertTo-Json
} catch {
    return @{
        isRunning = $false
        message = "Error Checking Docker Server Status. Error: $($_.Exception.Message)"
    } | ConvertTo-Json
}