# Adopts the VPS Watchdog into OpenTofu through modules/app of SubZeroDev.Infra: a Cloudflare tunnel and the
# `watchdog` DNS record, and a Portainer Git stack for the compose files under vps/. The image follows :latest and
# the watchdog updates itself, so no GitHub deploy settings are created. Run through deploy/tofu.ps1; see deploy/README.md.
terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "5.28.1" }
    portainer  = { source = "portainer/portainer", version = "2.2.0" }
    github     = { source = "integrations/github", version = "6.13.0" }
    random     = { source = "hashicorp/random", version = "3.9.1" }
    http       = { source = "hashicorp/http", version = "3.6.3" }
  }

  # Bucket, key and endpoint come from backend.hcl (Git-ignored); R2 keys from AWS_ACCESS_KEY_ID and
  # AWS_SECRET_ACCESS_KEY, which tofu.ps1 maps from the R2_* variables.
  backend "s3" {
    region                      = "auto"
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }

  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }
    state {
      method   = method.aes_gcm.main
      enforced = true
    }
    plan {
      method   = method.aes_gcm.main
      enforced = true
    }
  }
}

provider "cloudflare" {} # CLOUDFLARE_API_TOKEN

provider "github" {
  owner = "The-Running-Dev" # GITHUB_TOKEN
}

provider "portainer" {
  endpoint = var.portainer_url
  api_key  = var.portainer_api_key
  custom_headers = {
    "CF-Access-Client-Id"     = var.cf_access_client_id
    "CF-Access-Client-Secret" = var.cf_access_client_secret
  }
}

module "app" {
  source = "git::https://github.com/The-Running-Dev/SubZeroDev.Infra.git//modules/app?ref=v2.1.0"

  name          = "watchdog" # The compose project of the running container; the stack takes it over
  repository    = "The-Running-Dev/SubZeroDev.DockerWatchDog"
  compose_files = ["vps/docker-compose.yml", "vps/compose.tunnel.yaml"]

  routes = { watchdog = "http://watchdog:80" } # watchdog.subzerodev.com (public; set ApiKey to protect /api, see deploy/README.md)

  # No image: the container follows :latest by itself (it is the updater), not through Infra.
  portainer_url = var.portainer_url
  portainer_credentials = {
    api_key              = var.portainer_api_key
    access_client_id     = var.cf_access_client_id
    access_client_secret = var.cf_access_client_secret
  }
  git_credentials = null # the repository is public
}

# watchdog already exists as a proxied CNAME to the apex; it is repointed to the tunnel. The stack is new:
# Portainer has none for watchdog (it ran from /srv/watchdog), and Compose recreates the container in place.
import {
  to = module.app.cloudflare_dns_record.route["watchdog"]
  id = "e958380ca90211dfa0fc68c5c2df277f/61abe35178e111f67b192e40a990d46c"
}

output "public_url" {
  value = "https://watchdog.subzerodev.com"
}
