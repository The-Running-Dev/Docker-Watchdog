import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { tempTree } from '../../test/helpers.js';
import { loadConfig } from './config.loader.js';
import { ConfigService, MASK } from './config.service.js';

const tree = tempTree({
  'config.json': JSON.stringify({ ProjectsDirectory: '/base', CronSchedule: '0 1 * * *', UpdaterTest: 'yes' }),
  'config.overrides.json': JSON.stringify({ CronSchedule: '0 2 * * *' }),
  'bad.json': '[1, 2]',
});

const configFile = join(tree.root, 'config.json');

describe('loadConfig', () => {
  afterAll(() => tree.dispose());

  it('uses the defaults when there are no files', () => {
    const config = loadConfig({ configFile: join(tree.root, 'missing.json'), env: {} });

    expect(config).toMatchObject({
      ProjectsDirectory: '/projects',
      DockerComposeAdditionalArgs: ['--always-recreate-deps', '--remove-orphans'],
      ApiKey: '',
      JwtExpiresIn: '12h',
    });
  });

  it('layers config.json, then config.overrides.json, then env vars', () => {
    expect(loadConfig({ configFile, env: {} })).toMatchObject({
      ProjectsDirectory: '/base',
      CronSchedule: '0 2 * * *',
      UpdaterTest: true,
    });
    expect(loadConfig({ configFile, env: { CronSchedule: '0 3 * * *', TZ: 'Europe/Sofia' } })).toMatchObject({
      CronSchedule: '0 3 * * *',
      TimeZone: 'Europe/Sofia',
    });
  });

  it('reads legacy string forms from env vars', () => {
    const config = loadConfig({
      configFile,
      env: {
        SendMonitorNotifications: 'off',
        IncludeProjects: 'a, b,,c',
        ExcludeProjects: '["x"]',
        ContainerDependencies: '{"app":"db"}',
        DiscordWebhookUrl: 'https://example.com/hook',
      },
    });

    expect(config).toMatchObject({
      SendMonitorNotifications: false,
      IncludeProjects: ['a', 'b', 'c'],
      ExcludeProjects: ['x'],
      ContainerDependencies: { app: 'db' },
      DiscordWebhookUrl: '',
    });
  });

  it('fails clearly on bad input', () => {
    expect(() => loadConfig({ configFile, env: { ContainerDependencies: '{nope' } })).toThrow(/^Invalid configuration/);
    expect(() => loadConfig({ configFile, env: { JwtExpiresIn: 'forever' } })).toThrow(/JwtExpiresIn/);
    expect(() => loadConfig({ configFile: join(tree.root, 'bad.json'), env: {} })).toThrow(/expected a JSON object/);
  });
});

describe('ConfigService', () => {
  it('turns auth on only when a key or both login fields are set, and masks secrets', () => {
    const base = loadConfig({ configFile, env: {} });

    expect(new ConfigService(base).authEnabled).toBe(false);
    expect(new ConfigService({ ...base, AdminUser: 'admin' }).authEnabled).toBe(false);
    expect(new ConfigService({ ...base, AdminUser: 'admin', AdminPassword: 'x' }).loginEnabled).toBe(true);

    const service = new ConfigService({ ...base, ApiKey: 'secret' });

    expect(service.authEnabled).toBe(true);
    expect(service.masked()).toMatchObject({ ApiKey: MASK, JwtSecret: '' });
  });
});
