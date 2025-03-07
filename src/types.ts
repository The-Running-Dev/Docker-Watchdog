// src/types.ts

const TYPES = {
    LoggerService: Symbol.for('LoggerService'),
    LoggerStreamService: Symbol.for('LoggerStreamService'),
    DockerService: Symbol.for('DockerService'),
    DockerCommands: Symbol.for('DockerCommands'),
    ErrorHandlingService: Symbol.for('ErrorHandlingService'),
    ShellExecuteService: Symbol.for('ShellExecuteService')
};

export default TYPES;
