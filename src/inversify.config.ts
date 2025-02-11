// src/inversify.config.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import { DockerService, LoggerService } from './services';
import TYPES from './types'

const container = new Container();

// Make sure you bind LoggerService
container.bind<LoggerService>(TYPES.LoggerService).to(LoggerService);
container.bind<DockerService>(TYPES.DockerService).to(DockerService);

export default container;
