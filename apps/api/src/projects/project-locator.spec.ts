import { afterAll, describe, expect, it } from 'vitest';
import { tempTree } from '../../test/helpers.js';
import { composeFileArgs, findProject, isValidProjectName } from './project-locator.js';

const tree = tempTree({
  'a/web/README.md': '',
  'b/web/docker-compose.yml': '',
  'c/web/compose.yaml': '',
  'media/docker-compose.prod.yaml': '',
  'media/docker-compose.base.yml': '',
  'node_modules/hidden/compose.yaml': '',
  'deep/er/still/api/compose.yml': '',
});

describe('findProject', () => {
  afterAll(() => tree.dispose());

  it('takes the first matching directory with compose files, in name order', async () => {
    const project = await findProject(tree.root, 'web');

    expect(project?.directory.replaceAll('\\', '/')).toMatch(/\/b\/web$/);
    expect(project?.fileArgs).toEqual([]);
  });

  it('passes every docker-compose*.yml as --file when there is no default file', async () => {
    expect((await findProject(tree.root, 'media'))?.fileArgs).toEqual([
      '--file',
      'docker-compose.base.yml',
      '--file',
      'docker-compose.prod.yaml',
    ]);
  });

  it('searches nested directories but skips node_modules', async () => {
    expect(await findProject(tree.root, 'api')).not.toBeNull();
    expect(await findProject(tree.root, 'hidden')).toBeNull();
  });

  it('returns null for unknown or unsafe names and a missing root', async () => {
    expect(await findProject(tree.root, 'nope')).toBeNull();
    expect(await findProject(tree.root, '..')).toBeNull();
    expect(await findProject(`${tree.root}/missing`, 'web')).toBeNull();
  });
});

describe('isValidProjectName', () => {
  it.each(['web', 'my-app_2', 'v1.2'])('accepts %s', (name) => expect(isValidProjectName(name)).toBe(true));
  it.each(['', '.', '..', '../etc', 'a/b', 'a\\b', '-x', '.hidden', 'a b'])('refuses %j', (name) =>
    expect(isValidProjectName(name)).toBe(false),
  );
});

describe('composeFileArgs', () => {
  it('returns null without compose files', () => {
    expect(composeFileArgs(['README.md', 'docker-compose.yml.bak'])).toBeNull();
  });
});
