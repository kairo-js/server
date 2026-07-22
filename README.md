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

## Local GitHub Login

GitHub OAuth Appを作成し、Authorization callback URLに次を登録します。

```text
http://localhost:3000/api/v1/auth/github/callback
```

起動時に次の環境変数を設定します。

```text
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

GitHub OAuthが未設定の場合もサービスは起動しますが、GitHubログインAPIは `503 Service Unavailable` を返します。

## Local Add-on Storage

配布ZIPは初期状態では`./data/addons`へ保存されます。保存先は次の環境変数で変更できます。

```text
STORAGE_PATH=/path/to/persistent/addon-storage
```

Cloudflare R2を使用する場合は、R2バケットとObject Read & Write権限のAPIトークンを作成し、次を設定します。`R2_ENDPOINT`はバケットを含まないアカウント単位のS3 API URLです。

```text
STORAGE_DRIVER=r2
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET=kairo-addons
```

## Required Settings

Use the same secret and variable names as werewolf-server, but with Kairo-specific values for DB passwords and Google Drive destinations.
