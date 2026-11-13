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
    info: 'docker/info.ps1',
    inspect: 'docker/inspect.ps1',
    ps: 'docker/ps.ps1',
    psFilter: 'docker/ps-filter.ps1',
    run: 'docker/run.ps1',
    listRunningComposeImages: 'docker/compose-ls.ps1',
    composeConfigFiles: 'docker/compose-config-files.ps1',
    extractDockerRunCommand: 'docker/extract-run-command.ps1',
    composeRestart: 'docker/compose-restart.ps1',
    updateImage: 'docker/update-image.ps1'
};
