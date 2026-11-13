# api/docker/extract-run-command.ps1

param (
    [string]$containerIdOrName
)

$run_command = docker inspect $containerIdOrName | ForEach-Object {
    $_.Name = $_.Name.TrimStart('/')
    $command = "docker run --name $($_.Name) "

    $optional_params = @{
        hostname = $_.Config.Hostname
        user = $_.Config.User
        exposed_ports = $_.Config.ExposedPorts ? ($_.Config.ExposedPorts.Keys | ForEach-Object { "--publish $_ " }) -join '' : ''
        binds = $_.HostConfig.Binds ? ($_.HostConfig.Binds | ForEach-Object { "--volume $_ " }) -join '' : ''
        network_mode = $_.HostConfig.NetworkMode
        restart_policy = $_.HostConfig.RestartPolicy.Name
        env_vars = $_.Config.Env ? ($_.Config.Env | ForEach-Object { "--env $_ " }) -join '' : ''
    }

    foreach ($param in $optional_params.GetEnumerator()) {
        if ($param.Value) {
            $command += "--$($param.Key.Replace('_', '-')) $($param.Value) "
        }
    }

    $command += "--detach $($_.Config.Image) $($_.Config.Cmd -join ' ')"
    $command
}

Write-Output $run_command
