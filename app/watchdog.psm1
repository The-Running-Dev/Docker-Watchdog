$script:config = @{
    ProjectsDirectory = "/projects"
    ContainerDependencies = @{}
    CronFilePath = "/etc/cron.d/watchdog"
    CronSchedule = "0 4 * * *"
    DiscordWebhookUrl = ""
    DockerComposeAdditionalArgs = @(
        "--always-recreate-deps"
        "--remove-orphans"
    )
    ExcludeProjects = @()
    IncludeProjects = @()
    LogFilePath = "/tmp/watchdog.log"
    LockFilePath = "/tmp/watchdog.lock"
    PulledImages = @{}
    SendUpdaterNotifications = $true
    SendMonitorNotifications = $false
    SendAPINotifications = $false
    UpdaterTest = true
    UpdaterCronJob = true
    UpdaterNotificationTitle = "Containers Update"
}

function Add-UpdaterCronJob {
    if (-not $script:config.UpdaterCronJob) {
        Write-Warning "🛠️ Skipping Cron Job Setup"

        return
    }

    $scriptPath = Join-Path $PSScriptRoot "run-update.ps1"

    Write-Info "🛠️ Setting Up Cron Job for Docker Updater"

    # Read schedule
    $schedule = $script:config.CronSchedule | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' } | Select-Object -First 1
    if (-not $schedule) {
        Write-Error "❌ ERROR: No Valid Cron Expression Found in Configuration File. Exiting..."

        return
    }

    # Build cron command
    $cronCommand = "$schedule root /usr/bin/pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$scriptPath`" >> /var/log/watchdog.log 2>&1`n"

    # Write cron.d entry
    Set-Content -Path $script:config.CronFilePath -Value $cronCommand

    chmod 0644 $script:config.CronFilePath

    Write-Info "🕒 Installed Cron Job: $cronCommand"

    # Start cron
    if (Get-Command service -ErrorAction SilentlyContinue) {
        & service cron start

        Write-Info "🚀 Cron Daemon Started"
    } elseif (Get-Command crond -ErrorAction SilentlyContinue) {
        & crond

        Write-Info "🚀 Crond Started (Alpine Style)"
    } else {
        Write-Warning "⚠️ No Cron Service Found to Start!"
    }
}

function Confirm-ImageUpdated {
    param (
        [Parameter(Mandatory)][string]$image,
        [Parameter(Mandatory)][string]$container
    )

    try {
        if (-not $script:config.PulledImages.ContainsKey($image)) {
            if ($script:config.UpdaterTest) {
                Write-Info "`tℹ️ Simulating Pulling Image $image"

                return $true
            } else {
                Invoke-DockerPull $image
            }

            $script:config.PulledImages[$image] = $true
        }

        $latestImageId = (Invoke-DockerImageInspect $image | ConvertFrom-Json)[0].Id
        $runningImageId = (Invoke-DockerInspect $container | ConvertFrom-Json)[0].Image

        if ($latestImageId -ne $runningImageId) {
            Write-Error "`t✅ New Images Exists..."
        }

        return $latestImageId -ne $runningImageId
    } catch {
        Write-Error "⚠️ Failed to Compare Image for $container. Assuming Update is Needed."

        return $true
    }
}

function Confirm-IncludeProject {
    param (
        [Parameter(Mandatory)][string]$projectName
    )

    if ($script:config.IncludeProjects.Count -gt 0) {
        return $script:config.IncludeProjects -contains $projectName
    } else {
        return -not ($script:config.ExcludeProjects -contains $projectName)
    }
}

function Confirm-PreflightCheck {
    Write-Info "🔍 Pre-Flight Checks..."

    if (-not (Test-Path $script:config.ProjectsDirectory)) {
        Write-Error "❌ Base Directory '$($script:config.ProjectsDirectory)' Not Found...Exiting"

        return $false
    }

    if ($script:config.DiscordWebhookUrl -notmatch "^https://discord.com/api/webhooks/") {
        Write-Error "❌ Discord Webhook URL is Invalid...Disabling Notifications"

        $script:config.SendUpdaterNotifications = $false
        $script:config.SendMonitorNotifications = $false
        $script:config.SendAPINotifications = $false
    }

    if (-not (Get-ChildItem -Recurse -Filter 'docker-compose*' $script:config.ProjectsDirectory -File -ErrorAction SilentlyContinue)) {
        Write-Error "🗂️ Did You Map '$($script:config.ProjectsDirectory)' as a Docker Volume?"
        Write-Error "❌ No Compose Files Found in Base Directory '$($script:config.ProjectsDirectory)'...Exiting"

        return $false
    }

    Write-Info "✅ Pre-Flight Checks Passed."

    return $true
}

function Convert-ToCapitalCase {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory, ValueFromPipeline)][string]$inputString
    )

    process {
        $words = ($InputString -creplace '([a-z])([A-Z])', '$1 $2')
        $culture = [System.Globalization.CultureInfo]::InvariantCulture
        $titleCased = $culture.TextInfo.ToTitleCase($words.ToLower())

        return $titleCased
    }
}

function Get-ProjectsWithUpdatedImages {
    $projects = @()

    Write-Info "🔍 Scanning for Docker Compose Projects in $($script:config.ProjectsDirectory)..."

    $composeFiles = Get-ChildItem `
        -File `
        -Path $script:config.ProjectsDirectory `
        -Recurse `
        -Filter 'docker-compose*.yml' | Sort-Object FullName
    
    if (-not $composeFiles) {
        Write-Error "❌ No Docker Compose Files Found in $($script:config.ProjectsDirectory)...Exiting"

        return $projects
    }
    
    foreach ($composeFile in $composeFiles) {
        $project = Split-Path $composeFile.FullName -Parent | Split-Path -Leaf
        $configDir = Split-Path $composeFile.FullName -Parent
        $containers = @()

        Write-Info "$($project):"

        if (-not (Confirm-IncludeProject $project)) {
            Write-Warning "`t❌ Skipped (Excluded)"

            continue
        }

        $containers = @(& docker ps --filter "label=com.docker.compose.project=$project" --format '{{.Names}}={{.Image}}' | ForEach-Object {
            $parts = $_ -split '='
        
            if ($parts.Count -eq 2) {
                [PSCustomObject]@{
                    Name  = $parts[0].Trim()
                    Image = $parts[1].Trim()
                }
            }
        })

        if ($containers.Count -eq 0) {
            Write-Info "`tℹ️ No Running Services...Skipping."

            continue
        }

        $updatedImages = 0
        $containers | ForEach-Object {
            $name = $_.Name.Trim()
            $image = $_.Image.Trim()
            $hasUpdatedImages = Confirm-ImageUpdated -image $image -container $name

            if ($hasUpdatedImages) {
                $updatedImages++
            }
        }

        if ($updatedImages -eq 0) {
            Write-Info "`tℹ️ No Image Updates...Skipping."

            continue
        }

        $projects += [PSCustomObject]@{
            Name                = $project
            Directory           = $configDir
            Config              = Split-Path $composeFile -Leaf
            ComposeFile         = $composeFile.FullName
            Containers          = $containers
            HasUpdatedImages    = $updatedImages -gt 0
        }
    }

    return $projects
}

function Set-APIConfig {
    $env:SendAPINotifications = $script:config.SendAPINotifications
    $env:DiscordWebhookUrl = $script:config.DiscordWebhookUrl
    $env:TimeZone = ([System.TimeZoneInfo]::Local).Id
}

function Get-Config {
    $configFilePath = Join-Path $PSScriptRoot "config.json"
    $configOverridesPath = Join-Path $PSScriptRoot "config.overrides.json"

    if (Test-Path $configFilePath) {
        Write-Info "Configuration File: $configFilePath"

        $baseConfig = Read-ConfigFile $configFilePath

        foreach ($key in $baseConfig.Keys) {
            $script:config[$key] = $baseConfig[$key]
        }
    } else {
        Write-Warning "No config.json Found — Using Defaults."
    }

    if (Test-Path $configOverridesPath) {
        Write-Info "Configuration Overrides: $configOverridesPath"

        $overrides = Read-ConfigFile $configOverridesPath

        foreach ($key in $overrides.Keys) {
            $script:config[$key] = $overrides[$key]
        }
    }

    Write-Info "🔍 Configuration"

    $script:config.GetEnumerator() | Sort-Object Name | ForEach-Object {
        $key = $_.Key | Convert-ToCapitalCase
        $value = $_.Value

        if ($_.Key -eq "ContainerDependencies") {
            $value = ($value.GetEnumerator() | Sort-Object Name | ForEach-Object {
                "$($_.Key): $($_.Value)"
            }) -join ", "
        }
        elseif ($_.Key -eq "DiscordWebhookUrl") {
            $value = "********"
        }
        elseif ($_.Key -eq "PulledImages") {
            return
        }

        Write-Info "$($key): $value"
    }
}

function Get-Lock {
    if (Test-Path $script:config.LockFilePath) {
        Write-Error "Lock File Exists. Exiting...."

        return
    }

    New-Item -ItemType File -Path $script:config.LockFilePath | Out-Null

    Register-EngineEvent PowerShell.Exiting -Action {
        Remove-Item -Path $script:config.LockFilePath -Force
    } | Out-Null
}

function Get-TimeStamp {
    try {
        $tz = [System.TimeZoneInfo]::Local
        $utcNow = (Get-Date).ToUniversalTime()
        $localTime = [System.TimeZoneInfo]::ConvertTimeFromUtc($utcNow, $tz)

        $offset = $tz.GetUtcOffset($localTime)
        $sign = if ($offset.TotalMinutes -lt 0) { "-" } else { "+" }
        $offsetFormatted = "{0}{1:00}:{2:00}" -f $sign, [math]::Abs($offset.Hours), [math]::Abs($offset.Minutes)

        return "{0} {1}" -f $localTime.ToString("yyyy-MM-dd HH:mm:ss"), $offsetFormatted
    } catch {
        $fallbackTime = (Get-Date).ToUniversalTime()

        return "{0} +00:00" -f $fallbackTime.ToString("yyyy-MM-dd HH:mm:ss")
    }
}

function Install-Updater {
    Write-Log "🔁 Installing Updater, Test: $($script:config.UpdaterTest)..."

    Add-UpdaterCronJob
    
    Write-Log "🔁 Starting Updater..."

    if (-not (Start-Update)) {
        Write-Error "❌ Failed to Start Updater"
        
        return
    }
}

function Invoke-Docker {
    param (
        [Parameter(Mandatory)][string[]]$arguments
    )

    try {
        & docker @arguments
    } catch {
        Write-Error "❌ Failed to Execute Docker Command: $_"
    }
}

function Invoke-DockerInspect {
    param (
        [Parameter(Mandatory)][string[]]$arguments
    )

    try {
        & docker inspect @arguments
    } catch {
        Write-Error "❌ Failed to Execute Docker Inspect: $_"
    }
}

function Invoke-DockerImageInspect {
    param (
        [Parameter(Mandatory)][string[]]$arguments
    )

    try {
        & docker image inspect @arguments
    } catch {
        Write-Error "❌ Failed to Execute Docker Inspect: $_"
    }
}

function Invoke-DockerPull {
    param (
        [Parameter(Mandatory)][string[]]$arguments
    )

    try {
        & docker pull @arguments *> $null
    } catch {
        Write-Error "❌ Failed to Execute Docker Pull: $_"
    }
}

function Invoke-DockerCompose {
    param (
        [Parameter(Mandatory)][string[]]$arguments
    )

    if ($script:config.UpdaterTest) {
        Write-Info "`tℹ️ Simulating 'docker compose $($arguments -join ' '))'"

        return
    }

    try {
        & docker compose @arguments
    } catch {
        Write-Error "❌ Failed to Execute Docker Compose: $_"
    }
}

function Invoke-DockerComposeRestart {
    param (
        [Parameter(Mandatory)][string]$file
    )

    try {
        $composeArgs = @('--file', $file, 'up', '-d') + ($script:config.DockerComposeAdditionalArgs | ForEach-Object { $_.ToString() })
      
        & docker compose @composeArgs *> $null
    } catch {
        Write-Error "❌ Failed to Execute Docker Compose Up: $_"
    }
}

function Restart-Container {
    param (
        [Parameter(Mandatory)][string]$name
    )

    if (-not (Test-ContainerExists -name $name)) {
        Write-Warning "⚠️ Container '$name' Does Not Exist. Skipping Restart."

        return
    }

    Write-Info "Restarting $name..."

    try {
        $null = & docker restart $name -ErrorAction Stop

        if ($script:config.SendMonitorNotifications) {
            Send-DiscordNotificationForServiceRestart $name
        }
        
        Write-Info "$name Restarted."
    } catch {
        Write-Error "❌ Failed to Restart $($name): $($_.Exception.Message)"
    }
}

function Restart-Unhealthy {
    param (
        [Parameter(Mandatory)][string]$container,
        [Parameter(Mandatory)][hashtable]$dependenciesMap
    )

    $dependents = $dependenciesMap[$container]

    if ($dependents) {
        Write-Info "❌ $container is Unhealthy. Restarting and Cascading..."

        Restart-Container -Name $container

        if (Wait-ForHealthy -Name $container) {
            foreach ($dep in $dependents) {
                Write-Info "🔁 Restarting Dependent: $dep"

                Restart-Container -Name $dep
            }
        } else {
            Write-Warning "⚠️ $container Did Not Become Healthy. Skipping Dependent Restarts."
        }
    } else {
        Write-Warning "❌ $container is Unhealthy. Restarting..."

        Restart-Container -Name $Container
    }
}

function Read-ConfigFile {
    param (
        [Parameter(Mandatory)][string[]]$file
    )

    $config = @{}
    $trueValues = @("1", "true", "yes", "on")
    $falseValues = @("0", "false", "no", "off")

    (Get-Content $file -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object {
        $key = $_.Name
        $value = $_.Value

        if ($trueValues -contains $value) {
            $value = $true
        } elseif ($falseValues -contains $value) {
            $value = $false
        }
        elseif ($key -eq "ContainerDependencies") {
            $value = @{}

            foreach ($dep in $_.Value.PSObject.Properties) {
                $value[$dep.Name] = $dep.Value
            }
        } elseif ($key -eq "DiscordWebhookUrl") {
            if ($value -notmatch "^https://discord.com/api/webhooks/") {
                $value = ""
            }
        } elseif ($key -eq "SendUpdaterNotifications" -or $key -eq "SendMonitorNotifications" -or $key -eq "SendAPINotifications") {
            if ($trueValues -contains $value) {
                $value = $true
            } else {
                $value = $false
            }
        } elseif ($key -eq "CronSchedule") {
            # Accepts standard cron, step values (e.g., 0/30, */5), and asterisk
            $cronRegex = '^(\s*([0-5]?\d|\*|[0-5]?\d/\d+|\*/\d+)\s+([01]?\d|2[0-3]|\*|[01]?\d/\d+|\*/\d+)\s+([1-9]|[12]\d|3[01]|\*|[1-9]|[12]\d|3[01]/\d+|\*/\d+)\s+([1-9]|1[0-2]|\*|[1-9]|1[0-2]/\d+|\*/\d+)\s+([0-6]|\*|[0-6]/\d+|\*/\d+)\s*)$'
            
            if (-not [regex]::IsMatch($value, $cronRegex)) {
                Write-Error "❌ Invalid Cron Schedule: $($value)"
            }
        }
        elseif ($key -eq "UpdaterTest") {
            if ($trueValues -contains $value) {
                $value = $true
            } else {
                $value = $false
            }
        } elseif ($key -eq "UpdaterCronJob") {
            if ($trueValues -contains $value) {
                $value = $true
            } else {
                $value = $false
            }
        }

        if ($key -eq "IncludeProjects" -or $key -eq "ExcludeProjects") {
            $value = $value -split ","
        }

        $config[$key] = $value
    }
    
    return $config
}

function Remove-Lock {
    Remove-Item -Path $script:config.LockFilePath -Force -ErrorAction SilentlyContinue
}

function Get-DiscordTimestamp {
    # Discord requires ISO 8601 UTC format
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

function Send-DiscordNotification {
    param (
        [Parameter(Mandatory)][string]$title,
        [Parameter(Mandatory)][string]$description,
        [Parameter()][int]$color = 65280,
        [Parameter()][array]$fields = @(),
        [Parameter()][hashtable]$footer = @{}
    )

    $embed = @{
        title       = $title
        description = $description
        color       = $color
        timestamp   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        fields      = $fields
    }
    # Ensure footer has at least a text field or remove it
    if ($footer.Count -ne 0) {
        $embed.footer = $footer
    }

    $payload = @{ embeds = @($embed) } | ConvertTo-Json -Depth 10

    try {
        Invoke-RestMethod `
            -Uri $script:config.DiscordWebhookUrl `
            -Method Post `
            -ContentType "application/json" `
            -Body $payload

        Write-Info "✅ Discord Notification Sent Successfully."
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = $_.Exception.Response.StatusCode.Value__
            $responseText = $_.ErrorDetails.Message

            Write-Warning "⚠️ Discord Webhook Returned ${statusCode}: $responseText"
        } else {
            Write-Error "❌ Failed to Send Discord Notification: $_"
        }
    }
}


function Send-DiscordNotificationForServiceRestart {
    param (
        [Parameter(Mandatory)][string]$serviceName
    )

    $timestamp = Get-TimeStamp

    Send-DiscordNotification
        -title "✅ $serviceName Restarted! ✅" `
        -fields @(
            @{ name = "Service Name"; value = $serviceName; inline = $false }
            @{ name = "Time"; value = $timestamp; inline = $false }
        ) `
        -footer @{ text = "Auto Recovery" }
}

function Restart-Project {
    param (
        [Parameter(Mandatory)][PSCustomObject]$project
    )

    $result = @{
        Processed = $true
        Skipped   = $false
        Summary   = ""
    }

    Write-Info "➡️ Restarting $($project.Name)..."

    Invoke-DockerComposeRestart $project.ComposeFile

    Start-Sleep -Seconds 10

    $unhealthyContainers = @()

    $project.Containers | ForEach-Object {
        $name = $_.Name.Trim()

        if (-not (Wait-ForHealthy -name $name -maxWait 120)) {
            Write-Error "`t❌ Unhealthy Container After Restart: $name"

            $unhealthyContainers += $name
        }
    }

    if ($unhealthyContainers.Count -eq 0) {
        Write-Info "`t✅ All Services Healthy..."
        
        $result.Summary = " - ${project.Name}: ✅ All Services Healthy."
    } else {
        Write-Warning "`t⚠️ Services Unhealthy..."
        
        $unhealthyList = $unhealthyContainers -join "`n  - "
        $result.Summary = " - ${project.Name}: ⚠️ Services Unhealthy:`n  - $unhealthyList."
    }

    return [PSCustomObject]$result
}

function Start-Update {
    try {
        Write-Info "Starting Sweep: $(Get-TimeStamp)"

        Get-Lock

        if (-not (Confirm-PreflightCheck)) {
            Write-Error "❌ Preflight Check Failed...Exiting"

            return $false
        }

        $processedCount = 0
        $skippedCount = 0
        $summary = ""

        foreach ($project in Get-ProjectsWithUpdatedImages) {
            $result = Restart-Project $project

            if ($result.Processed) {
                $processedCount++
            }

            if ($result.Skipped) {
                $skippedCount++
            }

            $summary += "`n$($result.Summary)"
        }

        Invoke-Docker @("system", "prune", "--all", "--force") | Out-Null
        Write-Info "✅ Cleaned Up Dangling Images, Volumes and Networks"

        Write-Info "Processed $processedCount, Skipped $skippedCount"
        Write-Info "Finished Sweep: $(Get-TimeStamp)"

        if ($summary -and $script:config.SendUpdaterNotifications) {
            Send-DiscordNotification `
                -title "$($script:config.UpdaterNotificationTitle)" `
                -description $summary `
                -color 5763719 `
                -footer @{ text = "Update Complete" }
        }
    } finally {
        Remove-Lock
    }

    return $true
}

function Start-Watchdog {
    Write-Log "🐶 Starting Watchdog Monitor, Notifications: $($script:config.SendMonitorNotifications)..."

    $lockPath = $script:config.LockFilePath
    $dependenciesMap = $script:config.ContainerDependencies

    $dockerArgs = @(
        "events",
        "--filter", "event=health_status",
        "--filter", "type=container",
        "--format", "{{json .}}"
    )

    try {
        & docker @dockerArgs | ForEach-Object {
            # Check for lock file before processing each event
            $maxWaitSeconds = 600
            $waitedSeconds = 0

            while (Test-Path $lockPath) {
                Write-Log "⏸ Watchdog Paused — Lock File Detected — Waiting..."
                Start-Sleep -Seconds 30
                $waitedSeconds += 30

                if ($waitedSeconds -ge $maxWaitSeconds) {
                    Write-Warning "⏱️ Lock File Still Present After 10 Minutes, Skipping Event..."

                    break
                }
            }

            $line = $_

            if (-not $line -or -not ($line -match "^\{")) {
                return
            }

            try {
                $e = $line | ConvertFrom-Json
                $container = $e?.Actor?.Attributes?.name
                $status = $e?.status

                if ($status -eq "health_status: unhealthy" -and $container) {
                    Restart-Unhealthy -container $container -dependenciesMap $dependenciesMap
                }
            } catch {
                Write-Error "⚠️ Failed to Parse Event: $_"
            }
        }
    } catch {
        Write-Error "❌ Docker Events Stream Failed: $_"
    }

    Write-Info "🔍 Watchdog Started. Listening to Docker Events..."
}

function Test-ContainerExists {
    param (
        [Parameter(Mandatory)][string]$name
    )
    try {
        return (& docker ps -a --format '{{.Names}}') -contains $name
    } catch {
        Write-Error "⚠️ Failed to List Containers: $_"

        return $false
    }
}
function Test-ServiceHealth {
    param (
        [string]$containerName
    )

    try {
        $status = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerName) 2>$null
    } catch {
        $status = "notfound"
    }

    return $status -eq 'healthy' -or $status -eq 'running'
}

function Wait-ForHealthy {
    param (
        [Parameter(Mandatory)][string]$name,
        [int]$maxWait = 60
    )

    if (-not (Test-ContainerExists $name)) {
        Write-Warning "⚠️ Container '$name' Does Not Exist. Cannot Check Health."

        return $false
    }

    $waited = 0
    while ($waited -lt $maxWait) {
        if (Test-ServiceHealth $name) {
            Write-Info "$name is Healthy."

            return $true
        }
        
        Start-Sleep -Seconds 10

        $waited += 10
    }

    Write-Warning "⚠️ $name Did Not Become Healthy in $maxWait Seconds."

    return $false
}

function Write-Error {
    param (
        [Parameter(Mandatory)][string]$message
    )

    Write-Log $message -Level ERROR
}

function Write-Info {
    param (
        [Parameter(Mandatory)][string]$message
    )

    Write-Log $message -Level INFO
}

function Write-Warning {
    param (
        [Parameter(Mandatory)][string]$message
    )

    Write-Log $message -Level WARN
}

function Write-Log {
    param (
        [Parameter(Mandatory)][string]$message,
        [ValidateSet("INFO", "WARN", "ERROR")][string]$level = "INFO"
    )

    $timestamp = Get-TimeStamp

    Write-Host "[$timestamp] [$level] $message"

    if ($script:config.LogFilePath) {
        "$timestamp [$level] $message" | Out-File -FilePath $script:config.LogFilePath -Encoding UTF8 -Append
    }
}

Export-ModuleMember `
    Add-UpdateCronJob, `
    Confirm-ImageUpdated, `
    Confirm-IncludeProject, `
    Confirm-PreflightCheck, `
    Convert-ToCapitalCase, `
    Get-Config, `
    Get-ProjectsWithUpdatedImages, `
    Get-Lock, `
    Get-TimeStamp, `
    Install-Updater, `
    Invoke-Docker, `
    Invoke-DockerCompose, `
    Invoke-DockerComposeRestart, `
    Read-ConfigFile, `
    Remove-Lock,`
    Restart-Container, `
    Restart-Unhealthy, `
    Send-DiscordNotification, `
    Set-APIConfig,
    Restart-Project, `
    Start-Update, `
    Start-Watchdog, `
    Test-ContainerExists, `
    Test-ServiceHealth, `
    Wait-ForHealthy,
    Write-Error, `
    Write-Info, `
    Write-Warning, `
    Write-Log