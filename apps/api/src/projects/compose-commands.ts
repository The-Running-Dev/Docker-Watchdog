import type { LocatedProject } from './project-locator.js';

export type StepName = 'down' | 'pull' | 'up' | 'restart';

/** One docker invocation. Always run with an argument array, never through a shell. */
export interface CommandStep {
  step: StepName;
  args: string[];
  cwd?: string;
}

export interface ProjectRestartPlan {
  pull: boolean;
  hardReset: boolean;
  deleteVolumes: boolean;
  /** Options for `docker compose up`. */
  upArgs: string[];
}

/** What a hard reset adds to `up`: every container is recreated and leftovers removed. */
export const HARD_RESET_UP_ARGS = ['--force-recreate', '--remove-orphans'];

/**
 * pull (optional) -> down (hard reset only) -> up -d. Pulling first means a failed pull
 * leaves the running project alone. Volumes are removed only when asked for explicitly.
 */
export function projectRestartSteps(project: LocatedProject, plan: ProjectRestartPlan): CommandStep[] {
  if (plan.deleteVolumes && !plan.hardReset) {
    throw new Error('deleteVolumes needs hardReset');
  }

  const base = ['compose', ...project.fileArgs];
  const cwd = project.directory;
  const steps: CommandStep[] = [];

  if (plan.pull) steps.push({ step: 'pull', args: [...base, 'pull'], cwd });

  if (plan.hardReset) {
    steps.push({
      step: 'down',
      args: [...base, 'down', '--remove-orphans', ...(plan.deleteVolumes ? ['--volumes'] : [])],
      cwd,
    });
  }

  const upArgs = unique([...(plan.hardReset ? HARD_RESET_UP_ARGS : []), ...plan.upArgs]);

  steps.push({ step: 'up', args: [...base, 'up', '-d', ...upArgs], cwd });

  return steps;
}

/** Recreates one compose service without touching the services it depends on. */
export function serviceRecreateSteps(project: LocatedProject, service: string, pull: boolean): CommandStep[] {
  const base = ['compose', ...project.fileArgs];
  const cwd = project.directory;

  return [
    ...(pull ? [{ step: 'pull' as const, args: [...base, 'pull', service], cwd }] : []),
    { step: 'up', args: [...base, 'up', '-d', '--no-deps', '--force-recreate', service], cwd },
  ];
}

export function containerRestartSteps(name: string): CommandStep[] {
  return [{ step: 'restart', args: ['restart', name] }];
}

/** For logs and dry runs; quotes arguments that hold spaces. */
export function formatCommand(step: CommandStep): string {
  return ['docker', ...step.args].map((arg) => (/[\s"']/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
