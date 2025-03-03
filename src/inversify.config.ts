// src/inversify.config.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import TYPES from './types';
import {
    DockerService,
    ErrorHandlingService,
    LoggerService,
    ShellExecuteService
} from './services';

const container = new Container();

container.bind<LoggerService>(TYPES.LoggerService).to(LoggerService);
container.bind<DockerService>(TYPES.DockerService).to(DockerService);
container.bind<ErrorHandlingService>(TYPES.ErrorHandlingService).to(ErrorHandlingService);
container.bind<ShellExecuteService>(TYPES.ShellExecuteService).to(ShellExecuteService);

export default container;
