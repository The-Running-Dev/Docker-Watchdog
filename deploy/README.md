# deploy

OpenTofu root that puts the VPS Watchdog under SubZeroDev.Infra's `modules/app`: a Cloudflare tunnel with `watchdog.subzerodev.com`, and a Portainer Git stack (`vps/docker-compose.yml` + `vps/compose.tunnel.yaml`). The QNAP `docker-compose.yml` is not used. State: R2 bucket `subzerodev-tofu-state`, key `apps/watchdog.tfstate`, encrypted. Run everything through `deploy/tofu.ps1`.

The image follows `:latest` and the watchdog updates itself, so there is no deploy job. Its config is the host file `/srv/watchdog/config.overrides.json`, untouched by any of this.

## Public endpoints

`watchdog.subzerodev.com` is public. Authentication is off unless `ApiKey` is set (in `/srv/watchdog/config.overrides.json`, or as an environment variable): until then anyone can `POST /restart`, `/restart-project` and the `/api` routes. With it set, every route but `/health` and the login needs the `x-api-key` header, so add the header to the Uptime Kuma webhook first. Cloudflare Access with a service token in front is the other option.

## Image and repository cut-over

The stack points at `The-Running-Dev/SubZeroDev.DockerWatchDog` (renamed from Docker-Watchdog), so a `plan` shows the stack's repository URL change. The stack follows `main`: merging the `image:` change in `vps/docker-compose.yml` moves the VPS to `ghcr.io/the-running-dev/subzerodev-watchdog` on the next redeploy. Merge it only after the parity check.

## First adoption

1. Merge the PR that adds these files to `main`.
2. `./deploy/tofu.ps1 plan`. Expect: a tunnel, the `watchdog` record repointed, and a new stack `watchdog`.
3. Apply, check `https://watchdog.subzerodev.com`, then a second `plan` shows no changes.
