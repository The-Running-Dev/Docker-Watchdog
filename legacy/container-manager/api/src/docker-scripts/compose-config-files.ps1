# api/docker/compose-config-files.ps1

param (
    [string]$containerList
)

& docker inspect $containerList --format '{{index .Config.Labels \"com.docker.compose.project.config_files\"}}' | Sort-Object | ForEach-Object {
    $configFiles = $_ -split ','
    $configFiles | ForEach-Object {
        $configFile = $_
        $command = "docker cp $($containerList):$($configFile) $configFile"
        Write-Host $command
        #Invoke-Expression $command
    }
}

Invoke-Expression $command
