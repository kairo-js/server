# Deployment

This repository follows the shared `kairo-js/github-workflows` deployment model.

## Service Values

| Item | Value |
| --- | --- |
| app-name | `kairo` |
| image-prefix | `kairo-js` |
| prod domain | `kairojs.com` |
| dev domain | `dev.kairojs.com` |
| postgres user | `kairo` |
| postgres db | `kairo` |

## GitHub Secrets

| Name | Purpose |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub token |
| `DEPLOY_HOST` | App host |
| `DEPLOY_USER` | App host SSH user |
| `DEPLOY_SSH_KEY` | App host SSH private key |
| `PROXY_HOST` | Caddy host |
| `PROXY_USER` | Caddy host SSH user |
| `PROXY_SSH_KEY` | Caddy host SSH private key |
| `DEV_POSTGRES_PASSWORD` | dev PostgreSQL password |
| `PROD_POSTGRES_PASSWORD` | prod PostgreSQL password |
| `RCLONE_CONFIG` | rclone config for Google Drive |
| `DEV_GDRIVE_DESTINATION` | dev backup root |
| `PROD_GDRIVE_DESTINATION` | prod backup root |
| `BASIC_AUTH_DEV_USER` | dev basic auth user |
| `BASIC_AUTH_DEV_HASH` | dev basic auth password hash |
| `BASIC_AUTH_ADMIN_USER` | prod admin basic auth user |
| `BASIC_AUTH_ADMIN_HASH` | prod admin basic auth password hash |

## GitHub Variables

| Name | Purpose |
| --- | --- |
| `ACME_EMAIL` | Let's Encrypt account email |
| `DEV_BACKEND_UPSTREAM` | optional Caddy upstream override |
| `DEV_FRONTEND_UPSTREAM` | optional Caddy upstream override |
| `PROD_BACKEND_UPSTREAM` | optional Caddy upstream override |
| `PROD_FRONTEND_UPSTREAM` | optional Caddy upstream override |
| `DEV_BACKEND_PORT` | optional app host published backend port |
| `DEV_FRONTEND_PORT` | optional app host published frontend port |
| `PROD_BACKEND_PORT` | optional app host published backend port |
| `PROD_FRONTEND_PORT` | optional app host published frontend port |
