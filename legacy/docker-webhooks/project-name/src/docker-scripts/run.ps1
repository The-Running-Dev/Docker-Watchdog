# api/docker/run.ps1

param (
    [string]$name,
    [string]$hostname,
    [string]$user,
    [string]$exposed_ports,
    [string]$binds,
    [string]$network_mode,
    [string]$restart_policy,
    [string]$env_vars,
    [string]$image,
    [string]$cmd
)

$run_command = "docker run --name $name "

$optional_params = @{
    hostname = $hostname
    user = $user
    exposed_ports = $exposed_ports
    binds = $binds
    network_mode = $network_mode
    restart_policy = $restart_policy
    env_vars = $env_vars
}

foreach ($param in $optional_params.GetEnumerator()) {
    if ($param.Value) {
        $run_command += "--$($param.Key.Replace('_', '-')) $($param.Value) "
    }
}

$run_command += "--detach $image $cmd"

Write-Output $run_command