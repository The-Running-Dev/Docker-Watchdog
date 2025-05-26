# Docker-Watchdog

![Docker-Watchdog Logo](https://img.shields.io/badge/Docker-Watchdog-blue?style=for-the-badge&logo=docker)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Docker-Watchdog is a robust, containerized management and automation tool for Docker Compose environments. It automatically keeps your containers up-to-date, monitors their health, and provides a RESTful API for integration with monitoring tools like Uptime Kuma. It is designed for self-hosters and DevOps engineers who want hands-off, reliable, and observable Docker operations.

## 🚀 Features

- **Automated Container Updates**: Scheduled Docker Compose project updates via configurable cron jobs that automatically pull the latest images and recreate containers
- **Health Monitoring**: Real-time container health monitoring with automatic recovery actions for unhealthy containers
- **Discord Notifications**: Detailed notifications about container updates, restarts, and health status via Discord webhooks
- **REST API**: Flask-based API for remote management and integration with monitoring tools like Uptime Kuma
- **Dependency Management**: Custom container dependency configurations to ensure proper restart order when dependent services need to be restarted
- **PowerShell Core**: Cross-platform compatibility using PowerShell Core for robust container management
- **Project Filtering**: Include/exclude specific Docker Compose projects from monitoring and updates
- **Containerized Solution**: Runs as a container itself for easy deployment and integration into your existing Docker environment
- **Timezone Support**: Configurable timezone for accurate logging and scheduling
- **Intelligent Restart Logic**: Only restarts containers when actual image updates are detected

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

#### Environment Variables

You can override most configuration options using environment variables. Common variables include:

- `PORT`: The port the Flask API listens on (default: 80)
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications
- `TIME_ZONE`: Timezone for logs and scheduling (e.g., `America/New_York`)
- `SEND_API_NOTIFICATIONS`: Enable/disable API notifications (`true`/`false`)

### Container Dependencies

Define container dependencies to ensure proper restart order. For example:

```json
"ContainerDependencies": {
  "vpn": ["torrents", "newsgroups"]
}
```

In this example, if the `vpn` container is restarted, the `torrents` and `newsgroups` containers will also be restarted in that order.

## 🌐 API Endpoints

The Docker-Watchdog API is available on port 80 within the container (mapped to your chosen external port). The API is built with Flask and uses Gunicorn as the WSGI server for production deployments.

### Available Endpoints

- `GET /health`: Health check endpoint that returns a JSON response with status "healthy"
- `POST /restart`: Restart a Docker container
  - Accepts JSON payload (typically from Uptime Kuma monitoring)
  - Determines container name from payload
  - Validates container existence
  - Restarts the container
  - Sends notification via Discord (if enabled)
  - Returns JSON with restart status

#### Example API Usage with Uptime Kuma

Docker-Watchdog is designed to work seamlessly with [Uptime Kuma](https://github.com/louislam/uptime-kuma) for monitoring and automatic recovery:

1. Set up Uptime Kuma to monitor your Docker containers
2. Configure a "Push" action in Uptime Kuma to call your Docker-Watchdog `/restart` endpoint when a container becomes unhealthy
3. Docker-Watchdog will handle restarting the container and send a notification about the recovery

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

## 📝 Logging

Logs are written to `/tmp/docker-updater.log` inside the container and to stdout. Timestamps are shown in the configured timezone and include the offset (e.g., `[2025-05-25 12:46:21 +03:00]`).

## 🛠️ Troubleshooting

- **No Compose Projects Detected:** Ensure your Docker Compose project directory is correctly mounted to `/projects` and contains valid `docker-compose.yml` files.
- **No Discord Notifications:** Double-check your `DiscordWebhookUrl` in `config.overrides.json` or the `DISCORD_WEBHOOK_URL` environment variable.
- **API Not Responding:** Make sure the container is running and the port is mapped correctly. Check logs for errors.
- **Permission Issues:** The container needs access to the Docker socket (`/var/run/docker.sock`) and your Compose project files.
- **Timezone Issues:** Set the `TIME_ZONE` environment variable to your preferred timezone (IANA format).

## 📁 Project Structure

```
Docker-Watchdog/
├── app/                        # Application source code
│   ├── api/                    # Flask API code
│   │   ├── api.py              # API implementation
│   │   └── log_config.py       # Logging configuration
│   ├── config.json             # Default configuration
│   ├── entrypoint.ps1          # Container entry point script
│   ├── requirements.txt        # Python dependencies
│   ├── run-update.ps1          # Script to run update process
│   └── watchdog.psm1           # PowerShell module with core functionality
├── build.ps1                   # Build script for GitHub Container Registry
├── config.overrides.json       # User configuration overrides
├── docker-compose.example      # Example Docker Compose file
├── docker-compose.yml          # Docker Compose file for deployment
└── Dockerfile                  # Multi-stage build definition
```

## 🛠️ Building from Source

```powershell
# Clone the repository
git clone https://github.com/the-running-dev/docker-watchdog.git
cd docker-watchdog

# Build the image locally
docker build -t watchdog:local .

# Run the container
docker compose -f docker-compose.example up -d
```

### Publishing to GitHub Container Registry

The project includes scripts for publishing the image to GitHub Container Registry:

```powershell
# Set your GitHub PAT with package write permissions
$env:GitHubPackagesToken = 'your-github-pat'

# Build and push
.\build.ps1
```

## 🧪 Testing & Development

- To build and run locally, use the provided `docker-compose.yml` or `docker-compose.example`.
- For local development, you can mount your source code and config files directly into the container.
- Use `run.ps1` or `run.sh` for quick local rebuilds.

## 📦 Image Publishing

To publish your own image to GitHub Container Registry:

```powershell
# Set your GitHub PAT with package write permissions
$env:GitHubPackagesToken = 'your-github-pat'

# Build and push
./build.ps1
```

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.

## 📜 License

[MIT License](LICENSE)

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by the Running Dev
