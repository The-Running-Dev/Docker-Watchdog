# legacy

Read-only copies of the projects folded into SubZeroDev.DockerWatchDog, kept so the old folders, repositories and package can be deleted. Nothing here is built or run; workflows under `legacy/**/.github` do not run.

| Folder                           | Source                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container-manager/`             | The `Container-Manager` working copy (repository `Docker-Webhooks`, `main` at `69397d0` plus its uncommitted changes), including `common/`.                                         |
| `container-manager/common/`      | Also the `Container-Manager-Common` working copy, which is identical apart from its deleted `dist/`.                                                                                |
| `docker-webhooks/`               | The older `Docker-Webhooks` working copy of the same repository: `Docker-Webhooks-UI/` (Create React App UI), `project-name/` (an earlier NestJS API), `ui.old/` and its own edits. |
| `docker-webhooks/api.7z-backup/` | The contents of `api.7z` from that folder (an API backup from April 2025).                                                                                                          |

The full git history of the two repositories is on the branches `legacy/docker-webhooks` (with the tag `legacy/docker-webhooks/latest`) and `legacy/container-manager-common`.

Left out: `node_modules`, build output (`dist`, `.next`, `api/deploy`), logs, `*.bak`, and every file holding credentials (`.env`, `.secrets`, `set-env-temp.ps1`, `build-local.ps1`, `api/src/config/environment.ts`, `autounattend.xml.xml`).
