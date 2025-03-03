// scripts/set-environment.ts

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

class SetEnvironment {
    private isProduction: boolean = true;
    private targetPath: string;
    private targetDir: string;
    private runInteractive: boolean = false;
    private port: number = 4000;
    private apiKey: string = '';
    private envFile = '../.env';
    private projectEnvironmentFile = '../src/environments/environment.ts';

    constructor() {
        dotenv.config({ path: path.resolve(__dirname, this.envFile) });

        this.targetPath = path.join(__dirname, this.projectEnvironmentFile);
        this.targetDir = path.dirname(this.targetPath);

        this.isProduction = process.env['NODE_ENV']?.trim() === 'production';
        this.runInteractive = this.isProduction ? false : process.env.runInteractive === 'true';
        this.port = Number(process.env.Port) || 4000;
        this.apiKey = process.env.APIKey as string;
    }

    public createProjectEnvironment(): void {
        const envFile = `
export const environment = {
    production: ${this.isProduction},
    runInteractive: ${this.runInteractive},
    port: ${this.port},
    apiKey: '${this.apiKey}',
    debugMode: true,
    logLevel: 'info',
    featureToggle: {
        newFeature: true,
        experimental: false
    }
};`;

        fs.writeFileSync(this.targetPath, envFile);
    }

    public ensureDirectoryExists(): void {
        if (!fs.existsSync(this.targetDir)) {
            fs.mkdirSync(this.targetDir, { recursive: true });
        }
    }
}

const setEnvironment = new SetEnvironment();
setEnvironment.createProjectEnvironment();