import type { Locale } from "./config";

export type Dictionary = {
  languageName: string;
  header: { home: string; addons: string; develop: string; account: string; navigation: string; loginMethods: string };
  home: {
    eyebrow: string; titleLine1: string; titleLine2: string; lead: string;
    findAddons: string; publishAddon: string; authError: string; registryEyebrow: string;
    registryTitle: string; registryDescription: string; registryPreparing: string;
    registrySoon: string; footerDescription: string;
  };
  account: {
    eyebrow: string; loading: string; loginRequired: string; loginDescription: string;
    googleLogin: string; githubLogin: string; backHome: string; loadError: string;
    loadErrorDescription: string; reload: string; email: string; userId: string; logout: string;
  };
  develop: {
    eyebrow: string; title: string; introBefore: string; introFile: string; introAfter: string;
    required: string; basicTitle: string; basicDescription: string; id: string; idPlaceholder: string;
    idHelp: string; displayName: string; displayNamePlaceholder: string; description: string;
    descriptionPlaceholder: string; authorTitle: string; authorDescription: string; authors: string;
    authorsPlaceholder: string; authorsHelp: string; url: string; license: string;
    versionTitle: string; versionDescription: string; addonVersion: string; prerelease: string;
    build: string; engineVersion: string; minecraftTitle: string; minecraftDescription: string;
    kairoTitle: string; kairoDescription: string; tagsTitle: string; tagsDescription: string;
    automaticTag: string; customTags: string; customTagsPlaceholder: string; customTagsHelp: string;
    preview: string; needsReview: (count: number) => string; validationOk: string; copy: string;
    copied: string; save: string; privacy: string;
  };
  validation: {
    idRequired: string; idInvalid: string; nameRequired: string; descriptionRequired: string;
    versionInvalid: string; kairoRequired: string; databaseRequired: string; moduleVersionRequired: string;
  };
};

const ja: Dictionary = {
  languageName: "日本語",
  header: { home: "トップ", addons: "アドオン", develop: "開発サポート", account: "アカウント", navigation: "メインナビゲーション", loginMethods: "ログイン方法" },
  home: {
    eyebrow: "ADD-ONS FOR KAIRO", titleLine1: "つくる人と、", titleLine2: "遊ぶ人をつなぐ。",
    lead: "Kairoのアドオンを見つけて、すぐに導入。閲覧とダウンロードにアカウントは必要ありません。",
    findAddons: "アドオンを探す", publishAddon: "アドオンを公開する", authError: "ログインを完了できませんでした。もう一度お試しください。",
    registryEyebrow: "REGISTRY", registryTitle: "アドオンレジストリ",
    registryDescription: "公開されたアドオンは、Web・API・将来のKairo CLIから同じように利用できます。",
    registryPreparing: "レジストリを準備しています", registrySoon: "最初のアドオン公開機能をまもなく追加します。",
    footerDescription: "Kairoのオープンなアドオンレジストリ",
  },
  account: {
    eyebrow: "KAIRO ACCOUNT", loading: "読み込んでいます…", loginRequired: "ログインが必要です",
    loginDescription: "アカウントを表示するにはログインしてください。", googleLogin: "Googleでログイン", githubLogin: "GitHubでログイン",
    backHome: "トップへ戻る", loadError: "読み込めませんでした", loadErrorDescription: "アカウント情報の取得に失敗しました。時間をおいて再度お試しください。",
    reload: "再読み込み", email: "メールアドレス", userId: "ユーザーID", logout: "ログアウト",
  },
  develop: {
    eyebrow: "DEVELOPMENT SUPPORT", title: "Properties Builder", introBefore: "フォームを埋めるだけで、Kairoアドオン用の",
    introFile: "scripts/properties.js", introAfter: "を生成できます。ログインは必要ありません。", required: "必須",
    basicTitle: "基本情報", basicDescription: "アドオンを識別する情報です。", id: "アドオンID", idPlaceholder: "my-addon",
    idHelp: "A-Z、a-z、0-9、ハイフンのみ使用できます。", displayName: "表示名", displayNamePlaceholder: "My Add-on",
    description: "説明", descriptionPlaceholder: "このアドオンでできること", authorTitle: "作者情報", authorDescription: "空欄の項目は出力されません。",
    authors: "作者", authorsPlaceholder: "shizuku86, contributor", authorsHelp: "複数の場合はカンマで区切ります。", url: "URL", license: "ライセンス",
    versionTitle: "バージョン", versionDescription: "アドオンとMinecraftの互換性を指定します。", addonVersion: "アドオンバージョン",
    prerelease: "prerelease", build: "build", engineVersion: "最低エンジンバージョン", minecraftTitle: "Minecraft依存関係",
    minecraftDescription: "使用するScript APIモジュールを複数選択できます。", kairoTitle: "Kairo依存関係", kairoDescription: "必須依存として自動的に追加されます。",
    tagsTitle: "タグ", tagsDescription: "システムタグは依存関係から自動判定されます。", automaticTag: "自動タグ", customTags: "カスタムタグ",
    customTagsPlaceholder: "utility, world-generation", customTagsHelp: "カンマ区切り。official、approved、stable、experimentalはシステムが管理します。",
    preview: "PREVIEW", needsReview: (count) => `${count}件の要確認`, validationOk: "検証OK", copy: "コピー", copied: "コピーしました",
    save: "properties.jsを保存", privacy: "入力内容と生成処理はブラウザ内で完結し、サーバーへ送信されません。",
  },
  validation: {
    idRequired: "アドオンIDは必須です。", idInvalid: "A-Z、a-z、0-9、- のみ使用できます。", nameRequired: "表示名は必須です。",
    descriptionRequired: "説明は必須です。", versionInvalid: "バージョンは0以上の整数で入力してください。", kairoRequired: "Kairoのバージョン条件は必須です。",
    databaseRequired: "Kairo Databaseのバージョン条件は必須です。", moduleVersionRequired: "選択したモジュールにはバージョンが必要です。",
  },
};

const en: Dictionary = {
  languageName: "English",
  header: { home: "Home", addons: "Add-ons", develop: "Developer tools", account: "Account", navigation: "Main navigation", loginMethods: "Sign-in methods" },
  home: {
    eyebrow: "ADD-ONS FOR KAIRO", titleLine1: "Connecting creators", titleLine2: "with players.",
    lead: "Discover Kairo add-ons and install them right away. No account is required to browse or download.",
    findAddons: "Explore add-ons", publishAddon: "Publish an add-on", authError: "We couldn't complete sign-in. Please try again.",
    registryEyebrow: "REGISTRY", registryTitle: "Add-on registry",
    registryDescription: "Published add-ons will be available consistently through the web, API, and the future Kairo CLI.",
    registryPreparing: "The registry is being prepared", registrySoon: "Publishing support for the first add-ons is coming soon.",
    footerDescription: "Open add-on registry for Kairo",
  },
  account: {
    eyebrow: "KAIRO ACCOUNT", loading: "Loading…", loginRequired: "Sign in required", loginDescription: "Sign in to view your account.",
    googleLogin: "Continue with Google", githubLogin: "Continue with GitHub", backHome: "Back to home", loadError: "Unable to load account",
    loadErrorDescription: "We couldn't retrieve your account. Please wait a moment and try again.", reload: "Reload", email: "Email address",
    userId: "User ID", logout: "Sign out",
  },
  develop: {
    eyebrow: "DEVELOPMENT SUPPORT", title: "Properties Builder", introBefore: "Complete the form to generate",
    introFile: "scripts/properties.js", introAfter: "for your Kairo add-on. No account is required.", required: "Required",
    basicTitle: "Basics", basicDescription: "Information that identifies your add-on.", id: "Add-on ID", idPlaceholder: "my-addon",
    idHelp: "Use only A-Z, a-z, 0-9, and hyphens.", displayName: "Display name", displayNamePlaceholder: "My Add-on",
    description: "Description", descriptionPlaceholder: "What this add-on does", authorTitle: "Author details", authorDescription: "Empty fields are omitted from the output.",
    authors: "Authors", authorsPlaceholder: "author, contributor", authorsHelp: "Separate multiple authors with commas.", url: "URL", license: "License",
    versionTitle: "Versions", versionDescription: "Set add-on and Minecraft compatibility.", addonVersion: "Add-on version", prerelease: "prerelease",
    build: "build", engineVersion: "Minimum engine version", minecraftTitle: "Minecraft dependencies",
    minecraftDescription: "Select one or more Script API modules used by your add-on.", kairoTitle: "Kairo dependencies", kairoDescription: "These are automatically included as required dependencies.",
    tagsTitle: "Tags", tagsDescription: "System tags are derived automatically from dependencies.", automaticTag: "Automatic tag", customTags: "Custom tags",
    customTagsPlaceholder: "utility, world-generation", customTagsHelp: "Comma-separated. official, approved, stable, and experimental are managed by the system.",
    preview: "PREVIEW", needsReview: (count) => `${count} to review`, validationOk: "Valid", copy: "Copy", copied: "Copied",
    save: "Save properties.js", privacy: "Your input and generated output stay in this browser and are never sent to the server.",
  },
  validation: {
    idRequired: "Add-on ID is required.", idInvalid: "Use only A-Z, a-z, 0-9, and hyphens.", nameRequired: "Display name is required.",
    descriptionRequired: "Description is required.", versionInvalid: "Versions must be non-negative integers.", kairoRequired: "A Kairo version range is required.",
    databaseRequired: "A Kairo Database version range is required.", moduleVersionRequired: "Selected modules require a version.",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { ja, en };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
