// src/services/DockerService.ts

import TYPES from '../types';
import { inject, injectable } from 'inversify';
import { LoggerService, ShellExecuteService } from './';
import { DockerImage, DockerComposeImage, WebhookRequest } from '../models';
import { DockerScripts } from '../docker';
import { Messages } from '../constants/messages';
import { StringUtils } from '../utils/string-utils';

@injectable()
export class DockerService {
    private logger: LoggerService;
    private shellExecuteService: ShellExecuteService;
    private images: DockerImage[] = [];
    private composeImages: DockerComposeImage[] = [];
    private cacheCreatedAt: Date | null = null;

    constructor(
        @inject(TYPES.LoggerService) logger: LoggerService,
        @inject(TYPES.ShellExecuteService) shellExecuteService: ShellExecuteService
    ) {
        this.logger = logger;
        this.shellExecuteService = shellExecuteService;
    }

    async initialize() {
        if (this.isProcessRunning()) {
            await this.getImages();
            await this.getComposeImages();
            this.cacheCreatedAt = new Date();

            this.shellExecuteService.monitorDockerEvents().subscribe({
                next: async ({ event, containerId }) => {
                    const image = await this.parseImages(DockerScripts.inspect, [containerId]);

                    if (event === 'create') {
                        this.images.push(image[0]);
                    } else if (event === 'kill') {
                        this.images = this.images.filter(img => img.tag !== image[0].tag);
                    }

                    this.cacheCreatedAt = new Date();
                },
                error: (error) => {
                    this.logger.error(`Error Monitoring Docker Events: ${error.message}`);
                }
            });
        }
    }

    isProcessRunning(): boolean {
        try {
            this.shellExecuteService.execute(DockerScripts.info, []);

            return true;
        } catch (error: any) {
            this.logger.error(Messages.dockerNotRunning + error.message);

            return false;
        }
    }
    
    async getImages(): Promise<DockerImage[]> {
        if (this.images.length > 0) {
            this.logger.info(`Returning Cached Images: ${this.cacheCreatedAt?.toISOString()}`);

            return this.images;
        }
        
        try {
            this.images = await this.parseImages(DockerScripts.ps, []);
            
            return this.images;
        } catch (error: any) {
            this.logger.error(Messages.errorFetchingImages + error.message);

            throw error;
        }
    }

    async getComposeImages(): Promise<DockerComposeImage[]> {
        if (this.composeImages.length > 0) {
            this.logger.info('Returning Cached Compose Images.');

            return this.composeImages;
        }

        try {
            const stdout = await this.shellExecuteService.execute(DockerScripts.listRunningComposeImages, []);
            const images: DockerComposeImage[] = JSON.parse(stdout)
                .map((image: any) => ({
                    Name: image.Name,
                    Status: StringUtils.formatStatus(image.Status),
                    ConfigFiles: image.ConfigFiles
                }));
            
            this.composeImages = images.length > 0 ? images : [];
            this.composeImages = this.composeImages.sort((a, b) => a.Name.localeCompare(b.Name));

            return this.composeImages;
        } catch (error: any) {
            this.logger.error(Messages.errorFetchingImages + error.message);

            throw error;
        }
    }

    async parseImages(dockerScript: string, args: string[]): Promise<DockerImage[]> {       
        var parsedImages: DockerImage[] = [];
         
        try {
            const stdout = await this.shellExecuteService.execute(dockerScript, args);
            const images = stdout.split('\n')
                .filter(line => line.trim() !== '' && line.includes(':') && !line.includes('\u001b'))
                .map(line => {
                    const [name, tagAndVersion, createdAtString] = line.split(',').map(part => part.trim());
                    const [tag, version] = tagAndVersion.split(':').map(part => part.trim());

                    // Remove the timezone abbreviation (e.g., "EET") and parse the date
                    const parsedDate = new Date(createdAtString.replace(/ [A-Z]{3}$/, ''));

                    return { name: name.replace(/^\//g, ''), tag, version, createdAt: parsedDate } as DockerImage;
                });

                parsedImages = images.length > 0 ? images : [];
                parsedImages = parsedImages.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });

                return parsedImages;
        } catch (error: any) {
            this.logger.error(Messages.errorFetchingImages, { data: error.message });

            throw error;
        }
    }

    async restartComposeImage(request: WebhookRequest): Promise<{ success: boolean, message: string; image: string }> {
        const tag = request.data.tag;
        const hardReset = request.parameters.hardReset;
        const image = await this.findImageByTag(tag) as DockerComposeImage;

        if (!image) {
            this.logger.error(`Image not Found: ${tag}`);

            throw new Error(`Image not Found: ${tag}`);
        }

        try {
            await this.shellExecuteService.execute(
                DockerScripts.composeRestart,
                [image.ConfigFiles, `$${hardReset.toString()}`],
                true
            );
            
            return {
                success: true,
                message: Messages.dockerComposeExecutedSuccessfully,
                image: image.Name
            };
        } catch (error: any) {
            this.logger.error(Messages.errorExecutingDockerCompose, { data: error.message });

            throw error;
        }
    }

    async findImageByTag(tag: string): Promise<DockerImage | DockerComposeImage | null> {
        const image = this.images.find(image => image.tag === tag);

        if (image) {
            return image;
        }

        const composeImage = this.composeImages.find(image => image.Name === tag);

        if (composeImage) {
            return composeImage;
        }

        this.logger.error(`Image not Found for: ${tag}`);

        return null;
    }

    // monitorDockerEvents(): Observable<string> {
    //     return new Observable<string>((subscriber) => {
    //         const command = 'docker events --filter "type=container" --filter "event=create"';
    //         const child = spawn(command, { shell: true });

    //         child.stdout.on('data', (data: Buffer) => {
    //             const eventString = data.toString().trim();

    //             if (eventString.includes('container create') || eventString.includes('container kill')) {
    //                 // Split the event string by spaces to get the container ID
    //                 const parts = eventString.split(' ');
    //                 const containerId = parts[3];

    //                 subscriber.next(containerId);
    //             }
    //         });

    //         child.stderr.on('data', (data: Buffer) => {
    //             this.logger.error(`Docker Events: ${data.toString().trim()}`);
    //             subscriber.error(new Error(data.toString().trim()));
    //         });

    //         child.on('close', (code: number) => {
    //             this.logger.info(`Docker Events Exited: ${code}`);

    //             if (code !== 0) {
    //                 subscriber.error(new Error(`Docker Events Exited: ${code}`));
    //             } else {
    //                 subscriber.complete();
    //             }
    //         });

    //         return () => {
    //             child.kill();
    //         };
    //     });
    // }

    // async getImageDetails(imageTag: string): Promise<string>;
    // async getImageDetails(containerIdOrName: string, extractRunCommand: boolean): Promise<string>;
    // async getImageDetails(arg1: string, arg2?: boolean): Promise<string> {
    //     const script = arg2 ? DockerScripts.extractDockerRunCommand : DockerScripts.inspect;
    //     const command = `powershell -File ${script} ${arg1}`;

    //     try {
    //         this.logger.info(Messages.runCommand + command);
    //         const stdout = await this.shellExecuteService.execute(script, [arg1]);
    //         return stdout;
    //     } catch (error: any) {
    //         this.logger.error(Messages.errorFetchingImageDetails + error.message);
    //         throw error;
    //     }
    // }
    
    // async getRunningImageDetails(imageTag: string): Promise<string> {
    //     try {
    //         const configFile = await this.getConfigFileForImage(imageTag);
    
    //         if (configFile) {
    //             return Messages.imageHasComposeFile(imageTag, configFile);
    //         }
    
    //         const isRunningWithDockerRun = await this.isImageRunningWithDockerRun(imageTag);
    
    //         this.logger.info(`isRunningWithDockerRun: ${isRunningWithDockerRun}`);
            
    //         if (isRunningWithDockerRun) {
    //             const runCommand = await this.getImageDetails(imageTag, true);

    //             this.logger.info(Messages.runCommand + runCommand);

    //             return Messages.imageRunningWithDockerRun(imageTag);
    //         }
    
    //         return Messages.imageNotRunningStatus(imageTag);
    //     } catch (error: any) {
    //         this.logger.error(Messages.errorFetchingRunningImageDetails + error.message);

    //         throw error;
    //     }
    // }
    
    // async isImageRunningWithDockerRun(imageTag: string): Promise<boolean> {
    //     try {
    //         const stdout = await this.shellExecuteService.execute(DockerScripts.ps, []);

    //         return stdout.split('\n').some(line => line.includes(imageTag));
    //     } catch (error: any) {
    //         this.logger.error(Messages.errorCheckingIfImageIsRunningWithDockerRun + error.message);

    //         throw error;
    //     }
    // }

    // async runDockerComposeUp(imageTag: string): Promise<string> {
    //     this.logger.info(Messages.images, this.runningImages);

    //     if (!this.runningImages.find(image => image.tag === imageTag)) {
    //         const error = new Error(Messages.imageNotRunning(imageTag));

    //         this.logger.error(error.message);

    //         throw error;
    //     }

    //     try {
    //         const details = await this.getRunningImageDetails(imageTag);
    //         this.logger.info(Messages.imageDetails + details);
            
    //         //const command = `docker-compose up ${imageTag}`;
    //         //await this.shellExecuteService.execute(command, []);

    //         this.logger.info(Messages.dockerComposeExecuted + imageTag);

    //         return Messages.dockerComposeExecutedSuccessfully;
    //     } catch (error: any) {
    //         this.logger.error(Messages.errorExecutingDockerCompose + error.message);
    //         throw error;
    //     }
    // }
}