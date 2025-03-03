import * as path from 'path';

import TYPES from '../types';

import { spawn } from 'child_process';
import { inject, injectable } from 'inversify';
import { LoggerService } from './';
import { Observable } from 'rxjs';

@injectable()
export class ShellExecuteService {
    private logger: LoggerService;

    constructor(
        @inject(TYPES.LoggerService) logger: LoggerService
    ) {
        this.logger = logger;
    }

    async execute(scriptFilename: string, args: string[], streamOutput: boolean = false): Promise<string> {
        const command = this.buildCommand(scriptFilename, args);
        
        return this.runCommand(command, streamOutput);
    }

    monitorDockerEvents(): Observable<{ event: string, containerId: string }> {
        return new Observable<{ event: string, containerId: string }>((subscriber) => {
            const command = 'docker events --filter "type=container"';
            const child = spawn(command, { shell: true });

            child.stdout.on('data', (data: Buffer) => {
                const eventString = data.toString().trim();

                if (eventString.includes('container create') || eventString.includes('container kill')) {
                    // Split the event string by spaces to get the container ID
                    const parts = eventString.split(' ');
                    const containerId = parts[3];
                    const eventType = eventString.includes('container create') ? 'create' : 'kill';

                    subscriber.next({ event: eventType, containerId });
                }
            });

            child.stderr.on('data', (data: Buffer) => {
                this.logger.error(`Docker Events: ${data.toString().trim()}`);
                
                subscriber.error(new Error(data.toString().trim()));
            });

            child.on('close', (code: number) => {
                this.logger.info(`Docker Events Exited: ${code}`);

                if (code !== 0) {
                    subscriber.error(new Error(`Docker Events Exited: ${code}`));
                } else {
                    subscriber.complete();
                }
            });

            return () => {
                child.kill();
            };
        });
    }

    protected buildCommand(scriptFilename: string, args: string[]): string {
        const scriptPath = path.resolve(__dirname, '..', scriptFilename);
        
        return `pwsh -NoProfile -NonInteractive -Command "& { . '${scriptPath}' ${args.join(' ')} }"`;
    }
    
    protected async runCommand(command: string, streamOutput: boolean): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, { shell: true });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter((line: string) => line.trim() !== '');
                stdout += lines.join('\n');

                if (streamOutput) {
                    this.logger.info(lines.join('\n'));
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                const filteredLines = lines.filter((line: string) => line.startsWith('warning') && line.trim() !== '');
                
                stderr += filteredLines.join('\n');
                
                if (filteredLines.length > 0 && streamOutput) {
                    this.logger.warn(filteredLines.join('\n'));
                }
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    this.logger.error(`Command Execution Failed: ${code}`);

                    reject(new Error(`Command Execution Failed: ${code}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}