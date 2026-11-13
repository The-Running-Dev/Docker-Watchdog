// api/scripts/set-environment.ts

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

class SetEnvironment {
    private envFile: string = '../../.env';
    private projectEnvironmentFile = '../environments/environment.ts';
    private targetPath: string;
    private targetDir: string;

    private adminUser: string = '';
    private adminPassword: string = '';
    private apiKey: string = '';
    private buildDate: string = '';
    private isProduction: boolean = true;
    private jwtSecret: string = '';
    private port: number = 4000;
    private runInteractive: boolean = false;
    private version: string = '';
    
    constructor() {
        dotenv.config({ path: path.resolve(__dirname, this.envFile) });

        this.targetPath = path.join(__dirname, this.projectEnvironmentFile);
        this.targetDir = path.dirname(this.targetPath);

        this.apiKey = process.env.APIKey as string;
        this.adminUser = process.env.adminUser as string;
        this.adminPassword = process.env.adminPassword as string;
        this.buildDate = new Date().toISOString().replace(/[-:]/g, '.').replace('T', '.');
        this.isProduction = process.env['NODE_ENV']?.trim() === 'production';
        this.jwtSecret = process.env.JWTSecret as string;
        this.port = Number(process.env.Port) || 4000;
        this.runInteractive = this.isProduction ? false : process.env.runInteractive === 'true';

        const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));
        this.version = packageJson.version;
    }

    public createProjectEnvironment(): void {
        const envFile = `
export const environment = {
    adminUser: '${this.adminUser}',
    adminPassword: '${this.adminPassword}',
    apiKey: '${this.apiKey}',
    buildDate: '${this.buildDate}',
    debugMode: true,
    featureToggle: {
        newFeature: true,
        experimental: false
    },
    jwtSecret: '${this.jwtSecret}',
    logLevel: 'info',
    port: ${this.port},
    production: ${this.isProduction},
    runInteractive: ${this.runInteractive},
    version: '${this.version}'
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