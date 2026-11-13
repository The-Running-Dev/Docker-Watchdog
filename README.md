# SubZeroDev Docker Watchdog

Keeps the Docker Compose projects on a host up to date, restarts containers that turn unhealthy, and gives you a small web UI and API to look at and restart them. It replaces the earlier PowerShell/Flask watchdog and Container-Manager; the Uptime Kuma endpoints are unchanged.

Image: `ghcr.io/the-running-dev/subzerodev-watchdog`

## Features

- **Scheduled updater.** On `CronSchedule` (and once at start), for every Compose project under `ProjectsDirectory`: pull, then `docker compose up -d` when an image changed, wait for health, and prune unused images.
- **Health monitor.** Watches Docker events and restarts a container whose health check turns `unhealthy`. When it is healthy again, its dependents (`ContainerDependencies`) are restarted too.
- **Uptime Kuma webhooks.** `POST /restart` and `POST /restart-project`, with the same payloads as before.
- **Web UI.** Projects (status, health, restart with pull / hard reset / dry run), Logs (live), Settings (effective config, secrets masked) and a Webhook tester.
- **Discord notifications** for updates, monitor restarts and API restarts.
- **Optional auth.** An API key and an admin login, both off until you set them.

## How it runs

One Node process: a NestJS API that also serves the React UI and a socket.io stream. It drives Docker through the mounted socket, and runs the `docker` CLI with the Compose plugin for `compose`, `pull` and `image prune`. The image has no PowerShell or Python.

```
apps/api         NestJS API, updater, health monitor, notifications
apps/ui          React + Vite + MUI web UI
packages/shared  Types and request schemas shared by both
```

## Installation

Docker Compose (see [`docker-compose.example`](docker-compose.example)):

```yaml
services:
  watchdog:
    image: ghcr.io/the-running-dev/subzerodev-watchdog:latest
    container_name: watchdog
    restart: always
    environment:
      - TZ=UTC
    volumes:
      - ./config.overrides.json:/app/config.overrides.json
      - /path/to/your/compose/projects:/projects
      - ~/.docker/config.json:/root/.docker/config.json:ro # registry logins, for private images
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 7000:80
```

The UI is at `http://<host>:7000/`. The VPS deployment (Portainer stack, Cloudflare tunnel) is in [`vps/`](vps) and [`deploy/`](deploy).

Each Compose project lives in its own folder under `/projects` with a `compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml` or `docker-compose.*.yml` file; the watchdog runs `docker compose` from that folder.

### Running as a non-root user

The image runs as root by default: the Docker socket is root-equivalent anyway, and the watchdog has to read every project's compose and env files and the registry credentials. To run it as the image's `node` user instead, make those readable by it, and add the socket's group:

```yaml
user: node
group_add:
  - '999' # stat -c %g /var/run/docker.sock on the host
environment:
  - DOCKER_CONFIG=/home/node/.docker
volumes:
  - ~/.docker/config.json:/home/node/.docker/config.json:ro
```

## Configuration

Settings are read in this order, later wins:

1. Built-in defaults (below).
2. `CONFIG_FILE` (default `/app/config.json`; the image has none).
3. `CONFIG_OVERRIDES_FILE` (default `config.overrides.json` beside the config file, so `/app/config.overrides.json`).
4. An environment variable named exactly after the key, e.g. `ApiKey=...` or `UpdaterCronJob=false`. Lists take JSON or a comma-separated string; `ContainerDependencies` takes JSON.

`TZ` also sets `TimeZone` unless a file or `TimeZone` sets it. Existing `config.overrides.json` files from the old watchdog keep working.

| Key                           | Default                                          | Description                                                                                |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `ProjectsDirectory`           | `/projects`                                      | Folder holding the Compose projects                                                        |
| `CronSchedule`                | `0 4 * * *`                                      | When the updater runs (cron, in `TimeZone`)                                                |
| `UpdaterCronJob`              | `true`                                           | Run the updater on `CronSchedule`                                                          |
| `UpdateOnStart`               | `true`                                           | Run the updater once at start                                                              |
| `UpdaterTest`                 | `false`                                          | Log what the updater would do without changing anything                                    |
| `PruneAfterUpdate`            | `true`                                           | Remove images no container uses after an update                                            |
| `IncludeProjects`             | `[]`                                             | Only these projects (empty: all)                                                           |
| `ExcludeProjects`             | `[]`                                             | Never these projects                                                                       |
| `DockerComposeAdditionalArgs` | `["--always-recreate-deps", "--remove-orphans"]` | Options for `docker compose up`                                                            |
| `ContainerDependencies`       | `{}`                                             | Container to the containers restarted after it, e.g. `{"vpn": ["torrents", "newsgroups"]}` |
| `DiscordWebhookUrl`           | `""`                                             | Discord webhook; anything else turns notifications off                                     |
| `SendUpdaterNotifications`    | `true`                                           | Notify about updates                                                                       |
| `SendMonitorNotifications`    | `true`                                           | Notify about health-monitor restarts                                                       |
| `SendAPINotifications`        | `true`                                           | Notify about restarts through the API                                                      |
| `UpdaterNotificationTitle`    | `Containers Update`                              | Title of the update notification                                                           |
| `TimeZone`                    | `UTC`                                            | Time zone for the schedule and logs                                                        |
| `LogFilePath`                 | `/tmp/watchdog.log`                              | Log file                                                                                   |
| `LockFilePath`                | `/tmp/watchdog.lock`                             | Keeps the updater and the monitor from overlapping                                         |
| `ApiKey`                      | `""`                                             | Required in the `x-api-key` header when set                                                |
| `AdminUser`, `AdminPassword`  | `""`                                             | UI login; both must be set to turn it on                                                   |
| `JwtSecret`                   | `""`                                             | Signs login tokens; random when empty, so logins end on restart                            |
| `JwtExpiresIn`                | `12h`                                            | Login token lifetime                                                                       |

Other environment variables:

| Variable                    | Default (image) | Description                      |
| --------------------------- | --------------- | -------------------------------- |
| `PORT`                      | `80`            | HTTP port                        |
| `WATCHDOG_UI_PATH`          | `/app/ui`       | Built UI; empty turns the UI off |
| `APP_VERSION`, `BUILD_DATE` | set at build    | Shown by `/api/info`             |

## Authentication

Off by default, as before. Set `ApiKey` to require it on every route except `/health`, `/api/auth/status` and `/api/auth/login`; clients send it in the `x-api-key` header (the UI can also sign in with it). Set `AdminUser` and `AdminPassword` to sign in to the UI with a password; requests then carry `Authorization: Bearer <token>`.

With `ApiKey` set, add the header to the Uptime Kuma webhook (below) and to any CI step that calls the watchdog.

## API

| Route                                          | Description                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /health`                                  | `{"status":"healthy"}`; always open (Docker healthcheck, Uptime Kuma)                                                                                                                |
| `POST /restart`                                | Uptime Kuma webhook: restarts the container named in `monitor.description` (`container-<name>`) or `monitor.name`, only when `heartbeat.status` is `0`                               |
| `POST /restart-project`                        | `{"event":"update-project","data":{"projectId":"media","additionalArgs":["--remove-orphans"],"isTest":false}}`                                                                       |
| `POST /api/webhook`                            | `{"event":"update-project" or "update-container","data":{"projectOrContainerId":"media","hardReset":false,"deleteVolumes":false,"isTest":false}}`; `deleteVolumes` needs `hardReset` |
| `POST /api/auth/login`, `GET /api/auth/status` | UI login                                                                                                                                                                             |
| `GET /api/info`                                | Version, build date, Docker version, whether auth is on                                                                                                                              |
| `GET /api/config`                              | Effective configuration, secrets masked                                                                                                                                              |
| `GET /api/projects`                            | Projects with their containers, status and health                                                                                                                                    |
| `POST /api/projects/:name/restart`             | Body: `pull` (default true), `hardReset`, `deleteVolumes` (needs `hardReset`), `dryRun`, `additionalArgs`                                                                            |
| `GET /api/containers`                          | Containers                                                                                                                                                                           |
| `POST /api/containers/:name/restart`           | Body: `mode` (`recreate` or `restart`), `pull`, `dryRun`                                                                                                                             |
| `GET /api/logs?page&limit`                     | Recent log entries                                                                                                                                                                   |
| `GET /api/updater`, `POST /api/updater/run`    | Updater state; run it now                                                                                                                                                            |
| socket.io `/`                                  | `log-event`, `containers-event`, `restart-event` (same auth as the API)                                                                                                              |

Errors are JSON with `statusCode` and `message`; a missing project or container is a 404.

## Uptime Kuma

1. **Settings → Notifications → Set Up Notification**: type **Webhook**, Post URL `http://<watchdog-host>:7000/restart`, body preset `application/json`. With `ApiKey` set, add the additional header `{"x-api-key": "<key>"}`.
2. On the container's monitor, turn that notification on and set **Description** to `container-<name>` (e.g. `container-torrents` restarts `torrents`).

When the monitor goes down, the watchdog restarts the container, restarts its dependents once it is healthy, and sends a Discord notification.

To update a project from CI after pushing an image:

```yaml
- name: Update the project on the host
  run: |
    curl -fsS -X POST https://watchdog.example.com/restart-project \
      -H 'Content-Type: application/json' -H "x-api-key: ${{ secrets.WATCHDOG_API_KEY }}" \
      -d '{"event":"update-project","data":{"projectId":"myproject"}}'
```

## Development

Node 26 (`.nvmrc`) and pnpm 10.

```bash
pnpm install
pnpm --filter @subzerodev/watchdog-api dev   # API on :3000, with the UI's dist when built
pnpm --filter @subzerodev/watchdog-ui dev    # UI with hot reload, proxying /api to the API
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
pnpm test:docker                             # API tests against a real Docker daemon
```

When you run the API locally against your own Docker, set `UpdateOnStart=false` and `UpdaterCronJob=false` unless you want it to update your projects.

## Image and CI

- [`node.yml`](.github/workflows/node.yml): lint, format, typecheck, test and build on pull requests and `main`, plus the Docker integration tests.
- [`image.yml`](.github/workflows/image.yml): builds the image on pull requests; on `main` pushes it to GHCR as `<semver>`, `<major>.<minor>`, `latest` and `sha-<commit>`, and tags the release `v<semver>`. Versions come from GitVersion ([`GitVersion.yml`](GitVersion.yml)).

Build it by hand:

```bash
docker build --build-arg APP_VERSION=0.0.0-local -t subzerodev-watchdog .
```

[`build.ps1`](build.ps1) builds and pushes `:latest` with the `PackagesToken` environment variable.

## License

MIT
