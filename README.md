# Docker-Watchdog

![Docker-Watchdog Logo](https://img.shields.io/badge/Docker-Watchdog-blue?style=for-the-badge&logo=docker)

A comprehensive Docker container management solution that monitors, updates, and maintains the health of your Docker containers and Docker Compose projects.

## 🚀 Features

- **Automated Container Updates**: Scheduled Docker Compose project updates via configurable cron jobs
- **Health Monitoring**: Real-time container health monitoring with automatic recovery actions
- **Discord Notifications**: Updates and health status notifications via Discord webhooks
- **REST API**: Flask-based API for remote management and integration with monitoring tools
- **Dependency Management**: Custom container dependency configurations to ensure proper restart order
- **PowerShell Core**: Cross-platform compatibility using PowerShell Core
- **Project Filtering**: Include/exclude specific Docker Compose projects from monitoring
- **Containerized Solution**: Runs as a container itself for easy deployment

## 📋 Requirements

- Docker
- Docker Compose (v2)
- Docker socket access (for container management)
- Volume mounts for Docker Compose projects

## 🔧 Installation

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml` file based on the example provided:

```yaml
x-commonKeys: &commonOptions
  restart: always
  stdin_open: true
  tty: true

x-dnsServers: &dnsServers
  dns:
    - 45.90.28.29
    - 45.90.30.29

services:
  watchdog:
    image: ghcr.io/the-running-dev/watchdog:latest
    container_name: watchdog
    volumes:
      - ./config.overrides.json:/app/config.overrides.json
      - /path/to/your/projects:/projects
      - ~/.docker/config.json:/root/.docker/config.json:ro
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 7000:80
    <<: [*dnsServers, *commonOptions]
```

2. Create a `config.overrides.json` file to override default settings:

```json
{
  "ContainerDependencies": {
    "vpn": ["torrents", "newsgroups"]
  },
  "DiscordWebhookUrl": "YOUR_DISCORD_WEBHOOK_URL",
  "ExcludeProjects": [],
  "SendUpdaterNotifications": true,
  "SendMonitorNotifications": true,
  "SendAPINotifications": true,
  "TimeZone": "UTC",
  "UpdaterTest": false,
  "UpdaterCronJob": true,
  "UpdaterNotificationTitle": "Containers Update"
}
```

3. Start the container:

```powershell
docker compose up -d
```

### Using Docker CLI

```powershell
docker run -d \
  --name watchdog \
  -p 7000:80 \
  -v ./config.overrides.json:/app/config.overrides.json \
  -v /path/to/your/projects:/projects \
  -v ~/.docker/config.json:/root/.docker/config.json:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/the-running-dev/watchdog:latest
```

## ⚙️ Configuration

### Configuration Files

- `config.json`: Default configuration (inside the container)
- `config.overrides.json`: User-defined overrides (mounted as a volume)

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ProjectsDirectory` | Directory containing Docker Compose projects | `/projects` |
| `CronFilePath` | Path to cron file | `/etc/cron.d/docker-updater` |
| `CronSchedule` | Cron schedule for updates | `0 4 * * *` (4 AM daily) |
| `ContainerDependencies` | Container dependencies map | `{}` |
| `DiscordWebhookUrl` | Discord webhook URL for notifications | `""` |
| `ExcludeProjects` | Projects to exclude from updates | `[]` |
| `IncludeProjects` | Projects to include (if empty, include all) | `[]` |
| `SendUpdaterNotifications` | Send notifications for updates | `true` |
| `SendMonitorNotifications` | Send notifications for monitoring events | `true` |
| `SendAPINotifications` | Send notifications for API events | `true` |
| `TimeZone` | Time zone for logs and operations | `UTC` |
| `UpdaterTest` | Run updater in test mode | `false` |
| `UpdaterCronJob` | Enable updater cron job | `true` |

### Container Dependencies

Define container dependencies to ensure proper restart order. For example:

```json
"ContainerDependencies": {
  "vpn": ["torrents", "newsgroups"]
}
```

In this example, if the `vpn` container is restarted, the `torrents` and `newsgroups` containers will also be restarted in that order.

## 🌐 API Endpoints

The Docker-Watchdog API is available on port 80 within the container (mapped to your chosen external port).

### Available Endpoints

- `GET /health`: Health check endpoint
- `POST /restart`: Restart a container

## 📊 Monitoring

Docker-Watchdog monitors:

1. Docker events for container health changes
2. Scheduled updates for all Docker Compose projects
3. API requests for container restarts

## 🔄 Automatic Updates

By default, Docker-Watchdog updates all Docker Compose projects daily at 4 AM UTC:

1. Identifies Docker Compose projects in the configured directory
2. Pulls latest images for each project
3. Recreates containers with updated images
4. Monitors health status after updates
5. Sends notifications about update results

## 🛠️ Building from Source

```powershell
# Clone the repository
git clone https://github.com/the-running-dev/docker-watchdog.git
cd docker-watchdog

# Build the image
docker build -t watchdog:local .

# Run the container
docker compose -f docker-compose.build.example up -d
```

## 📜 License

[MIT License](LICENSE)

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by Your Mom
