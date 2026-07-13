"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "../components/site-header";
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
  const [form, setForm] = useState<PropertiesForm>(initialPropertiesForm);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const errors = useMemo(() => validatePropertiesForm(form), [form]);
  const source = useMemo(() => generatePropertiesSource(form), [form]);
  const tags = useMemo(() => deriveTags(form), [form]);

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
      <SiteHeader />
      <main className="develop-page">
        <header className="develop-intro">
          <p className="eyebrow">DEVELOPMENT SUPPORT</p>
          <h1>Properties Builder</h1>
          <p>フォームを埋めるだけで、Kairoアドオン用の<code>scripts/properties.js</code>を生成できます。ログインは必要ありません。</p>
        </header>

        <div className="builder-layout">
          <form className="properties-form" onSubmit={(event) => event.preventDefault()}>
            <section className="form-section">
              <div className="section-heading"><span>01</span><div><h2>基本情報</h2><p>アドオンを識別する情報です。</p></div></div>
              <label className="form-field">
                <span>アドオンID <b className="required">必須</b></span>
                <input value={form.id} onChange={(event) => update("id", event.target.value)} placeholder="my-addon" aria-invalid={Boolean(visibleError("id"))} />
                <small>A-Z、a-z、0-9、ハイフンのみ使用できます。</small>
                {visibleError("id") && <span className="field-error">{visibleError("id")}</span>}
              </label>
              <label className="form-field">
                <span>表示名 <b className="required">必須</b></span>
                <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="My Add-on" />
                {visibleError("name") && <span className="field-error">{visibleError("name")}</span>}
              </label>
              <label className="form-field full">
                <span>説明 <b className="required">必須</b></span>
                <textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="このアドオンでできること" />
                {visibleError("description") && <span className="field-error">{visibleError("description")}</span>}
              </label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>02</span><div><h2>作者情報</h2><p>空欄の項目は出力されません。</p></div></div>
              <label className="form-field"><span>作者</span><input value={form.authors} onChange={(event) => update("authors", event.target.value)} placeholder="shizuku86, contributor" /><small>複数の場合はカンマで区切ります。</small></label>
              <label className="form-field"><span>URL</span><input type="url" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://example.com" /></label>
              <label className="form-field"><span>ライセンス</span><input value={form.license} onChange={(event) => update("license", event.target.value)} placeholder="MIT" /></label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>03</span><div><h2>バージョン</h2><p>アドオンとMinecraftの互換性を指定します。</p></div></div>
              <VersionFields label="アドオンバージョン" values={[form.versionMajor, form.versionMinor, form.versionPatch]} onChange={(index, value) => updateVersion("version", index, value)} error={visibleError("version")} />
              <div className="inline-fields">
                <label className="form-field"><span>prerelease</span><input value={form.prerelease} onChange={(event) => update("prerelease", event.target.value)} placeholder="beta.1" /></label>
                <label className="form-field"><span>build</span><input value={form.build} onChange={(event) => update("build", event.target.value)} placeholder="20260713" /></label>
              </div>
              <VersionFields label="最低エンジンバージョン" values={[form.engineMajor, form.engineMinor, form.enginePatch]} onChange={(index, value) => updateVersion("engine", index, value)} error={visibleError("engine")} />
            </section>

            <section className="form-section full-section">
              <div className="section-heading"><span>04</span><div><h2>Minecraft依存関係</h2><p>使用するScript APIモジュールを複数選択できます。</p></div></div>
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
              <div className="section-heading"><span>05</span><div><h2>Kairo依存関係</h2><p>必須依存として自動的に追加されます。</p></div></div>
              <label className="form-field"><span>kairo</span><input value={form.kairoVersion} onChange={(event) => update("kairoVersion", event.target.value)} />{visibleError("kairoVersion") && <span className="field-error">{visibleError("kairoVersion")}</span>}</label>
              <label className="form-field"><span>kairo-database</span><input value={form.kairoDatabaseVersion} onChange={(event) => update("kairoDatabaseVersion", event.target.value)} />{visibleError("kairoDatabaseVersion") && <span className="field-error">{visibleError("kairoDatabaseVersion")}</span>}</label>
            </section>

            <section className="form-section">
              <div className="section-heading"><span>06</span><div><h2>タグ</h2><p>システムタグは依存関係から自動判定されます。</p></div></div>
              <div className="derived-tags"><span>自動タグ</span>{tags.slice(0, 1).map((tag) => <b className={`tag ${tag}`} key={tag}>{tag}</b>)}</div>
              <label className="form-field full"><span>カスタムタグ</span><input value={form.customTags} onChange={(event) => update("customTags", event.target.value)} placeholder="utility, world-generation" /><small>カンマ区切り。official、approved、stable、experimentalはシステムが管理します。</small></label>
            </section>
          </form>

          <aside className="properties-preview">
            <div className="preview-heading"><div><span>PREVIEW</span><strong>properties.js</strong></div><span className={`validation-badge ${Object.keys(errors).length ? "invalid" : "valid"}`}>{Object.keys(errors).length ? `${Object.keys(errors).length}件の要確認` : "検証OK"}</span></div>
            <pre><code>{source}</code></pre>
            <div className="preview-actions">
              <button className="button secondary" type="button" onClick={copySource}>{copied ? "コピーしました" : "コピー"}</button>
              <button className="button primary" type="button" onClick={downloadSource}>properties.jsを保存</button>
            </div>
            <p className="preview-note">入力内容と生成処理はブラウザ内で完結し、サーバーへ送信されません。</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
