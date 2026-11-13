"use strict";
// scripts/set-environment.ts
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var dotenv = require("dotenv");
var SetEnvironment = /** @class */ (function () {
    function SetEnvironment() {
        var _a;
        this.isProduction = true;
        this.runInteractive = false;
        this.port = 4000;
        this.apiKey = '';
        this.mongoUri = '';
        this.jwtSecret = '';
        this.envFile = '../../.env';
        this.projectEnvironmentFile = '../environments/environment.ts';
        this.version = '';
        this.buildDate = '';
        dotenv.config({ path: path.resolve(__dirname, this.envFile) });
        this.targetPath = path.join(__dirname, this.projectEnvironmentFile);
        this.targetDir = path.dirname(this.targetPath);
        this.isProduction = ((_a = process.env['NODE_ENV']) === null || _a === void 0 ? void 0 : _a.trim()) === 'production';
        this.runInteractive = this.isProduction ? false : process.env.runInteractive === 'true';
        this.port = Number(process.env.Port) || 4000;
        this.apiKey = process.env.APIKey;
        this.mongoUri = process.env.MongoUri;
        this.jwtSecret = process.env.JWTSecret;
        var packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));
        this.version = packageJson.version;
        this.buildDate = new Date().toISOString().replace(/[-:]/g, '.').replace('T', '.');
    }
    SetEnvironment.prototype.createProjectEnvironment = function () {
        var envFile = "\nexport const environment = {\n    production: ".concat(this.isProduction, ",\n    runInteractive: ").concat(this.runInteractive, ",\n    port: ").concat(this.port, ",\n    apiKey: '").concat(this.apiKey, "',\n    version: '").concat(this.version, "',\n    buildDate: '").concat(this.buildDate, "',\n    debugMode: true,\n    logLevel: 'info',\n    featureToggle: {\n        newFeature: true,\n        experimental: false\n    },\n    mongoUri: '").concat(this.mongoUri, "',\n    jwtSecret: '").concat(this.jwtSecret, "',\n};");
        fs.writeFileSync(this.targetPath, envFile);
    };
    SetEnvironment.prototype.ensureDirectoryExists = function () {
        if (!fs.existsSync(this.targetDir)) {
            fs.mkdirSync(this.targetDir, { recursive: true });
        }
    };
    return SetEnvironment;
}());
var setEnvironment = new SetEnvironment();
setEnvironment.createProjectEnvironment();
