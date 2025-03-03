# Docker-WebHooks

This project is a Node API application built with TypeScript, Express,
and InversifyJS. It provides an API to manage Docker images and containers,
including fetching running images, inspecting image details, and running
Docker Compose commands.

## Table of Contents

- [Docker-WebHooks](#docker-webhooks)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Building the Application](#building-the-application)
  - [Running the Application](#running-the-application)
  - [API Endpoints](#api-endpoints)
    - [GET /](#get-)
    - [POST /webhook](#post-webhook)
  - [Scripts](#scripts)
    - [`build.ps1`](#buildps1)
    - [`run-compose.ps1`](#run-composeps1)
    - [`run-dev.ps1`](#run-devps1)
    - [`scripts\create-env.ps1`](#scriptscreate-envps1)
    - [`scripts\get.ps1`](#scriptsgetps1)
    - [`scripts\post-webhook.ps1`](#scriptspost-webhookps1)
    - [`scripts\run-sh-container.ps1`](#scriptsrun-sh-containerps1)
    - [Using the `.env` and `.env.build` Files in PowerShell Scripts](#using-the-env-and-envbuild-files-in-powershell-scripts)
  - [Workflows](#workflows)
  - [Running Workflows Locally with `act`](#running-workflows-locally-with-act)
    - [Prerequisites](#prerequisites)
    - [Running the Workflows](#running-the-workflows)
  - [ToDo](#todo)
    - [Tests](#tests)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

1. Clone the repository:
    ```powershell
    git clone https://github.com/The-Running-Dev/Docker-Webhooks.git
    cd Docker-Webhooks
    ```

2. Install dependencies:
    ```powershell
    pnpm install
    ```

3. Ensure Docker is installed and running on your machine.

4. Create the needed `.env` and `.env.build` files in the root directory of the project:
   1. By calling `scripts\create-env.ps1`
5. ```powershell
    .\scripts\create-env.ps1
    ```
   1. Manually:
      1. By copying `.env.sample' to '.env' and modifying that.
      2. By copying `.env.build.sample' to '.env.build' and modifying that.

## Building the Application

1. Ensure you have created the `.env` and `.env.build` files.

2. Run the Build Script:
    ```powershell
    .\build.ps1
    ```

## Running the Application

1. Run Locally:

    If the ```RunInteractive``` is set to true in the ```.env``` file,
    you will be able to interact with the API through a menu.

    1. In Development Mode:
        ```powershell
        .\run-dev.ps1
        ```
    2. In a Container with Docker Compose:
        ```powershell
        .\run-compose.ps1
        ```

2. The application will run on the port specified in the `Port` environment variable or default to `4000`.

## API Endpoints

### GET /

Fetches the list of running Docker images.

- **URL**: `/`
- **Method**: `GET`
- **Response**:
    ```json
    [
        {
            "name": "caddy",
            "tag": "lucaslorentz/caddy-docker-proxy",
            "version": "ci-alpine",
            "createdAt": 2025-03-03T00:08:23.895Z
        }
    ]
    ```

### POST /webhook

Triggers a Docker Compose restart command for the specified image tag.

- **URL**: `/webhook`
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "event": "webhook",
        "data": {
            "tag": "castopod"
        },
        "parameters": {
            "hardReset": "false"
        },
        "isTest": true
    }
    ```
- **Response**:
    ```json
    {
        "request": {
            "event": "webhook",
            "data": { "tag": "castopod" },
            "parameters": {
                "hardReset": "false"
            },
            "isTest": true
        },
        "response": {
            "success": "false",
            "message": "isTest: true",
            "image": "castopod"
        }
    }
    ```
- **Request Body**:
    ```json
    {
        "event": "webhook",
        "data": {
            "tag": "castopod"
        },
        "parameters": {
            "hardReset": "false"
        },
        "isTest": false
    }
    ```
- **Response**:
    ```json
    {
        "request": {
            "event": "webhook",
            "data": {
                "tag": "castopod"
            },
            "parameters": {
                "hardReset": "false"
            },
            "isTest": true
        },
        "response": {
            "success": "true",
            "message": "Docker-Compose Executed Successfully",
            "image": "castopod"
        }
    }
    ```

## Scripts

### `build.ps1`

A PowerShell script to build the application and push the image to GitHub

- **Usage**:
    ```powershell
    .\build.ps1
    ```

### `run-compose.ps1`

A PowerShell script to build and run the application with Docker Compose

- **Usage**:
    ```powershell
    .\run-compos.ps1
    ```

### `run-dev.ps1`

A PowerShell script to build and run the application in development mode

- **Usage**:
    ```powershell
    .\run-dev.ps1
    ```

### `scripts\create-env.ps1`

A PowerShell script to create the `.env` and `.env.build` files

- **Usage**:
    ```powershell
    .\scripts\create-env.ps1
    ```

### `scripts\get.ps1`

A PowerShell script to send a GET request to the `/` endpoint.

- **Usage**:
    ```powershell
    .\scripts\get.ps1
    ```

### `scripts\post-webhook.ps1`

A PowerShell script to send a POST request to the `/webhook` endpoint.

- **Usage**:
    ```powershell
    .\scripts\post-webhook.ps1
    ```

### `scripts\run-sh-container.ps1`

A PowerShell script to build and execute `sh` inside the container.

- **Usage**:
    ```powershell
    .\scripts\run-sh-container.ps1
    ```

### Using the `.env` and `.env.build` Files in PowerShell Scripts

The PowerShell scripts are configured to read environment variables from the `.env` and `.env.build` files located in the root directory of the project. Ensure that the `.env` file contains the API key necessary before running the application.

## Workflows

This project uses GitHub Actions for CI/CD workflow. To run the workflow locally, you can use the `act` tool.

## Running Workflows Locally with `act`

To test GitHub Actions workflows locally, you can use a tool called `act`. This tool allows you to run your GitHub Actions workflows on your local machine.

### Prerequisites

1. **Install `act`**:
    - On macOS, you can use Homebrew:
      ```sh
      brew install act
      ```
    - On Windows, you can use Scoop:
      ```sh
      winget install nektos.act
      ```
    - Alternatively, you can download the binary from the [act releases page](https://github.com/nektos/act/releases).

2. **Verify the Installation**::
    ```sh
    act --version
    ```

3. **Configure `act`**:
    - Create a `.secrets` file in the root of your repository to store any secrets required by your workflows. For example:
      ```powershell
      GITHUBPACKAGESTOKEN=<your_github_token>
      ```

### Running the Workflows

**Build the Container, in the root of the repository**:
```powershell
.\scripts\workflow-build-container.ps1
```

## ToDo

### Tests

- Fix failing tests in the `DockerService` class.
- Implement unit tests for all services and controllers.
- Add integration tests for API endpoints.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.