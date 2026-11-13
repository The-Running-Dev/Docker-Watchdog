const keypress = require('keypress');

import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { environment } from '../config/environment';
import { DockerService } from '../docker/docker.service';
import { LoggerService } from '../logger/logger.service';

export class PromptUtils {
    static promptUserForMethod(dockerService: DockerService, logger: LoggerService) {
        keypress(process.stdin);

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        const options = 'Execute? (1: Containers, 2: Info, 3: Login, 4: Logs, 5: Webhook, 6: Update, 0: Exit)';
        console.log(options);

        process.stdin.on('keypress', async (ch, key) => {
            if (key && key.ctrl && key.name === 'c') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.exit();
            }

            if (/^[0-6]$/.test(ch) || ch === '0') {
                const input: string = ch;

                switch (input) {
                    case '1':
                        console.clear();
                        console.log('Getting Containers...');

                        try {
                            const containers = await dockerService.getContainers();

                            console.log(containers);
                            
                            containers.forEach((container) => {
                                console.log(`Project: ${container.Project}`);

                                container.Containers.forEach((c) => {
                                    this.logContainerProperties(c);
                                    
                                    console.log('\n');
                                });
                            })
                        } catch (error: any) {
                            console.error('Error Getting Containers:', error.message);
                        }

                        break;
                    case '2':
                        console.clear();
                        console.log('Getting Info...');

                        try {
                            const result = await dockerService.isRunningInsideDocker();

                            console.log(result);
                        } catch (error: any) {
                            console.error('Error Getting Info:', error.message);
                        }

                        break;
                    case '3':
                        console.clear();
                        console.log('Calling Login...');

                        try {
                            const data = {
                                username: environment.adminUser,
                                password: environment.adminPassword
                            };
                            const response = await axios.post('http://localhost:4000/login', data);

                            console.log(response.data);
                        } catch (error: any) {
                            console.error('Error Posting Webhook:', error.message);
                        }

                        break;
                    case '4':
                        console.clear();
                        console.log('Getting Logs...');

                        try {
                            const logs = await logger.getStream();

                            console.log(logs);
                        } catch (error: any) {
                            console.error('Error Getting Info:', error.message);
                        }

                        break;
                    case '5':
                        console.clear();
                        console.log('Posting Webhook...');

                        try {
                            const webhookDataPath = path.resolve(__dirname, '../../data/webhook-sample.json');
                            const webhookData = JSON.parse(fs.readFileSync(webhookDataPath, 'utf-8'));
                            const response = await axios.post('http://localhost:4000/webhook', webhookData, {
                                headers: {
                                    'x-api-key': environment.apiKey
                                }
                            });
                            
                            console.log(response.data);
                        } catch (error: any) {
                            console.error('Error Posting Webhook:', error.message);
                        }

                        break;
                    case '6':
                        console.clear();
                        console.log('Calling Update...');

                        try {
                            const response = await dockerService.updateImage();

                            console.log(response);
                        } catch (error: any) {
                            console.error('Error Calling Update:', error.message);
                        }

                        break;
                    case '0':
                        console.log('Exiting...');

                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.exit();
                    default:
                        console.log('Invalid Option. Press 1, 2, 3, 4, 5, 6 or 0.');
                }
                
                console.log(`\n${options}`);
            }
        });

        process.stdin.resume();
    }

    static logContainerProperties(container: any, indent: string = '  ') {
        Object.entries(container).forEach(([key, value]) => {
            if (value instanceof Date) {
                console.log(`${indent}${key}: ${value.toISOString()}`);
            } else if (typeof value === 'object' && value !== null) {
                this.logContainerProperties(value, indent + '  ');
            } else {
                console.log(`${indent}${key}: ${value}`);
            }
        });
    }
}