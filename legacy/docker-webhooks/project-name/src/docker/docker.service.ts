// src/docker/docker.service.ts

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { ShellExecuteService } from '../services/';
import {
    Containers,
    DockerCompose,
    DockerContainer,
    LogLevel,
    WebhookRequest,
    WebhookResponse
} from '@shared';
import { Messages } from '../constants/messages';
import Docker from 'dockerode';

import fs from 'fs';
import { exec } from 'child_process';
import { DockerScripts } from '../docker-scripts';

@Injectable()
export class DockerService {
    private docker: Docker;
    private containers: Containers[] = [];
    private cacheCreatedAt: Date | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly shellExecuteService: ShellExecuteService
    ) {
        //this.docker = new Docker({ socketPath: '//./pipe/docker_engine' });
        this.docker = new Docker();
    }

    async initialize() {
        if (await this.isProcessRunning()) {
            await this.getContainers();
            this.cacheCreatedAt = new Date();

            this.docker.getEvents({}, async (err, stream) => {
                if (err) {
                    this.logger.log(`Error Monitoring Docker Events: ${err.message}`, LogLevel.Error);

                    return;
                }

                stream?.on('data', async (data) => {
                    const event = JSON.parse(data.toString());
                    
                    const containerId = event.id;

                    if (event.status === 'create') {
                        const container = await this.inspectContainer(containerId);
                        const project = container.Labels['com.docker.compose.project'];
                        const existingProject = this.containers.find(x => x.Project === project);

                        if (!existingProject) {
                            this.containers.push({Project: project, Containers: [container]});

                            console.log(`Container ${containerId} Added to ${project}...`);
                        } else {
                            existingProject.Containers.push(container);

                            console.log(`Container ${containerId} Added to ${existingProject.Project}...`);
                        }
                    } else if (event.status === 'kill') {
                        this.containers.forEach(project => {
                            project.Containers = project.Containers.filter(container => container.Id !== containerId);
                        });
                        
                        console.log(`Container ${containerId} Removed...`);
                    }

                    this.cacheCreatedAt = new Date();
                });
            });
        }
    }

    async isProcessRunning(): Promise<boolean> {
        try {
            const info = await this.docker.info();

            return info.ServerVersion !== undefined;
        } catch (error: any) {
            this.logger.log(`${Messages.dockerNotRunning}${error.message}`, LogLevel.Error);

            return false;
        }
    }

    isRunningInsideDocker(): boolean {
        try {
            return fs.existsSync('/.dockerenv') || fs.existsSync('/proc/self/cgroup');
        } catch (error) {
            console.error('Error Checking Docker Environment:', error);

            return false;
        }
    }

    async getContainers(): Promise<Containers[]> {
        if (this.containers.length > 0) {
            this.logger.log(`Returning Cached Containers: ${this.cacheCreatedAt?.toISOString()}`, LogLevel.Info);

            return this.containers;
        }

        try {
            const containers = await this.docker.listContainers({all: true});
            const projects = new Map<string, DockerContainer[]>();

            containers.forEach(x => {
                const project = x.Labels['com.docker.compose.project'] || '';
                const [image, version] = x.Image.split(':');

                const container = {
                    Id: x.Id,
                    Name: x.Names[0].replace(/^\//g, ''),
                    Image: image,
                    Labels: x.Labels,
                    CreatedAt: new Date(Number(x.Created * 1000)),
                    Status: x.Status,
                    ConfigFiles: x.Labels['com.docker.compose.project.config_files'],
                    Version: version
                } as DockerContainer;

                if (!projects.has(project)) {
                    projects.set(project, []);
                }

                projects.get(project)?.push(container);
            });

            this.containers = Array.from(projects.entries()).map(([project, containers]) => ({
                Project: project,
                Containers: containers
            }));

            return this.containers;
        } catch (error: any) {
            this.logger.log(Messages.errorFetchingContainers + error.message, LogLevel.Error);

            throw error;
        }
    }

    async inspectContainer(containerId: string): Promise<DockerContainer> {
        try {
            const container = this.docker.getContainer(containerId);
            const data = await container.inspect();
            const [image, version] = data.Image.split(':');

            return {
                Id: data.Id,
                Name: data.Name[0],
                Image: image,
                Status: data.State.Status,
                CreatedAt: new Date(Number(data.Created) * 1000),
                Labels: data.Config.Labels,
                ConfigFiles: data.Config.Labels['com.docker.compose.project.config_files'],
                Version: version
            };
        } catch (error: any) {
            this.logger.log(Messages.errorFetchingContainers + error.message, LogLevel.Error);

            throw error;
        }
    }

    async restartProjectOrContainer(request: WebhookRequest): Promise<WebhookResponse> {
        let webHookResponse: WebhookResponse ={
            success: false,
            message: '',
            projectOrContainerId: request.data.projectOrContainerId
        };

        if (request.data.isTest) {
            return await this.updateTestResponse(request);
        }

        if (request.event === 'update-project') {
            const name = request.data.projectOrContainerId;
            const project = await this.findProjectByName(name);

            if (!project) {
                this.logger.log(`Project Not Found: ${name}`, LogLevel.Error);

                throw new Error(`Project Not Found: ${name}`);
            }

            webHookResponse = await this.updateProject(project, request.data.hardReset);
        } else if (request.event === 'update-container') {
            const container = await this.findContainer(x => x.Name === request.data.projectOrContainerId);

            if (!container) {
                this.logger.log(`Container Not Found: ${container}`, LogLevel.Error);

                throw new Error(`Container Not Found: ${container}`);
            }

            webHookResponse = await this.updateContainer(container);
        }

        return webHookResponse;
    }

    async runCommand(command: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${stderr}`);
                    
                    reject(error);
                } else {
                    console.log(`Output: ${stdout}`);
                    
                    resolve();
                }
            });
        });
    }

    async updateProject(project: DockerCompose, hardReset: boolean): Promise<WebhookResponse> {
        try {
            //const compose = new DockerodeCompose(this.docker, project.ComposeFile, project.Name);

            //console.log(`🛑 Stopping Compose Project: ${project.Name}...`);
            //await this.runCommand(`docker-compose -f ${project.ComposeFile} down --volumes --remove-orphans`);
            //console.log('✅ Project Stopped...');

            // console.log(`🛑 Stopping Compose Project: ${project.Name}...`);
            // await compose.down({ volumes: true });
            // console.log('✅ Project Stopped...');

            // console.log(`🛑 Pruning Containers...`);
            // await this.docker.pruneContainers();
            // console.log('✅ Removed Orphaned Containers...');
            //
            // // Adding a delay to ensure Docker has processed the commands
            // await this.delay(5000)
            //
            // console.log('⬇️ Pulling Updated Images...');
            // await compose.pull();
            // console.log('✅ Images Updated...');
            //
            // console.log('🚀 Starting Project...');
            // await compose.up();
            // console.log('✅ Project Restarted Successfully...');

            await this.shellExecuteService.execute(
                DockerScripts.composeRestart,
                [project.ComposeFile, `$${hardReset.toString()}`],
                true
            );
            
            return {
                success: true,
                message: `✅ Project Updated....`,
                projectOrContainerId: project.Name
            } as WebhookResponse;
        } catch (error: any) {
            console.error('❌ Project Restart Failed:', error);

            return {
                success: false,
                message: '❌ Project Restart Failed....',
                details: error.json.message,
                projectOrContainerId: project.Name
            } as WebhookResponse;
        }
    }

    async updateContainer(container: DockerContainer): Promise<WebhookResponse> {
        try {
            const instance = this.docker.getContainer(container.Id);

            // Step 1: Inspect to get current config
            const inspectData = await instance.inspect();
            const image = inspectData.Config.Image;

            console.log(`🔄 Pulling Latest Image: ${image}...`);

            await new Promise((resolve, reject) => {
                this.docker.pull(image, (error: Error, stream: NodeJS.ReadableStream) => {

                    if (error) {
                        return reject(error);
                    }

                    this.docker.modem.followProgress(stream, onFinished, onProgress);

                    function onFinished(error: any, output: any) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(output);
                        }
                    }

                    function onProgress(event: any) {
                        if (event.status) {
                            console.log(`→ ${event.status}`);
                        }
                    }
                });
            });

            // Step 2: Stop and remove the old container
            console.log(`🛑 Stopping Container ${container.Name}...`);

            try {
                await instance.stop();
            } catch (error: any) {
                console.warn(`⚠️ Warning: Could Not Stop Container:`, error);
            }

            console.log(`🗑️ Removing Container ${container.Name}...`);

            await instance.remove();

            // Step 3: Recreate container using original config
            console.log(`🚀 Recreating Container ${container.Name}...`);

            const newContainer = await this.docker.createContainer({
                Image: image,
                name: inspectData.Name.replace(/^\//, ''), // Dockerode adds a "/" to names
                Cmd: inspectData.Config.Cmd,
                Env: inspectData.Config.Env,
                Tty: inspectData.Config.Tty,
                WorkingDir: inspectData.Config.WorkingDir,
                Labels: inspectData.Config.Labels,
                ExposedPorts: inspectData.Config.ExposedPorts,
                HostConfig: inspectData.HostConfig,
                NetworkingConfig: inspectData.NetworkSettings?.Networks
                    ? {
                        EndpointsConfig: Object.fromEntries(
                            Object.entries(inspectData.NetworkSettings.Networks).map(([name, net]) => [
                                name,
                                {
                                    IPAMConfig: net.IPAMConfig,
                                    Links: net.Links,
                                    Aliases: net.Aliases
                                }
                            ])
                        )
                    }
                    : undefined
            });

            // Step 4: Start the new container
            await newContainer.start();

            console.log(`✅ Container ${container.Name} Updated....`);

            return {
                success: true,
                message: `✅ Container Updated....`,
                projectOrContainerId: container.Name
            } as WebhookResponse;
        } catch (error: any) {
            console.error(`❌ Error Updating Container ${container.Name}:`, error);

            return {
                success: false,
                message: '❌ Container Update Failed....',
                details: (error as Error).message,
                projectOrContainerId: container.Name
            } as WebhookResponse;
        }
    }

    async updateImage(): Promise<{ success: boolean, message: string }> {
        try {
            if (this.isRunningInsideDocker()) {
                const container = this.docker.getContainer('localhost');

                await container.update({Image: process.env.GitHubImageTag});

                return {success: true, message: 'API Container Updated...'};
            }

            return {success: false, message: 'API Not Inside Docker...'};
        } catch (error: any) {
            this.logger.log(`Error Triggering Update: ${error.message}`, LogLevel.Error);

            return {success: false, message: `Error Triggering Update: ${error.message}`};
        }
    }

    // async findContainerByImage(image: string): Promise<DockerContainer | null> {
    //     const container = this.containers
    //         .flatMap(x => x.Containers)
    //         .find(y => y.Image === image);
    //
    //     if (container) {
    //         return container;
    //     }
    //
    //     this.logger.log(`Image Not Found: ${image}`, LogLevel.Error);
    //    
    //     return null;
    // }

    async updateTestResponse(request: WebhookRequest): Promise<WebhookResponse> {
        return new Promise(resolve => {
            resolve({
                success: true,
                message: `Test Restart Successful...`,
                projectOrContainerId: request.data.projectOrContainerId
            } as WebhookResponse);
        });
    }

    async findContainer(predicate: (container: DockerContainer) => boolean): Promise<DockerContainer | null> {
        const container = this.containers
            .flatMap(x => x.Containers)
            .find(predicate);

        if (container) {
            return container;
        }

        this.logger.log(`Container Not Found`, LogLevel.Error);

        return null;
    }

    async findProjectByName(name: string): Promise<DockerCompose | null> {
        const containers = this.containers.find(x => x.Project === name);

        if (containers) {
            const c = containers.Containers[0];

            return {
                Name: containers.Project,
                WorkingDir: c.ConfigFiles,
                ComposeFile: c.ConfigFiles
            } as DockerCompose;
        }

        this.logger.log(`Project Not Found: ${name}`, LogLevel.Error);

        return null;
    }
}