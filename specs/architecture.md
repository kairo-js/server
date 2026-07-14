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

## 多言語対応

Web UIはURLの先頭にロケールを含めます。初期対応言語は日本語と英語です。

```text
/ja
/en
/ja/account
/en/account
/ja/develop
/en/develop
```

- 翻訳文はFrontendのロケール辞書へ集約する
- 対応ロケール一覧と既定言語を一か所で管理する
- 言語追加時はロケール一覧と対応辞書を追加する
- ルートURLでは言語Cookieを優先し、未設定時はブラウザの `Accept-Language` から日本語または英語を選ぶ
- 言語選択はCookieへ保存し、OAuthログイン後も同じ言語へ戻れるようにする
- ユーザーが入力するアドオン名や説明の多言語化は、Web UIの翻訳とは別にデータモデル設計時に決定する

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
GET    /api/v1/addon-ids/{id}/availability
```

認証方式、リクエスト・レスポンス形式、公開範囲はAPI仕様の作成時に確定します。

### アドオンIDの一意性

Project BuilderはログインなしでID利用可否APIを呼び出し、Kairoレジストリに登録済み・予約済みのIDと重複していないか確認します。

- 入力停止から400ms後に問い合わせる
- 比較時は小文字化し、`Example`と`example`を同一IDとして扱う
- `kairo`と`kairo-database`は公式用の予約IDとして初期登録する
- 登録済み・予約済みの場合はプロジェクト生成を停止する
- APIへ接続できない場合は警告を表示し、重複未確認のまま生成を許可する
- 表示は「Kairoレジストリ上で利用可能」とし、未投稿アドオンを含む世界全体での一意性は保証しない
- 投稿時にはDBの`normalized_id`一意制約で競合を最終的に拒否する
- ワールド内での実際のID重複はKairo起動時にも事後検出する

## 認証方針案

- WebではGoogleログインとGitHubログインを提供する
- CLIではユーザーが発行したAPIトークンを利用する
- APIトークンは平文保存せず、ハッシュ化して保持する
- トークンには失効、最終利用日時、権限スコープを持たせることを検討する

### Webセッション（実装済み）

- Google OAuth 2.0/OpenID ConnectのUserInfoを使ってユーザーを作成・更新する
- Googleで検証済みのメールアドレスのみ受け付ける
- GitHub OAuthのUser APIとEmail APIを使ってユーザーを作成・更新する
- GitHubで検証済みのprimaryメールアドレスのみ受け付ける
- 異なるOAuthプロバイダーで検証済みメールアドレスが一致した場合は、同じKairoユーザーへ紐付ける
- ランダムなセッショントークンをHttpOnly Cookieへ保存する
- PostgreSQLにはセッショントークンのSHA-256ハッシュのみ保存する
- セッションの有効期間は30日とする
- 本番Cookieには `Secure`、すべての環境で `SameSite=Lax` を設定する

現在の認証APIは次のとおりです。

```text
GET  /api/v1/auth/google
GET  /api/v1/auth/google/callback
GET  /api/v1/auth/github
GET  /api/v1/auth/github/callback
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

## Web開発・公開支援（構想）

Kairoアドオンの開発はnpmやビルドツールの利用を前提としており、Minecraftアドオン開発者に一定以上の開発経験を要求します。そのため、`kairojs.com` を配布サイトだけでなく、アドオンの作成・検証・公開を支援する入口として提供することを検討します。

### Properties作成フォーム

Web上のフォームで必要な項目を入力し、`scripts/properties.js` に相当するメタデータを作成できるようにします。

対象となる主な項目は次のとおりです。

- アドオンID
- 作者
- 表示名
- 説明
- バージョンとプレリリース識別子
- 最低Minecraftエンジンバージョン
- Minecraft Script API依存関係
- Kairoアドオンの必須・任意依存関係
- タグ

入力中にIDの命名規則、SemVer、依存バージョン条件などを検証し、問題のある項目をその場で表示します。生成物のダウンロード、プロジェクトへの挿入、公開ウィザードへの引き継ぎ方法は実装時に決定します。

初期版はログイン不要の `/develop` で提供し、入力と生成処理はブラウザ内で完結させます。

- アドオンIDは `A-Z`、`a-z`、`0-9`、`-` のみ許可する
- descriptionは入力任意とし、未入力時は空文字列としてpropertiesとmanifestへ出力する
- Minecraft Script APIモジュールは定義済みの候補から複数選択する
- 選択したMinecraftモジュールには既知バージョン候補を表示し、候補にない最新版などは手入力できるようにする
- `kairo` と `kairo-database` は編集できない必須依存関係として自動的に追加する
- Kairo系の追加依存関係はIDとバージョン条件の行を任意個追加できるようにする
- `official` と `approved` はユーザーが選択できず、サービス側で後から付与する
- Minecraft依存バージョンに `beta` が含まれる場合は `experimental`、含まれない場合は `stable` を自動付与する
- システム管理タグとは別に、カスタムタグを追加できるようにする
- 生成した `properties.js` はプレビュー、コピー、ローカル保存できるようにする

最低Minecraftエンジンバージョンは、統合版で通常のダウングレードができないことと2026年以降のバージョン規則を考慮して制限します。

- バージョンは `major.minor.patch` であり、majorは `1` に固定する
- 2026年中はminor `26` のみ選択可能にする
- 2027年以降はminorとして実行時の西暦下2桁と、その前年だけを選択可能にする
- patchは0以上の整数を手入力する
- 候補はブラウザの現在日付から計算し、年が変わった際に再デプロイを必要としない

Minecraft Script APIモジュールは、安定版を選択できるものとpre-release版しかないものにグループ化します。利用者の技術力や主観的な用途による分類は行いません。

- 安定版: `@minecraft/server`、`@minecraft/server-ui`
- Experimental: `@minecraft/server-admin`、`@minecraft/server-gametest`、`@minecraft/server-net`、`@minecraft/server-editor`、`@minecraft/debug-utilities`、`@minecraft/diagnostics`、`@minecraft/server-graphics`
- Experimentalは初期状態で折りたたみ、必要な場合だけ展開する
- `@minecraft/server-editor-private-bindings` はmanifestへ記載するものではないため候補に含めない

既知バージョン候補は次のとおりです。

- `@minecraft/server`: `3.0.0-alpha`、`2.9.0-beta`、`2.8.0`から`2.0.0`までの各minor、`beta`。Minecraftは1.xも許可するがKairoは2.0.0以上のみ対応
- `@minecraft/server-ui`: `3.0.0-alpha`、`2.2.0-beta`、`2.1.0`、`2.0.0`、`beta`。Kairoは2.0.0以上のみ対応
- その他の掲載モジュール: 現在は`1.0.0-beta`

候補外の新しいバージョンへ即時対応できるよう、候補選択だけでなく自由入力も許可します。
選択中のMinecraft依存バージョンに`alpha`または`beta`が含まれる場合、propertiesのシステムタグは`experimental`とします。

現在の `SupportedTagType` はシステムタグだけを列挙しているため、カスタムタグを正式対応する際は、システム管理タグとユーザー定義タグを区別できる型へ変更します。

### プロジェクト作成ウィザード（初期版）

開発サポートの入口は2段階のウィザードとします。

1ページ目では次を選択します。

- 開発言語: JavaScriptまたはTypeScript
- 実行・ビルド環境: 初期版はNode.jsのみ正式対応
- GitHubを利用するか
- パッケージマネージャー: npm、pnpm、または使用しない
- Prettierを利用するか
- ESLintを利用するか

実行環境とパッケージマネージャーは別の設定として保持し、将来Node.js以外の環境を追加できるようにします。BunやYarnなどは、生成・依存取得・ビルドを実際に検証してから対応候補へ追加します。

選択内容によって、propertiesの拡張子、TypeScript設定、`package.json`、`.gitignore`、READMEのセットアップコマンドなどを切り替えます。GitHubを利用しない場合はGit関連ファイルを生成しません。パッケージマネージャーを利用しない場合も初期のBP成果物は生成しますが、自動ビルド設定は含めず、PrettierとESLintも選択できません。

言語選択時の初期値は次のとおりです。これは利用者の技術力を断定する表示には使わず、簡易構成と標準的な開発構成の推奨プリセットとして扱います。

| 設定 | JavaScript | TypeScript |
| --- | --- | --- |
| GitHub | ON | ON |
| パッケージマネージャー | 使用しない | pnpm |
| Prettier | OFF | ON |
| ESLint | OFF | ON |

2ページ目では次を設定します。

- propertiesの全項目
- `pack_icon.png` として使用するPNG画像
- `README.md` を生成するか

propertiesから`BP/manifest.json`が生成されることを画面上で明示します。pack iconはアップロード直後にブラウザ内でプレビューします。完成時には、ソース、初期BP成果物、manifest、UUID、任意のpack icon、README、Git設定、パッケージ設定を含むプロジェクトZIPをブラウザ内で生成します。入力ファイルと生成物はサーバーへ送信しません。

### ローカルプロジェクトの一時アップロード

ブラウザからローカルのプロジェクトフォルダを選択し、サーバーへ一時的にアップロードして、次の処理を実行できるようにすることを検討します。

1. プロジェクト構成の検出
2. `manifest.json` と `scripts/properties.js` の検証
3. npm依存関係の取得
4. ビルドの実行
5. Behavior Pack成果物の検証
6. 配布ZIPの生成
7. 検証結果とビルドログの表示
8. 問題がなければアドオン公開へ進む

フォルダ選択にはブラウザのディレクトリアップロード機能を利用し、対応していない環境ではプロジェクトZIPのアップロードを代替手段とします。

### 実行環境と安全性

アップロードされたプロジェクトやnpmスクリプトは信頼できないコードとして扱います。Webサーバーや通常のBackendコンテナ内では実行せず、ネットワークや権限を制限した使い捨てのビルド環境で処理します。

- ビルドごとに隔離された一時環境を作成する
- CPU、メモリ、ディスク容量、実行時間、プロセス数を制限する
- ホスト、DB、内部ネットワーク、他ユーザーのビルドへアクセスさせない
- 外部ネットワークは原則遮断し、npm依存取得に必要な範囲だけ許可することを検討する
- アップロードファイル、展開後容量、ファイル数に上限を設ける
- パストラバーサル、シンボリックリンク、ZIP bombを拒否する
- Secretsや本番用認証情報をビルド環境へ渡さない
- ビルド終了後にソース、依存関係、ログ、生成物を期限付きで削除する
- 公開操作は認証済みユーザーだけに許可し、検証のみの利用にはレート制限を設ける

ビルド成果物はサーバー側でSHA-256を計算し、検証済みの成果物だけを公開処理へ引き継ぎます。

### 段階的な実装案

1. Properties作成・検証フォーム（ブラウザ内で完結）
2. プロジェクトフォルダまたはZIPの構造検証
3. 既にビルド済みのBehavior Packを検証・梱包
4. 隔離されたサーバーサイドビルド
5. 検証結果からアドオン公開へ直接進めるウィザード

最初から任意コードをサーバーで実行する機能は作らず、ブラウザ内のメタデータ生成と静的検証から段階的に広げます。

## 未決定事項

- アドオン名の命名規則と予約名
- バージョニング規則
- manifestの正式なスキーマ
- ファイル形式と容量上限
- 公開、非公開、削除、yankの扱い
- オブジェクトストレージの正式な選定
- ダウンロード統計の保存期間とプライバシー方針
- マルウェア検査や署名検証の方式
- Webビルド環境の隔離方式と実行基盤
- npmパッケージ取得時のネットワーク許可範囲とキャッシュ方式
- 一時アップロード、ビルドログ、成果物の保存期間
- 匿名で利用できる検証範囲とレート制限
