# Use the official lightweight Node.js image.
FROM node:alpine AS build

ENV deployDir=./deploy

# Install pnpm
RUN npm install -g pnpm

# Install dependencies and build the application
WORKDIR /usr/src/app
COPY $deployDir .
RUN pnpm install --frozen-lockfile

# Use a smaller base image for the final image
FROM node:alpine

# Install PowerShell
RUN apk add --no-cache \
    ca-certificates \
    less \
    ncurses-terminfo-base \
    krb5-libs \
    libgcc \
    libintl \
    libssl3 \
    libstdc++ \
    tzdata \
    userspace-rcu \
    zlib \
    && apk -X https://dl-cdn.alpinelinux.org/alpine/edge/testing add --no-cache \
    powershell

# Set PowerShell as the default shell
SHELL ["pwsh", "-Command"]

# Install Docker and Docker Compose
RUN apk add --no-cache docker docker-compose

# Ensure Docker and Docker Compose are in the PATH
ENV PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Copy the built application from the build stage
WORKDIR /usr/src/app
COPY --from=build /usr/src/app .

# Install pnpm in the final image
RUN npm install -g pnpm

# Run the web service on container startup.
CMD ["pnpm", "start"]