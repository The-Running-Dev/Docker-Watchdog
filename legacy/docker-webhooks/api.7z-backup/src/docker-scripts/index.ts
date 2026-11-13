// api/docker/index.ts

export interface DockerScripts {
    info: string;
    inspect: string;
    ps: string;
    psFilter: string;
    run: string;
    listRunningComposeImages: string;
    composeConfigFiles: string;
    extractDockerRunCommand: string;
    composeRestart: string;
    updateImage: string;
}

export const DockerScripts: DockerScripts = {
    info: 'docker-scripts/info.ps1',
    inspect: 'docker-scripts/inspect.ps1',
    ps: 'docker-scripts/ps.ps1',
    psFilter: 'docker-scripts/ps-filter.ps1',
    run: 'docker-scripts/run.ps1',
    listRunningComposeImages: 'docker-scripts/compose-ls.ps1',
    composeConfigFiles: 'docker-scripts/compose-config-files.ps1',
    extractDockerRunCommand: 'docker-scripts/extract-run-command.ps1',
    composeRestart: 'docker-scripts/compose-restart.ps1',
    updateImage: 'docker-scripts/update-image.ps1'
};
