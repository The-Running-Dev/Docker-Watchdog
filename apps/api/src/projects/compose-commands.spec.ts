import { describe, expect, it } from 'vitest';
import { containerRestartSteps, formatCommand, projectRestartSteps, serviceRecreateSteps } from './compose-commands.js';

const project = { name: 'web', directory: '/projects/web', fileArgs: ['--file', 'docker-compose.prod.yml'] };
const plan = { pull: true, hardReset: false, deleteVolumes: false, upArgs: [] };

describe('projectRestartSteps', () => {
  it('pulls then brings the project up, in its directory', () => {
    expect(projectRestartSteps(project, plan)).toEqual([
      { step: 'pull', args: ['compose', '--file', 'docker-compose.prod.yml', 'pull'], cwd: '/projects/web' },
      { step: 'up', args: ['compose', '--file', 'docker-compose.prod.yml', 'up', '-d'], cwd: '/projects/web' },
    ]);
  });

  it('a hard reset takes the project down first and recreates everything', () => {
    const steps = projectRestartSteps(project, {
      ...plan,
      pull: false,
      hardReset: true,
      upArgs: ['--remove-orphans', '--build'],
    });

    expect(steps.map((s) => s.args.slice(3))).toEqual([
      ['down', '--remove-orphans'],
      ['up', '-d', '--force-recreate', '--remove-orphans', '--build'],
    ]);
  });

  it('removes volumes only when asked, and only with a hard reset', () => {
    const steps = projectRestartSteps(project, { ...plan, hardReset: true, deleteVolumes: true });

    expect(steps.find((s) => s.step === 'down')?.args).toContain('--volumes');
    expect(() => projectRestartSteps(project, { ...plan, deleteVolumes: true })).toThrow(
      'deleteVolumes needs hardReset',
    );
  });

  it('keeps hostile-looking arguments as single argv entries', () => {
    const steps = projectRestartSteps(project, { ...plan, upArgs: ['--scale=web=2; rm -rf /'] });

    expect(steps.at(-1)?.args.at(-1)).toBe('--scale=web=2; rm -rf /');
  });
});

describe('serviceRecreateSteps', () => {
  it('pulls and recreates one service without its dependencies', () => {
    expect(serviceRecreateSteps({ ...project, fileArgs: [] }, 'app', true).map((s) => s.args)).toEqual([
      ['compose', 'pull', 'app'],
      ['compose', 'up', '-d', '--no-deps', '--force-recreate', 'app'],
    ]);
  });
});

describe('formatCommand', () => {
  it('quotes arguments with spaces or quotes', () => {
    expect(formatCommand(containerRestartSteps('plex')[0]!)).toBe('docker restart plex');
    expect(formatCommand({ step: 'up', args: ['compose', 'up', '--label=a b'] })).toBe(
      'docker compose up "--label=a b"',
    );
  });
});
