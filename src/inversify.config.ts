// src/inversify.config.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import TYPES from './types';
import {
    DockerService,
    ErrorHandlingService,
    LoggerService,
    LoggerStreamService,
    ShellExecuteService
} from './services';

const container = new Container();

container.bind<LoggerService>(TYPES.LoggerService).to(LoggerService).inSingletonScope();
container.bind<LoggerStreamService>(TYPES.LoggerStreamService).to(LoggerStreamService).inSingletonScope();
container.bind<DockerService>(TYPES.DockerService).to(DockerService);
container.bind<ErrorHandlingService>(TYPES.ErrorHandlingService).to(ErrorHandlingService);
container.bind<ShellExecuteService>(TYPES.ShellExecuteService).to(ShellExecuteService);

export default container;
