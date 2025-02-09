// scripts/set-env.ts
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Determine the environment
const isProduction = process.env['NODE_ENV'] === 'production';

// Load environment variables from the appropriate .env file
const envFile = isProduction ? '.env.prod' : '.env';
dotenv.config({ path: envFile });

// Define the target path for the environment file
const targetPath = path.join(__dirname, '../src/environments/environment.ts');

// Ensure the directory exists
const targetDir = path.dirname(targetPath);

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Create the environment file content
const envConfigFile = `
export const environment = {
  production: ${isProduction},
  discordWebhookUrl: '${process.env['DiscordWebhookUrl']}'
};
`;

// Write the environment file with error handling
try {
    fs.writeFileSync(targetPath, envConfigFile, { encoding: 'utf8' });
    console.log(`Environment Variables Written: ${targetPath}`);
} catch (error: any) {
    console.error(`Error writing environment file: ${error.message}`);
}