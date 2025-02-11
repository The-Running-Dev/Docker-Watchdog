# Docker-WebHooks

# Docker Service Application

This project is a Docker Service application built with TypeScript, Express,
and InversifyJS. It provides an API to manage Docker images and containers,
including fetching running images, inspecting image details, and running
Docker Compose commands.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/The-Running-Dev/Docker-Webhooks.git
    cd docker-service-app
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Ensure Docker is installed and running on your machine.

## Usage

1. Start the application:
    ```sh
    npm start
    ```

2. The application will run on the port specified in the `PORT` environment variable or default to `4000`.

## API Endpoints

### GET /

Fetches the list of running Docker images.

- **URL**: `/`
- **Method**: `GET`
- **Response**:
    ```json
    {
        "runningImages": [
            {
                "tag": "image-tag",
                "version": "image-version"
            }
        ]
    }
    ```

### POST /webhook

Triggers a Docker Compose up command for the specified image tag.

- **URL**: `/webhook`
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "event": "webhook",
        "data": {
            "imageTag": "barstrad-ui"
        }
    }
    ```
- **Response**:
    ```json
    {
        "message": "Docker-Compose Executed Successfully",
        "output": "command output"
    }
    ```

## Scripts

### `scripts/post-webhook.ps1`

A PowerShell script to send a POST request to the `/webhook` endpoint.

- **Usage**:
    ```powershell
    .\scripts\post-webhook.ps1
    ```

## Workflows

This project uses GitHub Actions for CI/CD workflows. To run these workflows locally, you can use the `act` tool.

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
      ```sh
      GITHUBPACKAGESTOKEN=<your_github_token>
      ```

### Running the Workflows

** Build the Container: in the root of the repository**:
```pwsh
.\workflows\build-container.ps1
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