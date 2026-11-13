# api/docker/inspect.ps1

param (
    [string]$ContainerId
)

& docker inspect --format='{{.Name}},{{.Config.Image}},{{.Created}}' $ContainerId