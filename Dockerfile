# Stage 1: Build Python virtual environment
FROM python:3.12-slim-bookworm AS builder

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /build

# Copy only requirements first for caching
COPY app/requirements.txt .

# Create virtual environment and install Python packages
RUN python -m venv $VIRTUAL_ENV && \
    $VIRTUAL_ENV/bin/pip install --upgrade pip && \
    $VIRTUAL_ENV/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: Final runtime image with preserved Python environment
FROM python:3.12-slim-bookworm AS final

# Set environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=UTC \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    PORT=80 \
    DISCORD_WEBHOOK_URL="" \
    TIME_ZONE=UTC \
    VENV_PATH=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

LABEL maintainer="ben@subzerodev.com" \
      version="1.0" \
      description="Watchdog container with Flask API, Docker health monitoring, and PowerShell logic."

# Install dependencies and PowerShell
RUN apt-get update && \
    apt-get install -y curl gnupg ca-certificates apt-transport-https lsb-release && \
    # Microsoft repo for PowerShell
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/microsoft-debian-bookworm-prod bookworm main" > /etc/apt/sources.list.d/microsoft.list && \
    # Docker repo for Compose plugin
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        powershell \
        cron \
        locales \
        docker.io \
        docker-compose-plugin \
        jq \
        unzip \
        nano \
        procps && \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built venv and app source
COPY --from=builder /opt/venv /opt/venv
COPY ./app /app

# Ensure entrypoint is executable
RUN chmod +x /app/entrypoint.ps1

EXPOSE ${PORT}

# Healthcheck for Flask API
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:${PORT}/health || exit 1

# Run entrypoint
ENTRYPOINT ["pwsh", "/app/entrypoint.ps1"]
