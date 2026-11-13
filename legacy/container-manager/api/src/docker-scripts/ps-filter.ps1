# api/docker/ps-filter.ps1

param (
    [Parameter(Mandatory)][string]$sinceContainerName
)

#& docker ps --filter since="$sinceContainerName"

$sinceTime = & docker inspect -f '{{.Created}}' $sinceContainerName

write-host "sinceTime: $sinceTime"

& docker ps -aq | ForEach-Object {
    $containerId = $_
    $containerTime = & docker inspect -f '{{.Created}}' $containerId
    
    if ($containerTime -gt $sinceTime) {
        & docker inspect --format='{{.Name}},{{.Config.Image}},{{.Created}}' $containerId
    }
}

# $sinceTime=$(docker inspect -f '{{.Created}}' "$sinceContainerName")

# & docker inspect --format='{{.Name}},{{.Config.Image}},{{.Created}}' "$sinceContainerName" $(docker ps -aq)