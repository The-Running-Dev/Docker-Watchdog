# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:26-bookworm-slim
ARG DOCKER_CLI_IMAGE=docker:29-cli

# Stage 1: install the workspace, build shared, api and ui, then deploy the API with its production dependencies.
FROM ${NODE_IMAGE} AS build

WORKDIR /src

RUN npm install --global pnpm@10.28.0

# Dependencies first, so source changes reuse this layer.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/ui/package.json apps/ui/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/ui apps/ui
RUN pnpm --recursive build

# The API with production dependencies only; the shared package is copied in, not linked.
RUN pnpm --filter @subzerodev/watchdog-api deploy --prod --legacy /out/api \
    && cp -r apps/ui/dist /out/ui

# The Docker CLI and the Compose plugin, as static binaries.
FROM ${DOCKER_CLI_IMAGE} AS docker-cli

# Stage 2: Node, the Docker CLI and Compose. No PowerShell or Python.
FROM ${NODE_IMAGE}

ARG APP_VERSION=0.0.0-dev
ARG BUILD_DATE=""

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

WORKDIR /app

COPY --from=build /out/api /app/api
COPY --from=build /out/ui /app/ui

# config.overrides.json is mounted at /app/config.overrides.json, as before.
ENV NODE_ENV=production \
    PORT=80 \
    TZ=UTC \
    CONFIG_FILE=/app/config.json \
    WATCHDOG_UI_PATH=/app/ui \
    APP_VERSION=${APP_VERSION} \
    BUILD_DATE=${BUILD_DATE}

LABEL org.opencontainers.image.title="subzerodev-watchdog" \
      org.opencontainers.image.description="Docker health monitor, scheduled updater and management UI" \
      org.opencontainers.image.source="https://github.com/The-Running-Dev/SubZeroDev.DockerWatchDog" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

EXPOSE 80

HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Runs as root by default: the Docker socket is root-equivalent anyway, and the watchdog has to read every
# project's compose files and the mounted registry credentials. See the README to run it as `node`.
CMD ["node", "api/dist/main.js"]
