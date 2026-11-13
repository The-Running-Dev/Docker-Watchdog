// src/shell/shell.module.ts
import { Module } from '@nestjs/common';
import { ShellExecuteService } from './shell-execute.service';

@Module({
    providers: [ShellExecuteService],
    exports: [ShellExecuteService],
})
export class ShellModule {}