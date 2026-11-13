# Consolidation plan: SubZeroDev.DockerWatchDog

Goal: one repo and one image, giving one place to see containers and restart them, by hand, by webhook or automatically.
It combines Docker-Watchdog, Docker-Webhooks, Container-Manager and Container-Manager-Common.

## Decisions (agreed 2026-11-13)

| # | Decision |
|---|---|
| D1 | **Backend:** Node.js with **NestJS**, reusing Container-Manager's API structure and fixing its defects. **UI:** **React + Vite**, ported from the Container-Manager Next.js pages. |
| D1a | **Engine:** port all of Watchdog's PowerShell engine to TypeScript. The image drops PowerShell and Python. |
| D1b | **UI library:** MUI (now v9; Container-Manager used v7), zustand and react-hook-form/zod from Container-Manager. |
| D2 | **UI pages:** Projects, Logs, Settings, Webhook tester, plus Login (needed by D3). |
| D3 | **Auth:** an API key header for machine endpoints (`/restart*`, `/api/webhook`, `/api/*`) and a single admin login for the UI. Both are off by default so current deployments keep working. |
| D4 | **Delete volumes** is opt-in only: an explicit `deleteVolumes: true` flag plus a confirmation dialog in the UI. A plain hard reset never deletes volumes. |
| D5 | **Generic webhook stays:** `POST /api/webhook` with `update-project` / `update-container` events, behind the API key. Nothing calls it today. |
| D6 | **Old repos:** delete `Docker-Webhooks` and `Container-Manager-Common` from GitHub once their code is safely in the new repo. This can't be undone, so it is the last step and is confirmed separately. |
| D7 | **Image name:** `ghcr.io/the-running-dev/subzerodev-watchdog`, with no alias. Only you use it (see §7). |

## 1. What exists today

| Project | State | Fate |
|---|---|---|
| **Docker-Watchdog** | Working and deployed. PowerShell engine (`watchdog.psm1`, 881 lines). Flask API (254 lines): `/health`, `/restart` (Uptime Kuma), `/restart-project`. CI, GitVersion, OpenTofu deploy. PR #3 has the latest fixes. | It becomes the repo. Its engine logic and API contracts are ported to TypeScript. |
| **Container-Manager** (Dropbox, git origin = Docker-Webhooks) | Newest copy (Apr 2025). NestJS API (1,749 lines), Next.js 15 + MUI UI (2,928 lines), `common/`. **Uncommitted: the only copy is in Dropbox.** | The NestJS modules are the base of `apps/api`. The pages are ported into `apps/ui`. |
| **Docker-Webhooks** (Dropbox, same repo) | Older duplicate working copy plus leftovers (`project-name/`, CRA UI, `ui.old/`, `api.7z`). | Nothing to keep. Repo deleted (D6). |
| **Container-Manager-Common** | 9 TypeScript interfaces and enums, identical to `Container-Manager/common`. | Becomes `packages/shared`. Repo deleted (D6). |

## 2. Target layout (pnpm workspace)

```
SubZeroDev.DockerWatchDog/
├─ apps/
│  ├─ api/                         NestJS 12 (ESM)
│  │  └─ src/
│  │     ├─ config/                config.json + config.overrides.json + env, validated with zod
│  │     ├─ auth/                  API-key guard + JWT login, registered as APP_GUARD, opt-in via config
│  │     ├─ docker/                dockerode wrapper + `docker compose` runner (execFile, array args, no shell)
│  │     ├─ projects/              discovery under ProjectsDirectory, restart/update, include/exclude
│  │     ├─ updater/               scheduled update sweep (@nestjs/schedule), replaces cron + lock file
│  │     ├─ monitor/               docker events health monitor + dependency restarts
│  │     ├─ notifications/         Discord (embeds, timestamps, per-source toggles)
│  │     ├─ webhook/               /api/webhook, /restart (Uptime Kuma), /restart-project
│  │     ├─ gateway/               socket.io: log + container events, JWT/API key on handshake
│  │     └─ logger/                winston → console + file + 1000-line ring buffer
│  └─ ui/                          React 19 + Vite + MUI 9 + react-router + zustand
├─ packages/
│  └─ shared/                      API types/enums (ex Container-Manager-Common) + zod schemas
├─ deploy/  vps/                   unchanged (image name updated)
├─ config.overrides.json           same format as today
├─ Dockerfile
├─ docker-compose.yml
└─ .github/workflows/ci.yml
```

- There is one process on one port. Nest serves the built UI with `@nestjs/serve-static` at `/` and the API at `/api/*`.
- `/health`, `/restart` and `/restart-project` stay at the root with today's payloads.
- `packages/shared` holds the request and response types and the zod schemas, so the API and UI validate against the same definitions.

## 3. Porting the engine (watchdog.psm1 → apps/api)

| PowerShell | TypeScript home | Notes |
|---|---|---|
| `Get-Config`, `Read-ConfigFile`, `Set-APIConfig` | `config/ConfigService` | Same keys and the same `config.overrides.json` file. Cron validation via `cron-parser`. |
| `Add-UpdaterCronJob`, `Install-Updater` | `updater/UpdaterService` (`@nestjs/schedule`, `CronSchedule`) | No system cron. |
| `Get-Lock`, `Remove-Lock`, monitor pause while locked | in-process mutex shared by updater and monitor | The monitor waits for, or skips, events while a sweep runs, as today. |
| `Start-Update`, `Get-ProjectsWithUpdatedImages`, `Confirm-ImageUpdated`, `Invoke-DockerPull`, `Confirm-IncludeProject` | `updater` + `projects` | Compare image digests before and after the pull via dockerode. `UpdaterTest` = dry run. |
| `docker system prune --all --force` after a sweep | `updater` | Keep the behaviour behind a new `PruneAfterUpdate` key (default `true`, as today). It removes **all** unused images, not just dangling ones. |
| `Restart-Project`, `Invoke-DockerCompose*` | `projects/ProjectService` | `docker compose pull` then `up -d` + `DockerComposeAdditionalArgs`, run from the project dir. |
| `Confirm-PreflightCheck` | startup check | Docker socket reachable, `ProjectsDirectory` exists, compose plugin present. |
| `Start-Watchdog`, `Restart-Unhealthy`, `Restart-Container`, `Wait-ForHealthy`, `Test-ServiceHealth`, `Test-ContainerExists` | `monitor/HealthMonitorService` | `docker.getEvents({filters:{event:['health_status']}})` stream with reconnect. Dependency restarts from `ContainerDependencies`. |
| `Send-DiscordNotification*`, `Get-DiscordTimestamp` | `notifications/DiscordService` | Respects `SendUpdaterNotifications`, `SendMonitorNotifications`, `SendAPINotifications`. |
| `Write-Log`, `Write-Info`, `Write-Warning`, `Write-Error`, `Get-TimeStamp` | `logger/` | Also streamed to the UI. |
| `entrypoint.ps1` (TZ setup, start API) | `node dist/main.js` | `TZ` is handled by the base image's tzdata. |

**Parity check before switching hosts:** run the old and new images side by side on a test host with `UpdaterTest: true`. Compare which projects each would update and which containers each would restart. Then compare one real unhealthy-container restart and one real `/restart-project`. This repeats the live checks used for PR #3.

## 4. API

| Route | Auth | Source | Behaviour |
|---|---|---|---|
| `GET /health` | none | WD | `{status:"healthy"}` (Docker healthcheck) |
| `POST /restart` | API key (optional) | WD | Unchanged Uptime Kuma payload. Container from `monitor.description` (`container-<name>`) or `monitor.name`. Only acts on `heartbeat.status == 0`. |
| `POST /restart-project` | API key (optional) | WD | Unchanged `{event:"update-project", data:{projectId, additionalArgs, isTest}}` |
| `POST /api/webhook` | API key | CM | `{event:"update-project"\|"update-container", data:{projectOrContainerId, hardReset, deleteVolumes?, isTest}}` |
| `POST /api/auth/login` | none | CM | Admin user and password from env. Returns a JWT **with an expiry**. |
| `GET /api/info` | UI/API | CM | Version (GitVersion), build date, Docker version, config summary |
| `GET /api/projects` | UI/API | CM | Live list grouped by `com.docker.compose.project`, with status and health. No stale cache: refreshed from the event stream. |
| `POST /api/projects/:name/restart` | UI/API | CM + WD | Options: `pull`, `hardReset` (down → up `--force-recreate --remove-orphans`), `deleteVolumes` (D4, explicit only), `dryRun` |
| `POST /api/containers/:name/restart` | UI/API | CM | Compose container: `docker compose up -d --no-deps --force-recreate <service>`. Standalone container: `docker restart`. No manual remove-and-recreate. |
| `GET /api/logs?page&limit` | UI/API | CM | From the ring buffer |
| `GET /api/config` | UI/API | new | Effective config with secrets masked (Settings page) |
| socket.io `/` | JWT or API key | CM | `log-event`, `containers-event`, `restart-event` |

Every restart, whether manual, webhook, Uptime Kuma or automatic, goes through `ProjectService` / `ContainerService`, which log it, emit it to the UI and send the Discord notification.

## 5. Phases

**Phase 0: Rescue the uncommitted code (do first)**
- Copy `Container-Manager/{api,ui,common}` into this repo on a branch `import/container-manager`, committed as-is, as a reference snapshot. It goes into this repo rather than Docker-Webhooks, because that repo will be deleted.
- Exclude `.env`, `.secrets`, `api/src/config/environment.ts` (plaintext credentials), `*.bak`, `set-env-temp.ps1`, `autounattend.xml.xml` and `node_modules`.
- Run a secret scan (`gitleaks`) on the branch before pushing. The repo is public.

**Phase 1: Repo rename**
- Merge PR #3.
- Run `gh repo rename SubZeroDev.DockerWatchDog`. GitHub redirects the old URL.
- Change the image name to `ghcr.io/the-running-dev/subzerodev-watchdog` in CI, `build.ps1` and the image labels.
- Rename the local folder last, from outside this session.

**Phase 2: Workspace skeleton**
- Set up pnpm workspace, `packages/shared` (from `common/`), and empty `apps/api` (Nest) and `apps/ui` (Vite).
- Shared tsconfig, ESLint and Prettier.
- Vitest everywhere. NestJS 12 ships as ESM only, which Jest cannot load, so the API is an ESM package tested with Vitest (what Nest 12's own ESM template uses). TypeScript is pinned to 6.0 because typescript-eslint and ts-jest do not support TypeScript 7 yet.

**Phase 3: API core**
- Config, logger, auth (applied globally, opt-in), Docker wrapper, the projects and containers services, and all routes in §4.
- Tests: payload validation, project discovery, compose argument building (no shell), the auth guard, and a dry run.

**Phase 4: Engine port**
- Updater, monitor and notifications per §3.
- Unit tests with a mocked dockerode, plus an integration test against a real Docker daemon in CI (`docker:dind` service) with a two-container compose fixture that has a healthcheck.

**Phase 5: UI**
- Port the pages into Vite + react-router: Login, Projects (from `containers/page.tsx`), Logs, Settings (new) and Webhook tester (from `webhook/page.tsx`). Keep the MUI theme, zustand store and toast system.
- Delete the duplicates in `src/components/*`, the `/update` page and the dashboard links to pages that don't exist.

**Phase 6: Image, CI and cut-over**
- Dockerfile:
  1. `node:22-bookworm-slim` build stage: `pnpm build` for api and ui.
  2. Runtime stage: `node:22-bookworm-slim` + `docker-ce-cli` + `docker-compose-plugin` + `tzdata` + `curl`, running as non-root with the docker socket group where possible.
  3. Healthcheck on `/health`.
- CI: lint, test and build on pull requests; push to GHCR on main with GitVersion tags.
- Update `docker-compose.yml`, `vps/`, `deploy/` and the README.
- Run the parity check from §3.
- Switch each host by changing `image:` in its compose file to the new name, then `docker compose pull && docker compose up -d`.
- Uptime Kuma webhooks keep working: same port and paths.

**Phase 7: Clean-up (D6)**
- Revoke the GitHub token stored in `Container-Manager/.secrets`.
- Delete the GitHub repos `Docker-Webhooks` and `Container-Manager-Common`. **Irreversible.** It needs Phase 0 merged and your explicit go-ahead at that time.
- Delete the GHCR package `docker-webhooks`.
- Delete the three Dropbox folders.

## 6. Container-Manager defects to fix while porting

**API**
- `AuthGuard` is never applied, so all endpoints and the socket.io gateway are open. Fix: `APP_GUARD` plus a handshake check.
- `set-environment.ts` writes the admin password, API key and JWT secret as literals into source, and JWTs never expire. Fix: read env at runtime via `ConfigService`, and set a `JWT_EXPIRES_IN`.
- `DockerController.update()` has no `@Post`. The route is dropped; it's replaced by `/api/projects/:name/restart`.
- The container cache only updates on `create`/`kill`, so it goes stale and a restart drops the container. Fix: refresh on all container events, or query live.
- `updateImage()` calls `getContainer('localhost').update(...)`. Removed.
- `ShellExecuteService` passes request values to a shell via `pwsh -Command` string concatenation with `spawn(shell:true)`. Fix: `execFile` with array arguments; PowerShell scripts removed.
- `compose-restart.ps1` always runs `down -v` on hard reset (volume loss), using a host-path compose file from a label. Fix: D4, plus project dirs resolved under `ProjectsDirectory`.
- `update-container` stops and removes before recreating, with no rollback. Fix: compose `up --no-deps --force-recreate`.
- The `mongo` service is unused. Dropped.

**UI**
- `post('http://localhost:4000/webhook')` double-prefixes `API_URL`. Fix: same-origin `/api`.
- Dashboard links are missing `/protected`, and `/images` doesn't exist. Routing is redone in react-router.
- `createSocketClient` reads `localStorage.token`, but the store persists to `session-storage`. Fix: read the token from the store.
- There are two parallel page sets (`src/components/*` and `src/app/protected/*`). Only one is kept.

## 7. Image name (D7)

- `ghcr.io/the-running-dev/subzerodev-watchdog`. It's lowercase as GHCR requires, and it matches your other `subzerodev-*` packages.
- Only you run it, so there is no alias or transition period. At cut-over, change `image:` in `docker-compose.example`, `vps/docker-compose.yml`, the README (two places) and your host compose files.
- Delete the old `watchdog` GHCR package along with `docker-webhooks` in Phase 7.
