import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

/** File names `docker compose` loads on its own when run in a project directory. */
export const DEFAULT_COMPOSE_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];

/** Directories that never hold projects and can be large. */
const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);

const PROJECT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface LocatedProject {
  name: string;
  directory: string;
  /** --file arguments for compose; empty when a default compose file is present. */
  fileArgs: string[];
}

/** Project names are directory names; anything that could leave the projects directory is refused. */
export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME.test(name) && name !== '.' && name !== '..';
}

/**
 * Finds a project the way the Flask API did: the first directory under root (depth first,
 * in name order) named after the project that holds compose files. A default compose file
 * means no --file arguments, so compose also picks up its override file; otherwise every
 * docker-compose*.yml/.yaml file is passed in name order. Symlinked directories are not followed.
 */
export async function findProject(root: string, name: string): Promise<LocatedProject | null> {
  if (!isValidProjectName(name)) return null;

  return search(resolve(root));

  async function search(directory: string): Promise<LocatedProject | null> {
    let entries: Dirent[];

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return null;
    }

    if (basename(directory) === name) {
      const fileArgs = composeFileArgs(entries.filter((e) => e.isFile() || e.isSymbolicLink()).map((e) => e.name));

      if (fileArgs) return { name, directory, fileArgs };
    }

    const subdirectories = entries
      .filter((entry) => entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name))
      .map((entry) => entry.name)
      .sort();

    for (const subdirectory of subdirectories) {
      const found = await search(join(directory, subdirectory));

      if (found) return found;
    }

    return null;
  }
}

/** null when the directory has no compose files. */
export function composeFileArgs(files: string[]): string[] | null {
  if (files.some((file) => DEFAULT_COMPOSE_FILES.includes(file))) return [];

  const named = files.filter((file) => file.startsWith('docker-compose') && /\.ya?ml$/.test(file)).sort();

  return named.length ? named.flatMap((file) => ['--file', file]) : null;
}
