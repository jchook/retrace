# Production Deploy (linode)

This document covers the GitHub Actions → server deploy flow via SSH, using the environment named `linode`, and the manual steps to bring up a fresh Debian VPS.

## New VPS Setup (Debian) — One‑time

On your laptop/workstation, create an SSH host alias for convenience (replace IP) in `~/.ssh/config`:

```
Host madi
  HostName <SERVER_IP>
  User app
  Port 22
```

Copy your local SSH public key to root, then create the app user:
  - `ssh-copy-id root@madi`
  - `ssh root@madi`

Run these commands on the server as root:

```sh
adduser app
apt-get update
apt-get install -y docker.io docker-compose-plugin neovim git
usermod -aG docker app
exit
```

Copy your local SSH public key to the `app` user and log in:

```sh
ssh-copy-id app@madi
ssh madi
```

On the server (as `app`):
- Create a default SSH key for GitHub deploys:
  - `ssh-keygen -t ed25519` (press Enter to accept defaults, no passphrase)
  - Copy the printed `~/.ssh/id_ed25519.pub` into GitHub → repo → Settings → Deploy keys (read‑only)
- Clone the repo into `~/madi` and prepare env:

```sh
git clone git@github.com:jchook/madi.git ~/madi
cd ~/madi
cd server
cp .env.defaults .env
vim .env
```

Recommended DEPLOY_PATH
- Use `/home/app/madi` (the path above) for the GitHub Action `DEPLOY_PATH`.

## Convenience Alias (optional)

On the server (as `app`), add a shell alias to target the production compose file by default:

```sh
echo 'alias dc="docker compose -f docker-compose.prod.yml"' >> ~/.profile
. ~/.profile
```

Usage examples: `dc up -d --build`, `dc ps`, `dc logs -f`.


## Deployer SSH Key (GitHub → Server) — One‑time

This key is used by GitHub Actions to SSH into the server as `app`. Generate it on your laptop/workstation and add the public part to the server; store the private part as the `DEPLOY_SSH_KEY` secret in the `linode` environment.

On your laptop/workstation:

```sh
# Generate a dedicated keypair named "deployer" (no passphrase)
ssh-keygen -t ed25519 -f deployer -N ""

# Add the public key to the server's authorized_keys for user `app`
# (uses the Host alias from your ~/.ssh/config)
ssh-copy-id -i deployer madi

# Copy the private key contents to your clipboard and add it to GitHub
# Settings → Environments → linode → Secrets → DEPLOY_SSH_KEY
cat deployer
```

Notes
- Keep the private key `deployer` secret. Do not commit it. Use a throwaway, least‑privilege key dedicated to this deploy.
- Only the private key goes into the GitHub secret. The public key (automatically `deployer.pub`) is what `ssh-copy-id` installs on the server.
- This is separate from the server's own GitHub Deploy key (`~/.ssh/id_ed25519.pub`) used to `git clone`/`pull` from GitHub.


## Workflow

- File: `.github/workflows/deploy-on-tag.yml`
- Triggers: tags matching `v*` and manual `workflow_dispatch`
- Action on server:
  - Assumes repo already exists at `DEPLOY_PATH` (fails with a helpful message if missing)
  - `git fetch --tags origin` then `git checkout -f tags/$TAG_NAME`
  - `docker compose -f ${COMPOSE_FILE:-docker-compose.prod.yml} up -d --build`

## GitHub Environment: linode
Add these under GitHub → Settings → Environments → `linode`.

Secrets
- `DEPLOY_SSH_KEY` — OpenSSH private key used by the workflow to SSH into the server as `app` (use the `deployer` key generated above).

Variables
- `DEPLOY_HOST` — server IP or DNS
- `DEPLOY_USER` — `app`
- `DEPLOY_PATH` — `/home/app/madi`
- `DEPLOY_PORT` — optional, default `22`
- `DOCKER_COMPOSE_FILE` — optional, default `docker-compose.prod.yml`

## First Deploy
1) Ensure the repo is cloned at `DEPLOY_PATH` and `server/.env` exists.
2) Add `DEPLOY_SSH_KEY` secret and environment variables in `linode`.
3) Trigger: `git tag -a v1.0.0 -m "v1.0.0" && git push origin v1.0.0` or run manually.
4) If the environment has protection rules, approve the run in the Actions UI.

## Notes
- The workflow writes the `DEPLOY_SSH_KEY` secret into a temporary key file and uses it for SSH. Your local `~/.ssh/config` alias `madi` is only for your shell convenience.
- The server uses its default `~/.ssh/id_ed25519` for GitHub access after you add it as a Deploy key.
- To change the compose file, set `DOCKER_COMPOSE_FILE` environment variable.
- The trailing `--` after `docker compose ...` is not required; omitted intentionally.
