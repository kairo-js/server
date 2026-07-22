import type { Locale } from "./config";

export type Dictionary = {
  languageName: string;
  header: { home: string; addons: string; develop: string; publish: string; account: string; navigation: string; loginMethods: string };
  home: {
    eyebrow: string; titleLine1: string; titleLine2: string; lead: string;
    findAddons: string; publishAddon: string; authError: string; registryEyebrow: string;
    registryTitle: string; registryDescription: string; registryPreparing: string;
    registrySoon: string; registryLoading: string; registryError: string; noPublishedAddons: string;
    latestVersion: string; prerelease: string; download: string; owner: string; footerDescription: string;
  };
  account: {
    eyebrow: string; loading: string; loginRequired: string; loginDescription: string;
    googleLogin: string; githubLogin: string; backHome: string; loadError: string;
    loadErrorDescription: string; reload: string; email: string; userId: string; logout: string;
    tokensTitle: string; tokensDescription: string; tokenName: string; tokenNamePlaceholder: string; createToken: string;
    creatingToken: string; tokenCreated: string; tokenCreatedNotice: string; copyToken: string; copiedToken: string;
    noTokens: string; createdAt: string; lastUsed: string; neverUsed: string; revokeToken: string; tokenError: string;
  };
  publish: {
    eyebrow: string; title: string; description: string; loading: string; loadError: string; loadErrorDescription: string; reload: string;
    loginRequired: string; loginDescription: string; googleLogin: string; githubLogin: string;
    ownerTitle: string; ownerDescription: string; personalPublisher: string; official: string;
    detailsTitle: string; detailsDescription: string; id: string; idHelp: string; displayName: string; addonDescription: string;
    descriptionPlaceholder: string; required: string; registrationNotice: string; create: string; submitting: string;
    createdEyebrow: string; createdDescription: string; versionLabel: string; archiveLabel: string; archiveHelp: string;
    publishVersion: string; publishingVersion: string; versionPublished: string; downloadVersion: string; backHome: string;
    errors: Record<string, string>;
  };
  develop: {
    eyebrow: string; title: string; introBefore: string; introFile: string; introAfter: string;
    stepEnvironment: string; stepAddon: string; stepPreview: string; environmentTitle: string; environmentDescription: string;
    platformQuestion: string; platformDescription: string;
    platforms: Record<"windows" | "mobile" | "mac-linux", { title: string; description: string; badge: string }>;
    mobileLanguageNotice: string; mobileGitHubNotice: string;
    languageQuestion: string; javascript: string; javascriptDescription: string; typescript: string; typescriptDescription: string;
    runtimeQuestion: string; runtimeDescription: string; nodeRuntime: string; nodeDescription: string; nodeUnavailableMobile: string; noRuntime: string; noRuntimeDescription: string; otherRuntimes: string; otherRuntimesDescription: string;
    githubQuestion: string; useGitHub: string; useGitHubDescription: string; noGitHub: string; noGitHubDescription: string;
    packageQuestion: string; packageDescription: string; noPackageManager: string; continue: string; back: string;
    toolingQuestion: string; toolingDescription: string; prettierDescription: string; eslintDescription: string; toolingRequiresManager: string;
    projectSettings: string; packIcon: string; packIconHelp: string; chooseIcon: string; readme: string; readmeDescription: string;
    packIconPreview: string; dependencyId: string; dependencyVersion: string; addDependency: string; removeDependency: string;
    manifestNotice: string; generatedFiles: string; downloadProject: string; previewProject: string; noManagerWarning: string;
    projectPreviewTitle: string; projectPreviewDescription: string; backToAddon: string; fileTree: string; files: string;
    copyFile: string; binaryFile: string; readyToDownload: string; downloadDescription: string;
    required: string; basicTitle: string; basicDescription: string; id: string; idPlaceholder: string;
    idHelp: string; displayName: string; displayNamePlaceholder: string; description: string;
    idAvailability: Record<"idle" | "checking" | "available" | "intent" | "taken" | "reserved" | "invalid" | "unknown", string>;
    descriptionPlaceholder: string; authorTitle: string; authorDescription: string; authors: string;
    authorsPlaceholder: string; authorsHelp: string; url: string; license: string;
    versionTitle: string; versionDescription: string; addonVersion: string; prerelease: string;
    build: string; engineVersion: string; minecraftTitle: string; minecraftDescription: string;
    kairoV2Compatibility: string; customVersion: string;
    minecraftGroups: Record<"stable" | "experimental", { title: string; description: string; badge: string }>;
    kairoTitle: string; kairoDescription: string; tagsTitle: string; tagsDescription: string;
    automaticTag: string; customTags: string; customTagsPlaceholder: string; customTagsHelp: string;
    preview: string; needsReview: (count: number) => string; validationOk: string; copy: string;
    copied: string; save: string; privacy: string;
  };
  validation: {
    idRequired: string; idInvalid: string; nameRequired: string; descriptionRequired: string;
    versionInvalid: string; engineVersionInvalid: string; kairoRequired: string; databaseRequired: string; moduleVersionRequired: string;
    dependencyIdRequired: string; dependencyIdInvalid: string; dependencyVersionRequired: string; dependencyReserved: string;
  };
};

const ja: Dictionary = {
  languageName: "日本語",
  header: { home: "トップ", addons: "アドオン", develop: "開発サポート", publish: "投稿", account: "アカウント", navigation: "メインナビゲーション", loginMethods: "ログイン方法" },
  home: {
    eyebrow: "ADD-ONS FOR KAIRO", titleLine1: "つくる人と、", titleLine2: "遊ぶ人をつなぐ。",
    lead: "Kairoのアドオンを見つけて、すぐに導入。閲覧とダウンロードにアカウントは必要ありません。",
    findAddons: "アドオンを探す", publishAddon: "アドオンを公開する", authError: "ログインを完了できませんでした。もう一度お試しください。",
    registryEyebrow: "REGISTRY", registryTitle: "アドオンレジストリ",
    registryDescription: "公開されたアドオンは、Web・API・将来のKairo CLIから同じように利用できます。",
    registryPreparing: "レジストリを準備しています", registrySoon: "最初のアドオン公開機能をまもなく追加します。", registryLoading: "公開済みアドオンを読み込んでいます…", registryError: "レジストリを読み込めませんでした。", noPublishedAddons: "公開済みのアドオンはまだありません。", latestVersion: "最新バージョン", prerelease: "プレリリース", download: "ダウンロード", owner: "所有者",
    footerDescription: "Kairoのオープンなアドオンレジストリ",
  },
  account: {
    eyebrow: "KAIRO ACCOUNT", loading: "読み込んでいます…", loginRequired: "ログインが必要です",
    loginDescription: "アカウントを表示するにはログインしてください。", googleLogin: "Googleでログイン", githubLogin: "GitHubでログイン",
    backHome: "トップへ戻る", loadError: "読み込めませんでした", loadErrorDescription: "アカウント情報の取得に失敗しました。時間をおいて再度お試しください。",
    reload: "再読み込み", email: "メールアドレス", userId: "ユーザーID", logout: "ログアウト",
    tokensTitle: "APIトークン", tokensDescription: "Kairo CLIからアドオンを公開するためのトークンです。トークンの値は発行時に一度だけ表示されます。", tokenName: "トークン名", tokenNamePlaceholder: "開発PCのKairo CLI", createToken: "トークンを発行", creatingToken: "発行しています…", tokenCreated: "APIトークンを発行しました", tokenCreatedNotice: "この値は再表示できません。今すぐ安全な場所へ保存してください。", copyToken: "コピー", copiedToken: "コピーしました", noTokens: "発行済みのAPIトークンはありません。", createdAt: "発行日", lastUsed: "最終使用", neverUsed: "未使用", revokeToken: "失効", tokenError: "APIトークンを操作できませんでした。",
  },
  publish: {
    eyebrow: "PUBLISH ADD-ON", title: "アドオンを登録", description: "アドオンの所有者と基本情報を登録します。バージョンとZIPファイルは次の段階で投稿します。",
    loading: "アカウントとOrganizationを読み込んでいます…", loadError: "投稿画面を読み込めませんでした", loadErrorDescription: "アカウントまたはOrganization情報の取得に失敗しました。", reload: "再読み込み",
    loginRequired: "投稿するにはログインが必要です", loginDescription: "個人または所属Organizationとしてアドオンを登録できます。", googleLogin: "Googleでログイン", githubLogin: "GitHubでログイン",
    ownerTitle: "所有者", ownerDescription: "アドオンを所有する個人またはOrganizationを選択します。", personalPublisher: "個人として登録", official: "公式",
    detailsTitle: "基本情報", detailsDescription: "IDは登録後に変更できません。", id: "アドオンID", idHelp: "A-Z、a-z、0-9、ハイフンのみ。大文字は小文字として登録されます。", displayName: "表示名", addonDescription: "説明",
    descriptionPlaceholder: "このアドオンでできること", required: "必須", registrationNotice: "登録後、最初のバージョンと配布ZIPを投稿します。", create: "アドオンを登録", submitting: "登録しています…",
    createdEyebrow: "ADD-ON CREATED", createdDescription: "アドオンを登録しました。最初のバージョンと配布ZIPを投稿してください。", versionLabel: "バージョン", archiveLabel: "配布ZIP", archiveHelp: "有効なZIPファイル（最大256 MiB）。同じバージョンは再投稿できません。", publishVersion: "バージョンを投稿", publishingVersion: "アップロードしています…", versionPublished: "バージョンを公開しました", downloadVersion: "ZIPをダウンロード", backHome: "トップへ戻る",
    errors: { invalid_request: "入力内容を確認してください。", invalid_addon: "アドオンID、表示名、説明を確認してください。", invalid_owner: "所有者を確認してください。", invalid_version: "SemVer形式のバージョンを入力してください。", invalid_archive: "有効で安全なZIPファイルを選択してください。", file_required: "配布ZIPを選択してください。", file_too_large: "ZIPは256 MiB以下にしてください。", version_exists: "このバージョンは既に投稿されています。", storage_error: "ファイルを保存できませんでした。", addon_id_unavailable: "このアドオンIDは利用できません。", organization_not_found: "Organizationが見つかりません。", owner_forbidden: "このOrganizationとして操作する権限がありません。", unauthenticated: "ログインし直してください。", unknown: "処理できませんでした。時間をおいて再度お試しください。" },
  },
  develop: {
    eyebrow: "DEVELOPMENT SUPPORT", title: "Kairo Project Builder", introBefore: "フォームを埋めるだけで、Kairoアドオン用の",
    introFile: "scripts/properties.js", introAfter: "を生成できます。ログインは必要ありません。", required: "必須",
    stepEnvironment: "開発環境", stepAddon: "アドオン設定", stepPreview: "全体プレビュー", environmentTitle: "開発環境を選択", environmentDescription: "選択内容に合わせてプロジェクト構成と設定ファイルを生成します。",
    platformQuestion: "どの端末で開発しますか？", platformDescription: "利用できる開発ツールと、Minecraft上での確認方法が端末によって異なります。",
    platforms: {
      windows: { title: "Windows", description: "MinecraftとNode.jsを同じPCで利用でき、開発から動作確認まで行えます。", badge: "推奨" },
      mobile: { title: "スマートフォン", description: "Node.jsを使わず、JavaScriptとBP・RPを直接編集する構成です。", badge: "MOBILE" },
      "mac-linux": { title: "macOS / Linux", description: "Node.jsで開発できますが、Minecraft上での動作確認には別の端末が必要です。", badge: "DESKTOP" },
    },
    mobileLanguageNotice: "スマートフォン向けには、ビルドを必要としないJavaScriptプロジェクトを生成します。", mobileGitHubNotice: "スマートフォン向け構成ではGitHubを使用しません。",
    languageQuestion: "どの言語で開発しますか？", javascript: "JavaScript", javascriptDescription: "型設定なしですぐに開発を始めます。", typescript: "TypeScript", typescriptDescription: "型安全な開発環境とtsconfigを生成します。",
    runtimeQuestion: "実行・ビルド環境", runtimeDescription: "Minecraftで動くJavaScriptを準備するための環境です。", nodeRuntime: "Node.js", nodeDescription: "TypeScriptの変換や依存関係の管理、自動ビルドに利用します。", nodeUnavailableMobile: "スマートフォン向け構成では使用しません。", noRuntime: "ランタイムなし", noRuntimeDescription: "JavaScriptとBP・RPを直接編集します。", otherRuntimes: "その他の環境", otherRuntimesDescription: "Bunなどは実際の生成・ビルド検証後に追加します。",
    githubQuestion: "GitHubを使いますか？", useGitHub: "GitHubを使う", useGitHubDescription: ".gitignoreを含むGit管理向けの構成にします。", noGitHub: "使用しない", noGitHubDescription: "Git関連のファイルを生成しません。",
    packageQuestion: "パッケージマネージャー", packageDescription: "依存関係のインストールとビルドに使うツールを選択します。", noPackageManager: "使用しない", continue: "アドオン設定へ", back: "開発環境へ戻る",
    toolingQuestion: "コード品質ツール", toolingDescription: "フォーマットと静的解析の設定を必要に応じて追加します。", prettierDescription: "コードフォーマット設定とformat scriptsを追加します。", eslintDescription: "言語に対応した静的解析設定とlint scriptを追加します。", toolingRequiresManager: "PrettierとESLintを利用するにはnpmまたはpnpmを選択してください。",
    projectSettings: "プロジェクト生成設定", packIcon: "パックアイコン", packIconHelp: "PNG画像をpack_icon.pngとしてプロジェクトとBPへ追加します。", chooseIcon: "PNGを選択", readme: "README.mdを生成", readmeDescription: "アドオン名、説明、セットアップ方法を含むREADMEを追加します。",
    packIconPreview: "パックアイコンのプレビュー", dependencyId: "依存ID", dependencyVersion: "バージョン条件", addDependency: "依存関係を追加", removeDependency: "依存関係を削除",
    manifestNotice: "manifest.jsonはpropertiesの名前、説明、バージョン、Minecraft依存関係から自動生成されます。", generatedFiles: "生成ファイル", downloadProject: "プロジェクトZIPを保存", previewProject: "プロジェクト全体を確認", noManagerWarning: "パッケージマネージャーを使わない場合、初期のBP成果物は生成されますが、自動ビルド設定は含まれません。",
    projectPreviewTitle: "プロジェクト全体を確認", projectPreviewDescription: "生成されるファイルを選択して内容を確認できます。問題がなければZIPを保存してください。", backToAddon: "アドオン設定へ戻る", fileTree: "生成ファイル一覧", files: "files", copyFile: "ファイルをコピー", binaryFile: "このバイナリファイルはテキスト表示できません。", readyToDownload: "プロジェクトの準備ができました", downloadDescription: "このプレビューの内容をそのままZIPファイルにまとめます。",
    basicTitle: "基本情報", basicDescription: "アドオンを識別する情報です。", id: "アドオンID", idPlaceholder: "my-addon",
    idHelp: "A-Z、a-z、0-9、ハイフンのみ使用できます。", displayName: "表示名", displayNamePlaceholder: "My Add-on",
    idAvailability: {
      idle: "IDを入力してください。", checking: "Kairoレジストリを確認しています…", available: "Kairoレジストリ上では現在利用可能です。",
      intent: "このIDで最近プロジェクトが生成されています。将来重複する可能性がありますが、生成は可能です。",
      taken: "このIDは既に登録されています。", reserved: "このIDはKairo公式パッケージ用に予約されています。",
      invalid: "IDの形式を確認してください。", unknown: "レジストリへ接続できませんでした。重複を保証できませんが生成は可能です。",
    },
    description: "説明", descriptionPlaceholder: "このアドオンでできること", authorTitle: "作者情報", authorDescription: "空欄の項目は出力されません。",
    authors: "作者", authorsPlaceholder: "shizuku86, contributor", authorsHelp: "複数の場合はカンマで区切ります。", url: "URL", license: "ライセンス",
    versionTitle: "バージョン", versionDescription: "アドオンとMinecraftの互換性を指定します。", addonVersion: "アドオンバージョン",
    prerelease: "prerelease", build: "build", engineVersion: "最低エンジンバージョン", minecraftTitle: "Minecraft依存関係",
    minecraftDescription: "使用するScript APIモジュールを複数選択できます。", kairoTitle: "Kairo依存関係", kairoDescription: "必須依存として自動的に追加されます。",
    kairoV2Compatibility: "Minecraft側では1.xも指定できますが、Kairoは2.0.0以上に対応しています。", customVersion: "手入力…",
    minecraftGroups: {
      stable: { title: "安定版", description: "安定版を選択できるMinecraft Script APIモジュールです。", badge: "STABLE" },
      experimental: { title: "実験版", description: "現在はpre-release版のみ利用できるモジュールです。必要な場合に展開してください。", badge: "実験版" },
    },
    tagsTitle: "タグ", tagsDescription: "システムタグは依存関係から自動判定されます。", automaticTag: "自動タグ", customTags: "カスタムタグ",
    customTagsPlaceholder: "utility, world-generation", customTagsHelp: "カンマ区切り。official、approved、stable、experimentalはシステムが管理します。",
    preview: "PREVIEW", needsReview: (count) => `${count}件の要確認`, validationOk: "検証OK", copy: "コピー", copied: "コピーしました",
    save: "properties.jsを保存", privacy: "ZIP生成時に、IDの重複警告とサービス改善のため、アドオンIDと開発環境の選択を匿名で記録します。",
  },
  validation: {
    idRequired: "アドオンIDは必須です。", idInvalid: "A-Z、a-z、0-9、- のみ使用できます。", nameRequired: "表示名は必須です。",
    descriptionRequired: "説明は必須です。", versionInvalid: "バージョンは0以上の整数で入力してください。", kairoRequired: "Kairoのバージョン条件は必須です。",
    databaseRequired: "Kairo Databaseのバージョン条件は必須です。", moduleVersionRequired: "選択したモジュールにはバージョンが必要です。",
    engineVersionInvalid: "利用可能なMinecraftバージョンと0以上のpatchを指定してください。", dependencyIdRequired: "依存IDは必須です。", dependencyIdInvalid: "依存IDにはA-Z、a-z、0-9、-のみ使用できます。", dependencyVersionRequired: "バージョン条件は必須です。", dependencyReserved: "この依存関係はシステムが管理します。",
  },
};

const en: Dictionary = {
  languageName: "English",
  header: { home: "Home", addons: "Add-ons", develop: "Developer tools", publish: "Publish", account: "Account", navigation: "Main navigation", loginMethods: "Sign-in methods" },
  home: {
    eyebrow: "ADD-ONS FOR KAIRO", titleLine1: "Connecting creators", titleLine2: "with players.",
    lead: "Discover Kairo add-ons and install them right away. No account is required to browse or download.",
    findAddons: "Explore add-ons", publishAddon: "Publish an add-on", authError: "We couldn't complete sign-in. Please try again.",
    registryEyebrow: "REGISTRY", registryTitle: "Add-on registry",
    registryDescription: "Published add-ons will be available consistently through the web, API, and the future Kairo CLI.",
    registryPreparing: "The registry is being prepared", registrySoon: "Publishing support for the first add-ons is coming soon.", registryLoading: "Loading published add-ons…", registryError: "The registry could not be loaded.", noPublishedAddons: "No add-ons have been published yet.", latestVersion: "Latest version", prerelease: "Prerelease", download: "Download", owner: "Owner",
    footerDescription: "Open add-on registry for Kairo",
  },
  account: {
    eyebrow: "KAIRO ACCOUNT", loading: "Loading…", loginRequired: "Sign in required", loginDescription: "Sign in to view your account.",
    googleLogin: "Continue with Google", githubLogin: "Continue with GitHub", backHome: "Back to home", loadError: "Unable to load account",
    loadErrorDescription: "We couldn't retrieve your account. Please wait a moment and try again.", reload: "Reload", email: "Email address",
    userId: "User ID", logout: "Sign out",
    tokensTitle: "API tokens", tokensDescription: "Use these tokens to publish add-ons from the Kairo CLI. A token value is shown only once when created.", tokenName: "Token name", tokenNamePlaceholder: "Kairo CLI on development PC", createToken: "Create token", creatingToken: "Creating…", tokenCreated: "API token created", tokenCreatedNotice: "This value cannot be shown again. Store it somewhere safe now.", copyToken: "Copy", copiedToken: "Copied", noTokens: "You have no API tokens.", createdAt: "Created", lastUsed: "Last used", neverUsed: "Never", revokeToken: "Revoke", tokenError: "The API token operation failed.",
  },
  publish: {
    eyebrow: "PUBLISH ADD-ON", title: "Register an add-on", description: "Choose an owner and register the add-on basics. Upload its first version and ZIP in the next step.",
    loading: "Loading your account and organizations…", loadError: "Unable to load publishing", loadErrorDescription: "We couldn't retrieve your account or organization information.", reload: "Reload",
    loginRequired: "Sign in to publish", loginDescription: "Register an add-on personally or for an organization you belong to.", googleLogin: "Continue with Google", githubLogin: "Continue with GitHub",
    ownerTitle: "Owner", ownerDescription: "Choose the person or organization that owns this add-on.", personalPublisher: "Register personally", official: "Official",
    detailsTitle: "Basics", detailsDescription: "The ID cannot be changed after registration.", id: "Add-on ID", idHelp: "Use A-Z, a-z, 0-9, and hyphens. Uppercase letters are stored in lowercase.", displayName: "Display name", addonDescription: "Description",
    descriptionPlaceholder: "What this add-on does", required: "Required", registrationNotice: "After registration, publish the first version and distribution ZIP.", create: "Register add-on", submitting: "Registering…",
    createdEyebrow: "ADD-ON CREATED", createdDescription: "The add-on is registered. Upload its first version and distribution ZIP.", versionLabel: "Version", archiveLabel: "Distribution ZIP", archiveHelp: "A valid ZIP file, up to 256 MiB. A published version cannot be replaced.", publishVersion: "Publish version", publishingVersion: "Uploading…", versionPublished: "Version published", downloadVersion: "Download ZIP", backHome: "Back to home",
    errors: { invalid_request: "Check the submitted information.", invalid_addon: "Check the add-on ID, display name, and description.", invalid_owner: "Check the selected owner.", invalid_version: "Enter a valid SemVer version.", invalid_archive: "Choose a valid and safe ZIP archive.", file_required: "Choose a distribution ZIP.", file_too_large: "The ZIP must be no larger than 256 MiB.", version_exists: "This version has already been published.", storage_error: "The file could not be stored.", addon_id_unavailable: "This add-on ID is unavailable.", organization_not_found: "The organization could not be found.", owner_forbidden: "You cannot perform this action for the organization.", unauthenticated: "Please sign in again.", unknown: "The request could not be completed. Please try again later." },
  },
  develop: {
    eyebrow: "DEVELOPMENT SUPPORT", title: "Kairo Project Builder", introBefore: "Complete the form to generate",
    introFile: "scripts/properties.js", introAfter: "for your Kairo add-on. No account is required.", required: "Required",
    stepEnvironment: "Environment", stepAddon: "Add-on setup", stepPreview: "Full preview", environmentTitle: "Choose your development environment", environmentDescription: "The project structure and configuration files are generated from your choices.",
    platformQuestion: "Which device will you develop on?", platformDescription: "Available development tools and Minecraft testing options depend on your device.",
    platforms: {
      windows: { title: "Windows", description: "Run Minecraft and Node.js on the same PC, from development through testing.", badge: "RECOMMENDED" },
      mobile: { title: "Mobile", description: "Edit JavaScript and BP/RP files directly without Node.js.", badge: "MOBILE" },
      "mac-linux": { title: "macOS / Linux", description: "Develop with Node.js, but use another device to test in Minecraft.", badge: "DESKTOP" },
    },
    mobileLanguageNotice: "Mobile projects use JavaScript directly and do not require a build step.", mobileGitHubNotice: "The mobile project setup does not use GitHub.",
    languageQuestion: "Which language will you use?", javascript: "JavaScript", javascriptDescription: "Start immediately without type configuration.", typescript: "TypeScript", typescriptDescription: "Generate a type-safe setup with a tsconfig.",
    runtimeQuestion: "Runtime and build environment", runtimeDescription: "The environment used to prepare JavaScript that runs in Minecraft.", nodeRuntime: "Node.js", nodeDescription: "Used for TypeScript, dependency management, and automated builds.", nodeUnavailableMobile: "Not used in the mobile project setup.", noRuntime: "No runtime", noRuntimeDescription: "Edit JavaScript and BP/RP files directly.", otherRuntimes: "Other runtimes", otherRuntimesDescription: "Bun and other options will be added after generation and build testing.",
    githubQuestion: "Will you use GitHub?", useGitHub: "Use GitHub", useGitHubDescription: "Include a .gitignore and Git-friendly project structure.", noGitHub: "Don't use GitHub", noGitHubDescription: "Do not generate Git-related files.",
    packageQuestion: "Package manager", packageDescription: "Choose the tool used to install dependencies and run builds.", noPackageManager: "None", continue: "Continue to add-on setup", back: "Back to environment",
    toolingQuestion: "Code quality tools", toolingDescription: "Optionally add formatting and static analysis configuration.", prettierDescription: "Add formatting configuration and format scripts.", eslintDescription: "Add language-aware static analysis and a lint script.", toolingRequiresManager: "Choose npm or pnpm to use Prettier and ESLint.",
    projectSettings: "Project generation", packIcon: "Pack icon", packIconHelp: "Add a PNG image as pack_icon.png in the project and BP.", chooseIcon: "Choose PNG", readme: "Generate README.md", readmeDescription: "Add a README with the add-on name, description, and setup instructions.",
    packIconPreview: "Pack icon preview", dependencyId: "Dependency ID", dependencyVersion: "Version range", addDependency: "Add dependency", removeDependency: "Remove dependency",
    manifestNotice: "manifest.json is generated automatically from the name, description, version, and Minecraft dependencies in properties.", generatedFiles: "Generated files", downloadProject: "Download project ZIP", previewProject: "Preview full project", noManagerWarning: "Without a package manager, initial BP output is included, but automated build configuration is not generated.",
    projectPreviewTitle: "Preview the full project", projectPreviewDescription: "Select any generated file to inspect its contents, then download the ZIP when ready.", backToAddon: "Back to add-on setup", fileTree: "Generated file tree", files: "files", copyFile: "Copy file", binaryFile: "This binary file cannot be displayed as text.", readyToDownload: "Your project is ready", downloadDescription: "The files shown in this preview will be packaged into the ZIP.",
    basicTitle: "Basics", basicDescription: "Information that identifies your add-on.", id: "Add-on ID", idPlaceholder: "my-addon",
    idHelp: "Use only A-Z, a-z, 0-9, and hyphens.", displayName: "Display name", displayNamePlaceholder: "My Add-on",
    idAvailability: {
      idle: "Enter an ID.", checking: "Checking the Kairo registry…", available: "Currently available in the Kairo registry.",
      intent: "A project was recently generated with this ID. You can continue, but it may conflict in the future.",
      taken: "This ID is already registered.", reserved: "This ID is reserved for an official Kairo package.",
      invalid: "Check the ID format.", unknown: "The registry could not be reached. Generation is allowed, but uniqueness cannot be confirmed.",
    },
    description: "Description", descriptionPlaceholder: "What this add-on does", authorTitle: "Author details", authorDescription: "Empty fields are omitted from the output.",
    authors: "Authors", authorsPlaceholder: "author, contributor", authorsHelp: "Separate multiple authors with commas.", url: "URL", license: "License",
    versionTitle: "Versions", versionDescription: "Set add-on and Minecraft compatibility.", addonVersion: "Add-on version", prerelease: "prerelease",
    build: "build", engineVersion: "Minimum engine version", minecraftTitle: "Minecraft dependencies",
    minecraftDescription: "Select one or more Script API modules used by your add-on.", kairoTitle: "Kairo dependencies", kairoDescription: "These are automatically included as required dependencies.",
    kairoV2Compatibility: "Minecraft also accepts 1.x versions, but Kairo supports version 2.0.0 and later.", customVersion: "Custom…",
    minecraftGroups: {
      stable: { title: "Stable", description: "Minecraft Script API modules with stable versions available.", badge: "STABLE" },
      experimental: { title: "Experimental", description: "These modules currently offer pre-release versions only. Expand when needed.", badge: "PRE-RELEASE" },
    },
    tagsTitle: "Tags", tagsDescription: "System tags are derived automatically from dependencies.", automaticTag: "Automatic tag", customTags: "Custom tags",
    customTagsPlaceholder: "utility, world-generation", customTagsHelp: "Comma-separated. official, approved, stable, and experimental are managed by the system.",
    preview: "PREVIEW", needsReview: (count) => `${count} to review`, validationOk: "Valid", copy: "Copy", copied: "Copied",
    save: "Save properties.js", privacy: "When generating a ZIP, the add-on ID and development environment choices are recorded anonymously for conflict warnings and service improvements.",
  },
  validation: {
    idRequired: "Add-on ID is required.", idInvalid: "Use only A-Z, a-z, 0-9, and hyphens.", nameRequired: "Display name is required.",
    descriptionRequired: "Description is required.", versionInvalid: "Versions must be non-negative integers.", kairoRequired: "A Kairo version range is required.",
    databaseRequired: "A Kairo Database version range is required.", moduleVersionRequired: "Selected modules require a version.",
    engineVersionInvalid: "Choose an available Minecraft version and a non-negative patch.", dependencyIdRequired: "Dependency ID is required.", dependencyIdInvalid: "Use only A-Z, a-z, 0-9, and hyphens in dependency IDs.", dependencyVersionRequired: "A version range is required.", dependencyReserved: "This dependency is managed by the system.",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { ja, en };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
