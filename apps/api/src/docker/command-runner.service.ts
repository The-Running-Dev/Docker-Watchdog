import { execFile } from 'node:child_process';
import { Injectable } from '@nestjs/common';

export interface CommandResult {
  /** Exit code; 1 when the process could not start or was killed. */
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
}

/** Ten minutes: a large pull on a slow link takes a while. */
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/** Runs a program with an argument array. There is never a shell, so arguments are never interpreted. */
@Injectable()
export class CommandRunner {
  run(file: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    return new Promise((resolve) => {
      execFile(
        file,
        args,
        {
          cwd: options.cwd,
          timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          maxBuffer: 16 * 1024 * 1024,
          windowsHide: true,
          encoding: 'utf8',
        },
        (error, stdout, stderr) => {
          if (!error) return resolve({ code: 0, stdout, stderr });

          const code = typeof error.code === 'number' ? error.code : 1;

          resolve({ code, stdout, stderr: stderr || error.message });
        },
      );
    });
  }
}
