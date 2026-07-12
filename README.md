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

## Specifications

- [Service architecture](specs/architecture.md)
- [Deployment](specs/deployment.md)

## Local Google Login

Google Cloud ConsoleでOAuth 2.0クライアントを作成し、承認済みのリダイレクトURIに次を登録します。

```text
http://localhost:3000/api/v1/auth/google/callback
```

起動時に次の環境変数を設定します。

```text
PUBLIC_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

Google OAuthが未設定の場合もサービスは起動しますが、ログインAPIは `503 Service Unavailable` を返します。

## Required Settings

Use the same secret and variable names as werewolf-server, but with Kairo-specific values for DB passwords and Google Drive destinations.
