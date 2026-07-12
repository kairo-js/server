# Kairo Service Architecture

## 目的

`kairojs.com` は、Kairo向けアドオンを公開・検索・配布するためのサービスです。

将来的には `kairo-cli` から次のような操作を行えるようにします。

- `kairo publish` によるアドオンの公開
- アドオンおよびバージョン情報の取得
- API経由でのアドオンのダウンロード
- APIトークンを使った認証

また、`mc-werewolf.com` 側で開発予定のlauncherから、この配布基盤を利用してアドオンを取得・更新できるようにします。

## 現在の技術構成

- Frontend: Next.js
- Backend: Go
- Database: PostgreSQL
- Runtime: Docker Compose
- Deploy: GitHub Actions reusable workflows
- Proxy: shared Caddy

## MVPの実装順序

1. Googleログインを含むアカウント機能
2. アドオンとバージョンのデータモデル
3. WebまたはAPIからのアドオン投稿
4. 配布ファイルの保存とダウンロードAPI
5. APIトークンの発行・失効
6. `kairo publish` で利用する公開API
7. 検索、共同所有者、公開停止などの運用機能

## データモデル案

初期段階では、次のテーブルを中心に設計します。

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザーの基本情報 |
| `oauth_accounts` | Googleなどの外部ログインとの紐付け |
| `api_tokens` | CLIや外部サービス向けAPIトークン |
| `addons` | アドオン名、説明、公開状態など |
| `addon_versions` | バージョン、manifest、配布ファイル情報など |
| `addon_owners` | アドオンと所有ユーザーの紐付け |
| `download_events` | ダウンロード数の集計や監査に使うイベント |

実際のカラム、制約、削除方針は実装時に決定します。

## ファイル保存方針案

アドオンの配布ファイルはPostgreSQLへ直接保存せず、S3互換のオブジェクトストレージへ保存します。

- 開発環境: MinIOを候補とする
- 本番環境: Cloudflare R2またはAmazon S3などを候補とする
- PostgreSQL: オブジェクトキー、ファイルサイズ、SHA-256、公開日時などを保持する

保存先に依存しないインターフェースをBackend側に設け、環境ごとに実装を切り替えられる構成を目指します。

## API案

APIはバージョンをURLに含め、将来の変更に備えます。

```text
GET    /api/v1/addons/{name}
GET    /api/v1/addons/{name}/versions
GET    /api/v1/addons/{name}/{version}/download
POST   /api/v1/addons
POST   /api/v1/addons/{name}/versions
POST   /api/v1/tokens
```

認証方式、リクエスト・レスポンス形式、公開範囲はAPI仕様の作成時に確定します。

## 認証方針案

- WebではGoogleログインを提供する
- CLIではユーザーが発行したAPIトークンを利用する
- APIトークンは平文保存せず、ハッシュ化して保持する
- トークンには失効、最終利用日時、権限スコープを持たせることを検討する

### Webセッション（実装済み）

- Google OAuth 2.0/OpenID ConnectのUserInfoを使ってユーザーを作成・更新する
- Googleで検証済みのメールアドレスのみ受け付ける
- ランダムなセッショントークンをHttpOnly Cookieへ保存する
- PostgreSQLにはセッショントークンのSHA-256ハッシュのみ保存する
- セッションの有効期間は30日とする
- 本番Cookieには `Secure`、すべての環境で `SameSite=Lax` を設定する

現在の認証APIは次のとおりです。

```text
GET  /api/v1/auth/google
GET  /api/v1/auth/google/callback
GET  /api/v1/me
POST /api/v1/logout
```

## Launcher連携

`mc-werewolf.com` のlauncherはKairo APIからアドオンのバージョン情報を取得し、配布ファイルをダウンロードします。

安全な更新のため、少なくとも次の情報を提供します。

- アドオン名とバージョン
- ダウンロードURL
- ファイルサイズ
- SHA-256ハッシュ
- 対応するKairoまたはゲームのバージョン
- 公開停止・非推奨などの状態

## Manifest

CLI、Web、launcherで共通利用するmanifest形式を早い段階で定義します。候補となる項目は次のとおりです。

- アドオン名
- バージョン
- 表示名と説明
- 作者・所有者
- ライセンス
- Kairoまたはゲームの対応バージョン
- 依存アドオンとバージョン条件
- エントリーポイント

詳細なスキーマと依存関係の解決規則は別途仕様化します。

## 未決定事項

- アドオン名の命名規則と予約名
- バージョニング規則
- manifestの正式なスキーマ
- ファイル形式と容量上限
- 公開、非公開、削除、yankの扱い
- オブジェクトストレージの正式な選定
- ダウンロード統計の保存期間とプライバシー方針
- マルウェア検査や署名検証の方式
