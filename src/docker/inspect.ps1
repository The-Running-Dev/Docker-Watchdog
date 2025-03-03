param (
    [string]$ContainerId
)

& docker inspect --format='{{.Name}},{{.Config.Image}},{{.Created}}' $ContainerId