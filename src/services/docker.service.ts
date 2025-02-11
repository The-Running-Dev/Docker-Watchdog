// src/services/DockerService.ts

import TYPES from '../types';
import { exec } from 'child_process';
import { inject } from 'inversify';
import { execSync } from 'node:child_process';
import { LoggerService } from './logger.service';
import { DockerImage } from '../models';

export class DockerService {
    private logger: LoggerService;
    private runningImages: DockerImage[] = [];

    constructor(@inject(TYPES.LoggerService) logger: LoggerService) {
        this.logger = logger;

        if (this.isProcessRunning()) {
            this.getImages((error, images) => {
                if (error) {
                    this.logger.error(`Error Fetching Images: ${error.message}`);

                    return;
                }

                this,logger.info('Images:', images);
            });
        }
    }

    isProcessRunning(): boolean {
        try {
            execSync('docker info');
            
            return true;
        } catch (error: any) {
            this.logger.error(`Docker Not Running: ${error.message}`);
            
            return false;
        }
    }
    
    getImages(callback: (error: Error | null, images: DockerImage[]) => void) {
        if (this.runningImages.length > 0) {
            return this.runningImages;
        }
        
        this.execWithLogging("docker ps --format '{{.Image}}'", (error, stdout, stderr) => {
            if (error || stderr) {
                callback(error || new Error(stderr), []);
                
                return;
            }

            const images = stdout.split('\n').filter(image => image).map(image => {
                const [tag, version] = image.replace(/'/g, '').split(':');
                return { tag, version } as DockerImage;
            });
            
            this.runningImages = images || [];
            
            callback(null, this.runningImages);
        }, 'Fetching Images');
    }

    getImageDetails(imageTag: string, callback: (error: Error | null, details: string | null) => void) {
        this.execWithLogging(`docker inspect ${imageTag}`, (error, stdout, stderr) => {
            if (error || stderr) {
                callback(error || new Error(stderr), null);
                
                return;
            }

            callback(null, stdout);
        });
    }

    getRunningImageDetails(imageTag: string, callback: (error: Error | null, details: string | null) => void) {
        this.getConfigFileForImage(imageTag, (error, configFile) => {
            if (error) {
                callback(error, null);

                return;
            }

            if (!configFile) {
                this.getImageDetails(imageTag, callback);

                return;
            }

            callback(null, `Image ${imageTag} has a compose file: ${configFile}`);
        });
    }
    
    getConfigFileForImage(imageTag: string, callback: (error: Error | null, configFile: string | null) => void) {
        this.getComposeConfigFiles((error, configFiles) => {
            if (error) {
                callback(error, null);
                return;
            }

            if (!configFiles || configFiles.length === 0) {
                callback(null, null);
                
                return;
            }

            const configFile = configFiles.find(file => file.includes(imageTag));
            
            callback(null, configFile || null);
        });
    }
    
    getComposeConfigFiles(callback: (error: Error | null, configFiles: string[] | null) => void) {
        this.getImages((error, images) => {
            if (error) {
                callback(error, null);
                
                return;
            }

            if (!images || images.length === 0) {
                callback(null, []);
                
                return;
            }

            const containerList = images.join(' ');

            this.execWithLogging(`docker inspect ${containerList} --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' | sort | uniq`, (error, stdout, stderr) => {
                if (error || stderr) {
                    callback(error || new Error(stderr), null);
                    
                    return;
                }

                const configFiles = stdout.split('\n').filter(file => file);
                
                callback(null, configFiles);
            });
        });
    }

    runDockerComposeUp(imageTag: string, callback: (error: Error | null, stdout: string, stderr: string) => void) {
        this.logger.info('Running Images:', this.runningImages);

        if (!this.runningImages.find(image => image.tag === imageTag)) {
            const error = new Error(`Image: ${imageTag}...Not Running`);
            
            this.logger.error(error.message);
            
            callback(error, '', '');
            
            return;
        }

        this.getImageDetails(imageTag, (error, details) => {
            if (error) {
                this.logger.error('Error Fetching Image Details:', error);
                
                callback(error, '', '');
                
                return;
            }
            
            this.logger.info(`Image Details: ${details}`);
        });
        //const command = `docker-compose up -d ${imageTag}`;
        
        //this.logger.info(command);
        
        //this.execWithLogging(command, this.logger, callback);
    }

    execWithLogging(command: string, callback: (error: Error | null, stdout: string, stderr: string) => void, message?: string | '') {
        this.logger.info(message !== undefined ? `${message}: ${command}` : command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                this.logger.error(`Error Executing Command: ${error.message}`);
                
                callback(error, stdout, stderr);
                
                return;
            }

            if (stderr) {
                this.logger.error(`Error: ${stderr}`);
            }

            callback(null, stdout, stderr);
        });
    }
}