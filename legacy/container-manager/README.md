# Container-Manager snapshot (reference only)

This is a copy of the last working state of Container-Manager (April 2025), rescued from a local working copy where it was never committed. The original repos were `The-Running-Dev/Docker-Webhooks` and `The-Running-Dev/Container-Manager-Common`.

- `api/` is a NestJS 11 API (dockerode, socket.io, winston, JWT/API-key auth).
- `ui/` is a Next.js 15 + MUI 7 UI (zustand, socket.io-client).
- `common/` holds the shared models (formerly `@subzerodev/container-manager-common`).

It is **not built or run** by this repo. It is source material for the NestJS + React/Vite port described in `docs/consolidation-plan.md`, and gets deleted once the port is done.

Left out on purpose:
- `.env`, `.secrets`, and `api/src/config/environment.ts`, which is generated from `.env` by `api/scripts/set-environment.ts` and holds credentials. The API does not compile without it.
- `node_modules`, `.next`, `dist`, `api/deploy`, logs and `*.bak` files.
