# deploy

OpenTofu root that puts the VPS Watchdog under SubZeroDev.Infra's `modules/app`: a Cloudflare tunnel with `watchdog.subzerodev.com`, and a Portainer Git stack (`vps/docker-compose.yml` + `vps/compose.tunnel.yaml`). The QNAP `docker-compose.yml` is not used. State: R2 bucket `subzerodev-tofu-state`, key `apps/watchdog.tfstate`, encrypted. Run everything through `deploy/tofu.ps1`.

The image follows `:latest` and the watchdog updates itself, so there is no deploy job. Its config is the host file `/srv/watchdog/config.overrides.json`, untouched by any of this.

## Public endpoints

`watchdog.subzerodev.com` is public and the API has no authentication: anyone can `POST /restart` and `/restart-project`. This keeps the exposure it had behind NPM, by choice (Uptime Kuma calls these endpoints). Putting Cloudflare Access with a service token in front is the fix.

## First adoption

1. Merge the PR that adds these files to `main`.
2. `./deploy/tofu.ps1 plan`. Expect: a tunnel, the `watchdog` record repointed, and a new stack `watchdog`.
3. Apply, check `https://watchdog.subzerodev.com`, then a second `plan` shows no changes.
