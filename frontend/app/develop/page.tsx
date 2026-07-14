"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { SiteHeader } from "../components/site-header";
import { normalizeLocale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import {
  deriveTags,
  availableEngineMinors,
  generatePropertiesSource,
  initialPropertiesForm,
  minecraftModules,
  minecraftModuleVersions,
  validatePropertiesForm,
  type MinecraftModuleType,
  type PropertiesForm,
} from "./properties-builder";
import {
  buildProjectFiles,
  createProjectZip,
  type PackageManager,
  type ProjectOptions,
  type SourceLanguage,
} from "./project-builder";

function VersionFields({
  label,
  values,
  onChange,
  error,
  requiredLabel,
}: {
  label: string;
  values: [number, number, number];
  onChange: (index: number, value: number) => void;
  error?: string;
  requiredLabel: string;
}) {
  return (
    <fieldset className="form-field">
      <legend>{label}<span className="required">{requiredLabel}</span></legend>
      <div className="version-fields">
        {["major", "minor", "patch"].map((part, index) => (
          <label key={part}>
            <span>{part}</span>
            <input type="number" min="0" step="1" value={values[index]} onChange={(event) => onChange(index, Number(event.target.value))} />
          </label>
        ))}
      </div>
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  );
}

export default function DevelopPage() {
  const params = useParams<{ locale?: string }>();
  const locale = normalizeLocale(params.locale);
  const dictionary = getDictionary(locale);
  const messages = dictionary.develop;
  const [form, setForm] = useState<PropertiesForm>(initialPropertiesForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [options, setOptions] = useState<ProjectOptions>({
    language: "typescript", runtime: "node", useGitHub: true, packageManager: "pnpm",
    usePrettier: true, useESLint: true, includeReadme: true,
  });
  const [packIcon, setPackIcon] = useState<File>();
  const [packIconPreview, setPackIconPreview] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const errors = validatePropertiesForm(form, dictionary.validation);
  const source = generatePropertiesSource(form, options.language);
  const tags = deriveTags(form);

  function update<K extends keyof PropertiesForm>(key: K, value: PropertiesForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateModule(moduleName: MinecraftModuleType, patch: Partial<PropertiesForm["modules"][MinecraftModuleType]>) {
    setForm((current) => ({
      ...current,
      modules: { ...current.modules, [moduleName]: { ...current.modules[moduleName], ...patch } },
    }));
  }

  function updateAdditionalDependency(index: number, patch: Partial<PropertiesForm["additionalDependencies"][number]>) {
    setForm((current) => ({
      ...current,
      additionalDependencies: current.additionalDependencies.map((dependency, dependencyIndex) =>
        dependencyIndex === index ? { ...dependency, ...patch } : dependency),
    }));
  }

  function removeAdditionalDependency(index: number) {
    setForm((current) => ({ ...current, additionalDependencies: current.additionalDependencies.filter((_, dependencyIndex) => dependencyIndex !== index) }));
  }

  function selectPackIcon(file?: File) {
    setPackIcon(file);
    if (!file) { setPackIconPreview(undefined); return; }
    const reader = new FileReader();
    reader.onload = () => setPackIconPreview(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  function updateVersion(prefix: "version" | "engine", index: number, value: number) {
    const keys = prefix === "version"
      ? (["versionMajor", "versionMinor", "versionPatch"] as const)
      : (["engineMajor", "engineMinor", "enginePatch"] as const);
    update(keys[index], value);
  }

  function selectLanguage(language: SourceLanguage) {
    const advancedDefaults = language === "typescript";
    setOptions((current) => ({
      ...current,
      language,
      useGitHub: true,
      packageManager: advancedDefaults ? "pnpm" : "none",
      usePrettier: advancedDefaults,
      useESLint: advancedDefaults,
    }));
  }

  function selectPackageManager(packageManager: PackageManager) {
    setOptions((current) => ({
      ...current,
      packageManager,
      ...(packageManager === "none" ? { usePrettier: false, useESLint: false } : {}),
    }));
  }

  async function copySource() {
    if (Object.keys(errors).length) {
      setSubmitted(true);
      return;
    }
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function downloadProject() {
    if (Object.keys(errors).length) {
      setSubmitted(true);
      return;
    }
    const icon = packIcon ? new Uint8Array(await packIcon.arrayBuffer()) : undefined;
    const blob = createProjectZip(buildProjectFiles(form, options, icon));
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${form.id || "kairo-addon"}.zip`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  const visibleError = (key: string) => submitted ? errors[key] : undefined;

  if (step === 1) {
    return (
      <div className="site-shell">
        <SiteHeader locale={locale} />
        <main className="develop-page wizard-page">
          <div className="wizard-steps"><span className="active">1<span>{messages.stepEnvironment}</span></span><i /><span>2<span>{messages.stepAddon}</span></span></div>
          <header className="develop-intro compact"><p className="eyebrow">{messages.eyebrow}</p><h1>{messages.environmentTitle}</h1><p>{messages.environmentDescription}</p></header>
          <div className="environment-form">
            <section className="choice-section">
              <div className="section-heading"><span>01</span><div><h2>{messages.languageQuestion}</h2></div></div>
              <div className="choice-grid two">
                {(["javascript", "typescript"] as SourceLanguage[]).map((language) => (
                  <label className={`choice-card ${options.language === language ? "selected" : ""}`} key={language}>
                    <input type="radio" name="language" checked={options.language === language} onChange={() => selectLanguage(language)} />
                    <b>{language === "javascript" ? messages.javascript : messages.typescript}</b>
                    <span>{language === "javascript" ? messages.javascriptDescription : messages.typescriptDescription}</span>
                    <code>{language === "javascript" ? "JS" : "TS"}</code>
                  </label>
                ))}
              </div>
            </section>
            <section className="choice-section">
              <div className="section-heading"><span>02</span><div><h2>{messages.runtimeQuestion}</h2><p>{messages.runtimeDescription}</p></div></div>
              <div className="choice-grid two">
                <label className="choice-card selected"><input type="radio" name="runtime" checked readOnly /><b>{messages.nodeRuntime}</b><span>{messages.nodeDescription}</span><code>Node</code></label>
                <div className="choice-card disabled"><b>{messages.otherRuntimes}</b><span>{messages.otherRuntimesDescription}</span><code>Later</code></div>
              </div>
            </section>
            <section className="choice-section">
              <div className="section-heading"><span>03</span><div><h2>{messages.githubQuestion}</h2></div></div>
              <div className="choice-grid two">
                <label className={`choice-card ${options.useGitHub ? "selected" : ""}`}><input type="radio" name="github" checked={options.useGitHub} onChange={() => setOptions((current) => ({ ...current, useGitHub: true }))} /><b>{messages.useGitHub}</b><span>{messages.useGitHubDescription}</span><code>Git</code></label>
                <label className={`choice-card ${!options.useGitHub ? "selected" : ""}`}><input type="radio" name="github" checked={!options.useGitHub} onChange={() => setOptions((current) => ({ ...current, useGitHub: false }))} /><b>{messages.noGitHub}</b><span>{messages.noGitHubDescription}</span><code>—</code></label>
              </div>
            </section>
            <section className="choice-section">
              <div className="section-heading"><span>04</span><div><h2>{messages.packageQuestion}</h2><p>{messages.packageDescription}</p></div></div>
              <div className="choice-grid three">
                {(["npm", "pnpm", "none"] as PackageManager[]).map((manager) => (
                  <label className={`choice-card compact-card ${options.packageManager === manager ? "selected" : ""}`} key={manager}>
                    <input type="radio" name="manager" checked={options.packageManager === manager} onChange={() => selectPackageManager(manager)} />
                    <b>{manager === "none" ? messages.noPackageManager : manager}</b><code>{manager === "none" ? "—" : manager.slice(0, 2)}</code>
                  </label>
                ))}
              </div>
              {options.packageManager === "none" && <p className="choice-warning">{messages.noManagerWarning}</p>}
            </section>
            <section className="choice-section">
              <div className="section-heading"><span>05</span><div><h2>{messages.toolingQuestion}</h2><p>{messages.toolingDescription}</p></div></div>
              <div className="choice-grid two">
                <label className={`choice-card ${options.usePrettier ? "selected" : ""} ${options.packageManager === "none" ? "disabled" : ""}`}>
                  <input type="checkbox" checked={options.usePrettier} disabled={options.packageManager === "none"} onChange={(event) => setOptions((current) => ({ ...current, usePrettier: event.target.checked }))} />
                  <b>Prettier</b><span>{messages.prettierDescription}</span><code>Format</code>
                </label>
                <label className={`choice-card ${options.useESLint ? "selected" : ""} ${options.packageManager === "none" ? "disabled" : ""}`}>
                  <input type="checkbox" checked={options.useESLint} disabled={options.packageManager === "none"} onChange={(event) => setOptions((current) => ({ ...current, useESLint: event.target.checked }))} />
                  <b>ESLint</b><span>{messages.eslintDescription}</span><code>Lint</code>
                </label>
              </div>
              {options.packageManager === "none" && <p className="choice-warning">{messages.toolingRequiresManager}</p>}
            </section>
            <div className="wizard-navigation"><button className="button primary" type="button" onClick={() => setStep(2)}>{messages.continue} <span aria-hidden="true">→</span></button></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} />
      <main className="develop-page">
        <div className="wizard-steps"><span className="done">1<span>{messages.stepEnvironment}</span></span><i /><span className="active">2<span>{messages.stepAddon}</span></span></div>
        <header className="develop-intro">
          <p className="eyebrow">{messages.eyebrow}</p>
          <h1>{messages.title}</h1>
          <p>{messages.introBefore} <code>src/properties.{options.language === "typescript" ? "ts" : "js"}</code> {messages.introAfter}</p>
          <button className="back-link" type="button" onClick={() => setStep(1)}>← {messages.back}</button>
        </header>

        <div className="builder-layout">
          <form className="properties-form" onSubmit={(event) => event.preventDefault()}>
            <section className="form-section">
              <div className="section-heading"><span>01</span><div><h2>{messages.basicTitle}</h2><p>{messages.basicDescription}</p></div></div>
              <label className="form-field">
                <span>{messages.id} <b className="required">{messages.required}</b></span>
                <input value={form.id} onChange={(event) => update("id", event.target.value)} placeholder={messages.idPlaceholder} aria-invalid={Boolean(visibleError("id"))} />
                <small>{messages.idHelp}</small>
                {visibleError("id") && <span className="field-error">{visibleError("id")}</span>}
              </label>
              <label className="form-field">
                <span>{messages.displayName} <b className="required">{messages.required}</b></span>
                <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={messages.displayNamePlaceholder} />
                {visibleError("name") && <span className="field-error">{visibleError("name")}</span>}
              </label>
              <label className="form-field full">
                <span>{messages.description}</span>
                <textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={messages.descriptionPlaceholder} />
                {visibleError("description") && <span className="field-error">{visibleError("description")}</span>}
              </label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>02</span><div><h2>{messages.authorTitle}</h2><p>{messages.authorDescription}</p></div></div>
              <label className="form-field"><span>{messages.authors}</span><input value={form.authors} onChange={(event) => update("authors", event.target.value)} placeholder={messages.authorsPlaceholder} /><small>{messages.authorsHelp}</small></label>
              <label className="form-field"><span>{messages.url}</span><input type="url" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://example.com" /></label>
              <label className="form-field"><span>{messages.license}</span><input value={form.license} onChange={(event) => update("license", event.target.value)} placeholder="MIT" /></label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>03</span><div><h2>{messages.versionTitle}</h2><p>{messages.versionDescription}</p></div></div>
              <VersionFields label={messages.addonVersion} requiredLabel={messages.required} values={[form.versionMajor, form.versionMinor, form.versionPatch]} onChange={(index, value) => updateVersion("version", index, value)} error={visibleError("version")} />
              <div className="inline-fields">
                <label className="form-field"><span>{messages.prerelease}</span><input value={form.prerelease} onChange={(event) => update("prerelease", event.target.value)} placeholder="beta.1" /></label>
                <label className="form-field"><span>{messages.build}</span><input value={form.build} onChange={(event) => update("build", event.target.value)} placeholder="20260713" /></label>
              </div>
              <fieldset className="form-field">
                <legend>{messages.engineVersion}<span className="required">{messages.required}</span></legend>
                <div className="engine-version-fields">
                  <label><span>major</span><input value="1" readOnly /></label>
                  <label><span>year</span><select value={form.engineMinor} onChange={(event) => update("engineMinor", Number(event.target.value))}>{availableEngineMinors().map((minor) => <option value={minor} key={minor}>1.{minor}</option>)}</select></label>
                  <label><span>patch</span><input type="number" min="0" step="1" value={form.enginePatch} onChange={(event) => update("enginePatch", Number(event.target.value))} /></label>
                </div>
                {visibleError("engine") && <span className="field-error">{visibleError("engine")}</span>}
              </fieldset>
            </section>

            <section className="form-section full-section">
              <div className="section-heading"><span>04</span><div><h2>{messages.minecraftTitle}</h2><p>{messages.minecraftDescription}</p></div></div>
              <div className="module-list">
                {minecraftModules.map((moduleName) => {
                  const selection = form.modules[moduleName];
                  return (
                    <div className={`module-row ${selection.selected ? "selected" : ""}`} key={moduleName}>
                      <label className="module-check"><input type="checkbox" checked={selection.selected} onChange={(event) => updateModule(moduleName, { selected: event.target.checked })} /><span>{moduleName}</span></label>
                      <input list={`versions-${moduleName.replaceAll(/[^a-z]/gi, "-")}`} aria-label={`${moduleName} version`} disabled={!selection.selected} value={selection.version} onChange={(event) => updateModule(moduleName, { version: event.target.value })} placeholder="2.0.0" />
                      <datalist id={`versions-${moduleName.replaceAll(/[^a-z]/gi, "-")}`}>{(minecraftModuleVersions[moduleName] ?? []).map((version) => <option value={version} key={version} />)}</datalist>
                      {visibleError(`module:${moduleName}`) && <span className="field-error module-error">{visibleError(`module:${moduleName}`)}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>05</span><div><h2>{messages.kairoTitle}</h2><p>{messages.kairoDescription}</p></div></div>
              <div className="locked-dependency"><span>kairo</span><code>{form.kairoVersion}</code><b>LOCKED</b></div>
              <div className="locked-dependency"><span>kairo-database</span><code>{form.kairoDatabaseVersion}</code><b>LOCKED</b></div>
              <div className="additional-dependencies">
                {form.additionalDependencies.map((dependency, index) => (
                  <div className="dependency-row" key={index}>
                    <label><span>{messages.dependencyId}</span><input value={dependency.id} onChange={(event) => updateAdditionalDependency(index, { id: event.target.value })} placeholder="my-library" />{visibleError(`dependency:${index}:id`) && <small className="field-error">{visibleError(`dependency:${index}:id`)}</small>}</label>
                    <label><span>{messages.dependencyVersion}</span><input value={dependency.version} onChange={(event) => updateAdditionalDependency(index, { version: event.target.value })} placeholder="^1.0.0" />{visibleError(`dependency:${index}:version`) && <small className="field-error">{visibleError(`dependency:${index}:version`)}</small>}</label>
                    <button type="button" onClick={() => removeAdditionalDependency(index)} aria-label={messages.removeDependency}>×</button>
                  </div>
                ))}
                <button className="add-dependency" type="button" onClick={() => update("additionalDependencies", [...form.additionalDependencies, { id: "", version: "" }])}>＋ {messages.addDependency}</button>
              </div>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>06</span><div><h2>{messages.tagsTitle}</h2><p>{messages.tagsDescription}</p></div></div>
              <div className="derived-tags"><span>{messages.automaticTag}</span>{tags.slice(0, 1).map((tag) => <b className={`tag ${tag}`} key={tag}>{tag}</b>)}</div>
              <label className="form-field full"><span>{messages.customTags}</span><input value={form.customTags} onChange={(event) => update("customTags", event.target.value)} placeholder={messages.customTagsPlaceholder} /><small>{messages.customTagsHelp}</small></label>
            </section>

            <section className="form-section project-settings">
              <div className="section-heading"><span>07</span><div><h2>{messages.projectSettings}</h2><p>{messages.manifestNotice}</p></div></div>
              <label className="file-picker">
                <span><b>{messages.packIcon}</b><small>{messages.packIconHelp}</small></span>
                <input type="file" accept="image/png" onChange={(event) => selectPackIcon(event.target.files?.[0])} />
                <em>{packIcon?.name ?? messages.chooseIcon}</em>
              </label>
              {packIconPreview && <div className="pack-icon-preview"><Image src={packIconPreview} alt={messages.packIconPreview} width={144} height={144} unoptimized /><span>{messages.packIconPreview}</span></div>}
              <label className="toggle-row">
                <span><b>{messages.readme}</b><small>{messages.readmeDescription}</small></span>
                <input type="checkbox" checked={options.includeReadme} onChange={(event) => setOptions((current) => ({ ...current, includeReadme: event.target.checked }))} />
              </label>
            </section>
          </form>

          <aside className="properties-preview">
            <div className="preview-heading"><div><span>{messages.preview}</span><strong>properties.{options.language === "typescript" ? "ts" : "js"}</strong></div><span className={`validation-badge ${Object.keys(errors).length ? "invalid" : "valid"}`}>{Object.keys(errors).length ? messages.needsReview(Object.keys(errors).length) : messages.validationOk}</span></div>
            <pre><code>{source}</code></pre>
            <div className="generated-files"><b>{messages.generatedFiles}</b><span>src/ · BP/manifest.json · BP/scripts/ {options.packageManager !== "none" && "· package.json "}{options.usePrettier && "· Prettier "}{options.useESLint && "· ESLint "}{options.useGitHub && "· .gitignore "}{options.includeReadme && "· README.md"}</span></div>
            <div className="preview-actions">
              <button className="button secondary" type="button" onClick={copySource}>{copied ? messages.copied : messages.copy}</button>
              <button className="button primary" type="button" onClick={downloadProject}>{messages.downloadProject}</button>
            </div>
            <p className="preview-note">{messages.privacy}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
