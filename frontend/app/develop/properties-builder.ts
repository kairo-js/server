export const minecraftModules = [
  "@minecraft/server",
  "@minecraft/server-ui",
  "@minecraft/server-gametest",
  "@minecraft/server-editor",
  "@minecraft/server-net",
  "@minecraft/server-admin",
  "@minecraft/debug-utilities",
  "@minecraft/diagnostics",
  "@minecraft/server-graphics",
] as const;

export const minecraftModuleVersions: Partial<Record<MinecraftModuleType, string[]>> = {
  "@minecraft/server": ["2.8.0", "2.7.0", "2.6.0", "2.5.0", "2.4.0", "2.3.0", "2.2.0", "2.1.0", "2.0.0"],
  "@minecraft/server-ui": ["2.1.0", "2.0.0"],
  "@minecraft/server-gametest": ["1.0.0-beta"],
  "@minecraft/server-editor": ["1.0.0-beta"],
  "@minecraft/server-net": ["1.0.0-beta"],
  "@minecraft/server-admin": ["1.0.0-beta"],
  "@minecraft/debug-utilities": ["1.0.0-beta"],
  "@minecraft/diagnostics": ["1.0.0-beta"],
  "@minecraft/server-graphics": ["1.0.0-beta"],
};

export type MinecraftModuleType = (typeof minecraftModules)[number];

export const minecraftModuleGroups = [
  { key: "primary", modules: ["@minecraft/server", "@minecraft/server-ui"] },
  { key: "advanced", modules: ["@minecraft/server-admin", "@minecraft/server-gametest"] },
  { key: "bds", modules: ["@minecraft/server-net"] },
  { key: "experimental", modules: ["@minecraft/server-editor", "@minecraft/debug-utilities", "@minecraft/diagnostics", "@minecraft/server-graphics"] },
] as const satisfies ReadonlyArray<{ key: string; modules: ReadonlyArray<MinecraftModuleType> }>;

export type ModuleSelection = Record<
  MinecraftModuleType,
  { selected: boolean; version: string }
>;

export type PropertiesForm = {
  id: string;
  authors: string;
  url: string;
  license: string;
  name: string;
  description: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  prerelease: string;
  build: string;
  engineMajor: number;
  engineMinor: number;
  enginePatch: number;
  modules: ModuleSelection;
  kairoVersion: string;
  kairoDatabaseVersion: string;
  customTags: string;
  additionalDependencies: Array<{ id: string; version: string }>;
};

type ValidationMessages = {
  idRequired: string;
  idInvalid: string;
  nameRequired: string;
  descriptionRequired: string;
  versionInvalid: string;
  engineVersionInvalid: string;
  kairoRequired: string;
  databaseRequired: string;
  moduleVersionRequired: string;
  dependencyIdRequired: string;
  dependencyIdInvalid: string;
  dependencyVersionRequired: string;
  dependencyReserved: string;
};

export const initialPropertiesForm: PropertiesForm = {
  id: "",
  authors: "",
  url: "",
  license: "",
  name: "",
  description: "",
  versionMajor: 1,
  versionMinor: 0,
  versionPatch: 0,
  prerelease: "",
  build: "",
  engineMajor: 1,
  engineMinor: Math.max(26, new Date().getFullYear() - 2000),
  enginePatch: 0,
  modules: Object.fromEntries(
    minecraftModules.map((moduleName) => [
      moduleName,
      {
        selected: moduleName === "@minecraft/server" || moduleName === "@minecraft/server-ui",
        version: moduleName === "@minecraft/server" ? "2.8.0" : moduleName === "@minecraft/server-ui" ? "2.1.0" : "",
      },
    ]),
  ) as ModuleSelection,
  kairoVersion: "^1.0.0",
  kairoDatabaseVersion: "^1.0.0",
  customTags: "",
  additionalDependencies: [],
};

const idPattern = /^[A-Za-z0-9-]+$/;
const reservedTags = new Set(["official", "approved", "stable", "experimental"]);

export function validatePropertiesForm(form: PropertiesForm, messages: ValidationMessages) {
  const errors: Record<string, string> = {};
  if (!form.id) errors.id = messages.idRequired;
  else if (!idPattern.test(form.id)) errors.id = messages.idInvalid;
  if (!form.name.trim()) errors.name = messages.nameRequired;

  const numberFields = [["version", form.versionMajor, form.versionMinor, form.versionPatch]] as const;
  for (const [key, ...values] of numberFields) {
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      errors[key] = messages.versionInvalid;
    }
  }
  if (form.engineMajor !== 1 || !availableEngineMinors().includes(form.engineMinor) || !Number.isInteger(form.enginePatch) || form.enginePatch < 0) {
    errors.engine = messages.engineVersionInvalid;
  }

  if (!form.kairoVersion.trim()) errors.kairoVersion = messages.kairoRequired;
  if (!form.kairoDatabaseVersion.trim()) {
    errors.kairoDatabaseVersion = messages.databaseRequired;
  }
  for (const moduleName of minecraftModules) {
    const selection = form.modules[moduleName];
    if (selection.selected && !selection.version.trim()) {
      errors[`module:${moduleName}`] = messages.moduleVersionRequired;
    }
  }
  form.additionalDependencies.forEach((dependency, index) => {
    const id = dependency.id.trim();
    if (!id) errors[`dependency:${index}:id`] = messages.dependencyIdRequired;
    else if (!idPattern.test(id)) errors[`dependency:${index}:id`] = messages.dependencyIdInvalid;
    else if (id === "kairo" || id === "kairo-database") errors[`dependency:${index}:id`] = messages.dependencyReserved;
    if (!dependency.version.trim()) errors[`dependency:${index}:version`] = messages.dependencyVersionRequired;
  });
  return errors;
}

export function availableEngineMinors(date = new Date()) {
  const current = Math.max(26, date.getFullYear() - 2000);
  return current === 26 ? [26] : [current - 1, current];
}

export function deriveTags(form: PropertiesForm) {
  const selectedVersions = minecraftModules
    .filter((moduleName) => form.modules[moduleName].selected)
    .map((moduleName) => form.modules[moduleName].version);
  const releaseTag = selectedVersions.some((version) => /beta/i.test(version))
    ? "experimental"
    : "stable";
  const customTags = form.customTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag && !reservedTags.has(tag.toLowerCase()));
  return [releaseTag, ...new Set(customTags)];
}

export function buildPropertiesObject(form: PropertiesForm) {
  const authors = form.authors.split(",").map((author) => author.trim()).filter(Boolean);
  const metadata = {
    ...(authors.length ? { authors } : {}),
    ...(form.url.trim() ? { url: form.url.trim() } : {}),
    ...(form.license.trim() ? { license: form.license.trim() } : {}),
  };
  const minecraftDependencies = minecraftModules
    .filter((moduleName) => form.modules[moduleName].selected)
    .map((moduleName) => ({ module_name: moduleName, version: form.modules[moduleName].version.trim() }));

  return {
    id: form.id,
    ...(Object.keys(metadata).length ? { metadata } : {}),
    header: {
      name: form.name.trim(),
      description: form.description.trim(),
      version: {
        major: form.versionMajor,
        minor: form.versionMinor,
        patch: form.versionPatch,
        ...(form.prerelease.trim() ? { prerelease: form.prerelease.trim() } : {}),
        ...(form.build.trim() ? { build: form.build.trim() } : {}),
      },
      min_engine_version: {
        major: form.engineMajor,
        minor: form.engineMinor,
        patch: form.enginePatch,
      },
    },
    ...(minecraftDependencies.length ? { minecraftDependencies } : {}),
    dependencies: {
      kairo: form.kairoVersion.trim(),
      "kairo-database": form.kairoDatabaseVersion.trim(),
      ...Object.fromEntries(form.additionalDependencies.map((dependency) => [dependency.id.trim(), dependency.version.trim()])),
    },
    tags: deriveTags(form),
  };
}

export function generatePropertiesSource(form: PropertiesForm, language: "javascript" | "typescript" = "javascript") {
  const declaration = language === "typescript"
    ? 'import type { AddonProperties } from "@kairo-js/properties";\n\nexport const properties: AddonProperties = '
    : "export const properties = ";
  return `// Generated by kairojs.com\n${declaration}${JSON.stringify(buildPropertiesObject(form), null, 2)};\n`;
}
