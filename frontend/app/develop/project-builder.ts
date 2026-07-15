import { buildPropertiesObject, generatePropertiesSource, type PropertiesForm } from "./properties-builder";

export type SourceLanguage = "javascript" | "typescript";
export type DevelopmentPlatform = "windows" | "mobile" | "mac-linux";
export type Runtime = "node" | "none";
export type PackageManager = "none" | "npm" | "pnpm";

export type ProjectOptions = {
  platform: DevelopmentPlatform;
  language: SourceLanguage;
  runtime: Runtime;
  useGitHub: boolean;
  packageManager: PackageManager;
  usePrettier: boolean;
  useESLint: boolean;
  includeReadme: boolean;
};

export type ProjectFile = { path: string; data: string | Uint8Array };

type UUIDs = {
  bp: { header: string; module: { data: string; script: string } };
  rp: { header: string; modules: { resources: string } };
};

function versionString(version: { major: number; minor: number; patch: number; prerelease?: string; build?: string }) {
  let value = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) value += `-${version.prerelease}`;
  if (version.build) value += `+${version.build}`;
  return value;
}

function createManifest(properties: ReturnType<typeof buildPropertiesObject>, uuids: UUIDs) {
  const version = properties.header.version;
  const triple = [version.major, version.minor, version.patch];
  return {
    format_version: 2,
    metadata: { ...properties.metadata, generated_with: { kairo: [properties.dependencies.kairo] } },
    header: {
      name: `${properties.header.name} - v${versionString(version)}`,
      description: properties.header.description,
      uuid: uuids.bp.header,
      version: triple,
      min_engine_version: [
        properties.header.min_engine_version.major,
        properties.header.min_engine_version.minor,
        properties.header.min_engine_version.patch,
      ],
    },
    modules: [
      { type: "data", uuid: uuids.bp.module.data, version: triple },
      { type: "script", language: "javascript", entry: "scripts/index.js", uuid: uuids.bp.module.script, version: triple },
    ],
    dependencies: properties.minecraftDependencies ?? [],
    capabilities: ["script_eval"],
  };
}

function indexSource(language: SourceLanguage) {
  const source = `import { world } from "@minecraft/server";\nimport { router } from "@kairo-js/router";\nimport { properties } from "./properties";\n\nrouter.afterEvents.addonActivate.subscribe(() => {\n  world.sendMessage(\`\${properties.header.name} activated.\`);\n});\n\nrouter.init(properties);\n`;
  return language === "typescript" ? source : source;
}

function packageJSON(form: PropertiesForm, options: ProjectOptions) {
  const selectedMinecraft = Object.entries(form.modules)
    .filter(([, selection]) => selection.selected)
    .map(([name, selection]) => [name, selection.version]);
  const sourceExtension = options.language === "typescript" ? "ts" : "js";
  const usesKairoCLI = options.runtime === "node" && options.language === "typescript";
  const scripts: Record<string, string> = usesKairoCLI ? {
    build: "kairo build",
    "build:ci": "kairo build-ci",
    typecheck: "kairo typecheck",
  } : {
    build: `rimraf BP/scripts && esbuild src/index.${sourceExtension} src/properties.${sourceExtension} --bundle --format=esm --platform=node --target=es2020 --outdir=BP/scripts --external:@minecraft/* && node .build/generate-manifest.mjs`,
  };
  if (options.usePrettier) {
    scripts.format = "prettier --write .";
    scripts["format:check"] = "prettier --check .";
  }
  if (options.useESLint) scripts.lint = "eslint src";

  return JSON.stringify({
    name: form.id.toLowerCase(),
    version: `${form.versionMajor}.${form.versionMinor}.${form.versionPatch}`,
    description: form.description.trim(),
    type: "module",
    engines: { node: ">=22" },
    ...(usesKairoCLI ? { kairoBuild: { platform: "node" } } : {}),
    scripts,
    dependencies: { "@kairo-js/properties": "1.2.1", "@kairo-js/router": "1.0.0-beta.1" },
    devDependencies: {
      ...Object.fromEntries(selectedMinecraft),
      ...(usesKairoCLI ? { "@kairo-js/cli": "0.1.0-beta" } : { esbuild: "^0.27.3", rimraf: "^6.1.3" }),
      ...(options.language === "typescript" ? { typescript: "^5.9.3" } : {}),
      ...(options.usePrettier ? { prettier: "^3.6.2" } : {}),
      ...(options.useESLint ? {
        eslint: "^9.39.0",
        "@eslint/js": "^9.39.0",
        ...(options.language === "typescript" ? { "typescript-eslint": "^8.46.0" } : {}),
      } : {}),
    },
  }, null, 2) + "\n";
}

function tsconfig() {
  return JSON.stringify({
    compilerOptions: {
      rootDir: "src", outDir: "BP/scripts", module: "ESNext", target: "ES2022",
      moduleResolution: "bundler", strict: true, noEmit: true, skipLibCheck: true,
    },
    include: ["src/**/*"],
  }, null, 2) + "\n";
}

function gitignore(manager: PackageManager) {
  const managerLines: Record<PackageManager, string[]> = {
    none: [],
    npm: [".npm/", "npm-debug.log*"],
    pnpm: [".pnpm-store/", "pnpm-debug.log*"],
  };
  return [
    "node_modules/", ...managerLines[manager], "", "# generated build output", "BP/scripts/", "BP/manifest.json",
    "", "# generated build state", ".build/.uuid.json", ".build/.manifest-version.json", "",
  ].join("\n");
}

function prettierConfig() {
  return JSON.stringify({ tabWidth: 4, printWidth: 100, trailingComma: "all" }, null, 2) + "\n";
}

function prettierIgnore() {
  return "node_modules/\nBP/scripts/\nBP/manifest.json\n";
}

function eslintConfig(language: SourceLanguage) {
  if (language === "typescript") {
    return `import eslint from "@eslint/js";\nimport tseslint from "typescript-eslint";\n\nexport default tseslint.config(\n  eslint.configs.recommended,\n  ...tseslint.configs.recommended,\n  { ignores: ["BP/scripts/**"] },\n);\n`;
  }
  return `import eslint from "@eslint/js";\n\nexport default [\n  eslint.configs.recommended,\n  { files: ["src/**/*.js"], languageOptions: { ecmaVersion: "latest", sourceType: "module" } },\n  { ignores: ["BP/scripts/**"] },\n];\n`;
}

function readme(form: PropertiesForm, options: ProjectOptions) {
  const install = options.packageManager === "none" ? "" : `\n## Setup\n\n\`\`\`bash\n${options.packageManager} install\n${options.packageManager} run build\n\`\`\`\n`;
  return `# ${form.name.trim()}\n\n${form.description.trim()}\n${install}\n## Development\n\nEdit \`src/properties.${options.language === "typescript" ? "ts" : "js"}\`. The build generates \`BP/manifest.json\` from these properties.\n\n## UUID policy\n\nPack UUIDs are randomly generated and stored in \`.build/.uuid.json\`. They are intentionally not derived from the add-on ID because Minecraft must treat different released versions as distinct pack identities before Kairo manages them in-world. Do not replace them with deterministic add-on-ID-based UUIDs.\n`;
}

function manifestGenerator() {
  return `import fs from "node:fs";\n\nconst { properties } = await import(new URL("../BP/scripts/properties.js", import.meta.url).href);\nconst uuids = JSON.parse(fs.readFileSync(new URL("./.uuid.json", import.meta.url), "utf8"));\nconst v = properties.header.version;\nconst triple = [v.major, v.minor, v.patch];\nconst engine = properties.header.min_engine_version;\nconst manifest = {\n  format_version: 2,\n  metadata: { ...(properties.metadata ?? {}), generated_with: { kairo: [properties.dependencies?.kairo ?? "unknown"] } },\n  header: { name: properties.header.name, description: properties.header.description, uuid: uuids.bp.header, version: triple, min_engine_version: [engine.major, engine.minor, engine.patch] },\n  modules: [\n    { type: "data", uuid: uuids.bp.module.data, version: triple },\n    { type: "script", language: "javascript", entry: "scripts/index.js", uuid: uuids.bp.module.script, version: triple },\n  ],\n  dependencies: properties.minecraftDependencies ?? [],\n  capabilities: ["script_eval"],\n};\nfs.mkdirSync("BP", { recursive: true });\nfs.writeFileSync("BP/manifest.json", JSON.stringify(manifest, null, 2));\nif (fs.existsSync("pack_icon.png")) fs.copyFileSync("pack_icon.png", "BP/pack_icon.png");\nconsole.log("Generated BP/manifest.json from properties.");\n`;
}

export function buildProjectFiles(form: PropertiesForm, options: ProjectOptions, icon?: Uint8Array): ProjectFile[] {
  const extension = options.language === "typescript" ? "ts" : "js";
  const properties = buildPropertiesObject(form);
  const uuids: UUIDs = {
    bp: { header: crypto.randomUUID(), module: { data: crypto.randomUUID(), script: crypto.randomUUID() } },
    rp: { header: crypto.randomUUID(), modules: { resources: crypto.randomUUID() } },
  };
  const files: ProjectFile[] = [
    { path: `src/properties.${extension}`, data: generatePropertiesSource(form, options.language) },
    { path: `src/index.${extension}`, data: indexSource(options.language) },
    { path: "BP/scripts/properties.js", data: generatePropertiesSource(form, "javascript") },
    { path: "BP/scripts/index.js", data: indexSource("javascript") },
    { path: "BP/manifest.json", data: JSON.stringify(createManifest(properties, uuids), null, 2) + "\n" },
    { path: ".build/.uuid.json", data: JSON.stringify(uuids, null, 2) + "\n" },
  ];
  if (options.packageManager !== "none") {
    files.push({ path: "package.json", data: packageJSON(form, options) });
    if (options.language === "javascript") files.push({ path: ".build/generate-manifest.mjs", data: manifestGenerator() });
  }
  if (options.language === "typescript" && options.packageManager !== "none") files.push({ path: "tsconfig.json", data: tsconfig() });
  if (options.usePrettier && options.packageManager !== "none") {
    files.push({ path: ".prettierrc", data: prettierConfig() }, { path: ".prettierignore", data: prettierIgnore() });
  }
  if (options.useESLint && options.packageManager !== "none") files.push({ path: "eslint.config.js", data: eslintConfig(options.language) });
  if (options.useGitHub) files.push({ path: ".gitignore", data: gitignore(options.packageManager) });
  if (options.includeReadme) files.push({ path: "README.md", data: readme(form, options) });
  if (icon) files.push({ path: "pack_icon.png", data: icon }, { path: "BP/pack_icon.png", data: icon });
  return files;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]); }
function uint32(value: number) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]); }
function join(parts: Uint8Array[]) { const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }

export function createProjectZip(files: ProjectFile[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = join([uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0), uint32(crc), uint32(data.length), uint32(data.length), uint16(name.length), uint16(0), name, data]);
    localParts.push(local);
    centralParts.push(join([uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0), uint32(crc), uint32(data.length), uint32(data.length), uint16(name.length), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), name]));
    offset += local.length;
  }
  const central = join(centralParts);
  const end = join([uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length), uint32(central.length), uint32(offset), uint16(0)]);
  const archive = join([...localParts, central, end]);
  return new Blob([archive.buffer as ArrayBuffer], { type: "application/zip" });
}
