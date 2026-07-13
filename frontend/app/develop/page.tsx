"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { SiteHeader } from "../components/site-header";
import { normalizeLocale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import {
  deriveTags,
  generatePropertiesSource,
  initialPropertiesForm,
  minecraftModules,
  validatePropertiesForm,
  type MinecraftModuleType,
  type PropertiesForm,
} from "./properties-builder";

function VersionFields({
  label,
  values,
  onChange,
  error,
}: {
  label: string;
  values: [number, number, number];
  onChange: (index: number, value: number) => void;
  error?: string;
}) {
  return (
    <fieldset className="form-field">
      <legend>{label}<span className="required">必須</span></legend>
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
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const errors = validatePropertiesForm(form, dictionary.validation);
  const source = generatePropertiesSource(form);
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

  function updateVersion(prefix: "version" | "engine", index: number, value: number) {
    const keys = prefix === "version"
      ? (["versionMajor", "versionMinor", "versionPatch"] as const)
      : (["engineMajor", "engineMinor", "enginePatch"] as const);
    update(keys[index], value);
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

  function downloadSource() {
    if (Object.keys(errors).length) {
      setSubmitted(true);
      return;
    }
    const blob = new Blob([source], { type: "text/javascript;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "properties.js";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  const visibleError = (key: string) => submitted ? errors[key] : undefined;

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} />
      <main className="develop-page">
        <header className="develop-intro">
          <p className="eyebrow">{messages.eyebrow}</p>
          <h1>{messages.title}</h1>
          <p>{messages.introBefore} <code>{messages.introFile}</code> {messages.introAfter}</p>
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
                <span>{messages.description} <b className="required">{messages.required}</b></span>
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
              <VersionFields label={messages.addonVersion} values={[form.versionMajor, form.versionMinor, form.versionPatch]} onChange={(index, value) => updateVersion("version", index, value)} error={visibleError("version")} />
              <div className="inline-fields">
                <label className="form-field"><span>{messages.prerelease}</span><input value={form.prerelease} onChange={(event) => update("prerelease", event.target.value)} placeholder="beta.1" /></label>
                <label className="form-field"><span>{messages.build}</span><input value={form.build} onChange={(event) => update("build", event.target.value)} placeholder="20260713" /></label>
              </div>
              <VersionFields label={messages.engineVersion} values={[form.engineMajor, form.engineMinor, form.enginePatch]} onChange={(index, value) => updateVersion("engine", index, value)} error={visibleError("engine")} />
            </section>

            <section className="form-section full-section">
              <div className="section-heading"><span>04</span><div><h2>{messages.minecraftTitle}</h2><p>{messages.minecraftDescription}</p></div></div>
              <div className="module-list">
                {minecraftModules.map((moduleName) => {
                  const selection = form.modules[moduleName];
                  return (
                    <div className={`module-row ${selection.selected ? "selected" : ""}`} key={moduleName}>
                      <label className="module-check"><input type="checkbox" checked={selection.selected} onChange={(event) => updateModule(moduleName, { selected: event.target.checked })} /><span>{moduleName}</span></label>
                      <input aria-label={`${moduleName} version`} disabled={!selection.selected} value={selection.version} onChange={(event) => updateModule(moduleName, { version: event.target.value })} placeholder="2.0.0" />
                      {visibleError(`module:${moduleName}`) && <span className="field-error module-error">{visibleError(`module:${moduleName}`)}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>05</span><div><h2>{messages.kairoTitle}</h2><p>{messages.kairoDescription}</p></div></div>
              <label className="form-field"><span>kairo</span><input value={form.kairoVersion} onChange={(event) => update("kairoVersion", event.target.value)} />{visibleError("kairoVersion") && <span className="field-error">{visibleError("kairoVersion")}</span>}</label>
              <label className="form-field"><span>kairo-database</span><input value={form.kairoDatabaseVersion} onChange={(event) => update("kairoDatabaseVersion", event.target.value)} />{visibleError("kairoDatabaseVersion") && <span className="field-error">{visibleError("kairoDatabaseVersion")}</span>}</label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>06</span><div><h2>{messages.tagsTitle}</h2><p>{messages.tagsDescription}</p></div></div>
              <div className="derived-tags"><span>{messages.automaticTag}</span>{tags.slice(0, 1).map((tag) => <b className={`tag ${tag}`} key={tag}>{tag}</b>)}</div>
              <label className="form-field full"><span>{messages.customTags}</span><input value={form.customTags} onChange={(event) => update("customTags", event.target.value)} placeholder={messages.customTagsPlaceholder} /><small>{messages.customTagsHelp}</small></label>
            </section>
          </form>

          <aside className="properties-preview">
            <div className="preview-heading"><div><span>{messages.preview}</span><strong>properties.js</strong></div><span className={`validation-badge ${Object.keys(errors).length ? "invalid" : "valid"}`}>{Object.keys(errors).length ? messages.needsReview(Object.keys(errors).length) : messages.validationOk}</span></div>
            <pre><code>{source}</code></pre>
            <div className="preview-actions">
              <button className="button secondary" type="button" onClick={copySource}>{copied ? messages.copied : messages.copy}</button>
              <button className="button primary" type="button" onClick={downloadSource}>{messages.save}</button>
            </div>
            <p className="preview-note">{messages.privacy}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
