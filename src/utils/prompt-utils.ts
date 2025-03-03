const keypress = require('keypress');

import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { environment } from '../environments/environment';
import { DockerService } from '../services/docker.service';

export class PromptUtils {
    static promptUserForMethod(dockerService: DockerService) {
        keypress(process.stdin);

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        console.log('Execute? (1: getImages, 2: getComposeImages, 3: postWebhook, 0: Exit)');

        process.stdin.on('keypress', async (ch, key) => {
            if (key && key.ctrl && key.name === 'c') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.exit();
            }

            if (ch === '1' || ch === '2' || ch === '3' || ch === '0') {
                const input = ch;

                switch (input) {
                    case '1':
                        console.clear();
                        console.log('Fetching Images...');

                        try {
                            const images = await dockerService.getImages();

                            console.log('Images:', images);
                        } catch (error: any) {
                            console.error('Error Fetching Images:', error.message);
                        }

                        break;
                    case '2':
                        console.clear();
                        console.log('Fetching Running Compose Images...');

                        try {
                            const result = await dockerService.getComposeImages();

                            console.log('Running Compose Images:', result);
                        } catch (error: any) {
                            console.error('Error Fetching Running Compose Images:', error.message);
                        }

                        break;
                    case '3':
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
                            
                            console.log('Webhook Response:', response.data);
                        } catch (error: any) {
                            console.error('Error Posting Webhook:', error.message);
                        }

                        break;
                    case '0':
                        console.log('Exiting...');

                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.exit();
                    default:
                        console.log('Invalid Option. Press 1, 2, 3, or 0.');
                }

                console.log('\nExecute? (1: getImages, 2: getComposeImages, 3: postWebhook, 0: Exit)');
            }
        });

        process.stdin.resume();
    }
}