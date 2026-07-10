# Kairo Server

Kairo service shell using the same deployment shape as werewolf-server.

## Stack

- Frontend: Next.js
- Backend: Go
- Database: PostgreSQL
- Runtime: Docker Compose
- Deploy: GitHub Actions reusable workflows
- Proxy: shared Caddy

## Deploy

- Push to `main`: deploys dev to `dev.kairojs.com`
- Push tag `v*.*.*`: backs up prod DB and deploys prod to `kairojs.com`
- Daily backup: prod DB dump to Google Drive around 04:00 JST

## Required Settings

Use the same secret and variable names as werewolf-server, but with Kairo-specific values for DB passwords and Google Drive destinations.
