export const minecraftModules = [
  "@minecraft/server",
  "@minecraft/server-ui",
  "@minecraft/server-gametest",
  "@minecraft/server-editor",
  "@minecraft/server-editor-private-bindings",
  "@minecraft/server-net",
  "@minecraft/server-admin",
  "@minecraft/debug-utilities",
  "@minecraft/diagnostics",
  "@minecraft/server-graphics",
] as const;

export type MinecraftModuleType = (typeof minecraftModules)[number];

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
};

type ValidationMessages = {
  idRequired: string;
  idInvalid: string;
  nameRequired: string;
  descriptionRequired: string;
  versionInvalid: string;
  kairoRequired: string;
  databaseRequired: string;
  moduleVersionRequired: string;
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
  engineMinor: 21,
  enginePatch: 0,
  modules: Object.fromEntries(
    minecraftModules.map((moduleName) => [
      moduleName,
      {
        selected: moduleName === "@minecraft/server",
        version: moduleName === "@minecraft/server" ? "2.0.0" : "",
      },
    ]),
  ) as ModuleSelection,
  kairoVersion: "^1.0.0",
  kairoDatabaseVersion: "^1.0.0",
  customTags: "",
};

const idPattern = /^[A-Za-z0-9-]+$/;
const reservedTags = new Set(["official", "approved", "stable", "experimental"]);

export function validatePropertiesForm(form: PropertiesForm, messages: ValidationMessages) {
  const errors: Record<string, string> = {};
  if (!form.id) errors.id = messages.idRequired;
  else if (!idPattern.test(form.id)) errors.id = messages.idInvalid;
  if (!form.name.trim()) errors.name = messages.nameRequired;
  if (!form.description.trim()) errors.description = messages.descriptionRequired;

  const numberFields = [
    ["version", form.versionMajor, form.versionMinor, form.versionPatch],
    ["engine", form.engineMajor, form.engineMinor, form.enginePatch],
  ] as const;
  for (const [key, ...values] of numberFields) {
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      errors[key] = messages.versionInvalid;
    }
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
  return errors;
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
    },
    tags: deriveTags(form),
  };
}

export function generatePropertiesSource(form: PropertiesForm) {
  return `// Generated by kairojs.com\nvar properties = ${JSON.stringify(buildPropertiesObject(form), null, 2)};\n\nexport { properties };\n`;
}
