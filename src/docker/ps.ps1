#& docker ps --format "{{.Names}},{{.Image}},{{.CreatedAt}}"

& docker inspect `
    --format='{{.Name}},{{.Config.Image}},{{.Created}}' $(docker ps -aq --filter "status=running")