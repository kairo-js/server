"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { GitHubIcon, GoogleIcon } from "./auth-icons";
import { SiteHeader } from "./site-header";

type User = { id: string; displayName: string };
type Organization = { id: string; slug: string; displayName: string; official: boolean; verified: boolean };
type Membership = { organization: Organization; role: "owner" | "admin" | "member" };
type Addon = { id: string; addonId: string; displayName: string; description: string; owner: { type: "user" | "organization"; slug?: string } };
type PublishedVersion = { version: string; fileName: string; fileSize: number; sha256: string };
type PageState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ready"; user: User; memberships: Membership[] };

export function PublishPage({ locale }: { locale: Locale }) {
  const messages = getDictionary(locale).publish;
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [id, setID] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("user");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState<Addon>();
  const [version, setVersion] = useState("1.0.0");
  const [archive, setArchive] = useState<File>();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<PublishedVersion>();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const meResponse = await fetch("/api/v1/me", { signal: controller.signal, credentials: "same-origin" });
        if (meResponse.status === 401) { setState({ status: "signed-out" }); return; }
        if (!meResponse.ok) throw new Error("account request failed");
        const { user } = (await meResponse.json()) as { user: User };
        const organizationResponse = await fetch("/api/v1/organizations/mine", { signal: controller.signal, credentials: "same-origin" });
        if (!organizationResponse.ok) throw new Error("organization request failed");
        const { memberships } = (await organizationResponse.json()) as { memberships: Membership[] };
        setState({ status: "ready", user, memberships });
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      }
    }
    load();
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state.status !== "ready" || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    const organizationSlug = owner.startsWith("organization:") ? owner.slice("organization:".length) : "";
    try {
      const response = await fetch("/api/v1/addons", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, displayName, description,
          owner: organizationSlug ? { type: "organization", slug: organizationSlug } : { type: "user" },
        }),
      });
      const body = (await response.json()) as { addon?: Addon; error?: { code?: string } };
      if (!response.ok || !body.addon) {
        setSubmitError(messages.errors[body.error?.code ?? "unknown"] ?? messages.errors.unknown);
        return;
      }
      setCreated(body.addon);
    } catch {
      setSubmitError(messages.errors.unknown);
    } finally {
      setSubmitting(false);
    }
  }

  async function publishVersion(event: FormEvent) {
    event.preventDefault();
    if (!created || !archive || publishing) return;
    setPublishing(true); setSubmitError("");
    const data = new FormData(); data.set("version", version); data.set("file", archive);
    try {
      const response = await fetch(`/api/v1/addons/${encodeURIComponent(created.addonId)}/versions`, { method: "POST", credentials: "same-origin", body: data });
      const body = (await response.json().catch(() => ({}))) as { version?: PublishedVersion; error?: { code?: string } };
      if (!response.ok || !body.version) { setSubmitError(messages.errors[body.error?.code ?? "unknown"] ?? messages.errors.unknown); return; }
      setPublished(body.version);
    } catch { setSubmitError(messages.errors.unknown); }
    finally { setPublishing(false); }
  }

  const eligibleMemberships = state.status === "ready"
    ? state.memberships.filter((membership) => membership.role === "owner" || membership.role === "admin")
    : [];

  return <div className="site-shell">
    <SiteHeader locale={locale} showLogin={state.status !== "ready"} />
    <main className="publish-page">
      <header className="publish-intro"><p className="eyebrow">{messages.eyebrow}</p><h1>{messages.title}</h1><p>{messages.description}</p></header>
      {state.status === "loading" && <section className="panel publish-panel"><p className="lead">{messages.loading}</p></section>}
      {state.status === "error" && <section className="panel publish-panel"><h2>{messages.loadError}</h2><p className="notice error">{messages.loadErrorDescription}</p><a className="button secondary" href={`/${locale}/publish`}>{messages.reload}</a></section>}
      {state.status === "signed-out" && <section className="panel publish-panel"><h2>{messages.loginRequired}</h2><p className="lead">{messages.loginDescription}</p><div className="actions">
        <Link className="button provider-large google" href="/api/v1/auth/google"><GoogleIcon className="provider-icon" />{messages.googleLogin}</Link>
        <Link className="button provider-large github" href="/api/v1/auth/github"><GitHubIcon className="provider-icon" />{messages.githubLogin}</Link>
      </div></section>}
      {state.status === "ready" && created && <section className="panel publish-panel publish-success"><span aria-hidden="true">✓</span><p className="eyebrow">{published ? messages.versionPublished : messages.createdEyebrow}</p><h2>{created.displayName}</h2><code>{created.addonId}{published ? `@${published.version}` : ""}</code><p>{messages.createdDescription}</p>
        {!published && <form className="version-upload-form" onSubmit={publishVersion}><div className="publish-fields">
          <label><span>{messages.versionLabel}<b>{messages.required}</b></span><input required value={version} onChange={(event) => setVersion(event.target.value)} pattern="(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?" placeholder="1.0.0" /></label>
          <label><span>{messages.archiveLabel}<b>{messages.required}</b></span><input required type="file" accept=".zip,application/zip" onChange={(event) => setArchive(event.target.files?.[0])} /><small>{messages.archiveHelp}</small></label>
        </div>{submitError && <p className="notice error" role="alert">{submitError}</p>}<button className="button primary" type="submit" disabled={!archive || publishing}>{publishing ? messages.publishingVersion : messages.publishVersion}</button></form>}
        {published && <div className="actions"><a className="button primary" href={`/api/v1/addons/${encodeURIComponent(created.addonId)}/${encodeURIComponent(published.version)}/download`}>{messages.downloadVersion}</a><Link className="button secondary" href={`/${locale}`}>{messages.backHome}</Link></div>}
      </section>}
      {state.status === "ready" && !created && <form className="panel publish-panel addon-registration-form" onSubmit={submit}>
        <section><div><span>01</span><h2>{messages.ownerTitle}</h2><p>{messages.ownerDescription}</p></div><div className="publisher-options">
          <label className={owner === "user" ? "selected" : ""}><input type="radio" name="owner" checked={owner === "user"} onChange={() => setOwner("user")} /><span><b>{state.user.displayName}</b><small>{messages.personalPublisher}</small></span></label>
          {eligibleMemberships.map(({ organization, role }) => <label className={owner === `organization:${organization.slug}` ? "selected" : ""} key={organization.id}><input type="radio" name="owner" checked={owner === `organization:${organization.slug}`} onChange={() => setOwner(`organization:${organization.slug}`)} /><span><b>{organization.displayName}{organization.official && <em>{messages.official}</em>}</b><small>@{organization.slug} · {role}</small></span></label>)}
        </div></section>
        <section><div><span>02</span><h2>{messages.detailsTitle}</h2><p>{messages.detailsDescription}</p></div><div className="publish-fields">
          <label><span>{messages.id}<b>{messages.required}</b></span><input required maxLength={64} pattern="[A-Za-z0-9-]+" value={id} onChange={(event) => setID(event.target.value)} placeholder="my-addon" /><small>{messages.idHelp}</small></label>
          <label><span>{messages.displayName}<b>{messages.required}</b></span><input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="My Add-on" /></label>
          <label className="full"><span>{messages.addonDescription}</span><textarea maxLength={4000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={messages.descriptionPlaceholder} /></label>
        </div></section>
        {submitError && <p className="notice error" role="alert">{submitError}</p>}
        <footer><p>{messages.registrationNotice}</p><button className="button primary" type="submit" disabled={submitting}>{submitting ? messages.submitting : messages.create}</button></footer>
      </form>}
    </main>
  </div>;
}
