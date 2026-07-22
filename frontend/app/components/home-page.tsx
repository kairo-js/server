"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { SiteHeader } from "./site-header";

export function HomePage({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  const messages = getDictionary(locale).home;
  type Addon = { addonId: string; displayName: string; description: string; owner: { type: string; slug?: string } };
  type Version = { version: string; prerelease: boolean; downloadUrl: string };
  type RegistryAddon = Addon & { latest: Version | null };
  const [registry, setRegistry] = useState<{ status: "loading" | "ready" | "error"; addons: RegistryAddon[] }>({ status: "loading", addons: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/addons", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("list failed");
        const body = (await response.json()) as { addons: Addon[] };
        const addons = await Promise.all(body.addons.map(async (addon) => {
          const latestResponse = await fetch(`/api/v1/addons/${encodeURIComponent(addon.addonId)}/versions/latest`, { signal: controller.signal });
          if (latestResponse.status === 404) return { ...addon, latest: null };
          if (!latestResponse.ok) throw new Error("latest failed");
          const latestBody = (await latestResponse.json()) as { version: Version };
          return { ...addon, latest: latestBody.version };
        }));
        setRegistry({ status: "ready", addons });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRegistry({ status: "error", addons: [] });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{messages.eyebrow}</p>
            <h1>{messages.titleLine1}<br />{messages.titleLine2}</h1>
            <p className="hero-lead">{messages.lead}</p>
            <div className="hero-actions">
              <a className="button primary" href="#addons">{messages.findAddons}</a>
              <a className="text-link" href={`/${locale}/publish`}>{messages.publishAddon} <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-cube">K</div>
            <span className="code-chip chip-one">kairo add</span>
            <span className="code-chip chip-two">verified ✓</span>
          </div>
        </section>

        {authError && <p className="notice error page-notice" role="alert">{messages.authError}</p>}

        <section className="registry-section" id="addons">
          <div><p className="eyebrow">{messages.registryEyebrow}</p><h2>{messages.registryTitle}</h2></div>
          <p className="section-description">{messages.registryDescription}</p>
          {registry.status === "loading" && <div className="empty-registry">
            <span className="empty-icon" aria-hidden="true">◇</span>
            <strong>{messages.registryLoading}</strong>
          </div>}
          {registry.status === "error" && <div className="empty-registry"><strong>{messages.registryError}</strong></div>}
          {registry.status === "ready" && registry.addons.length === 0 && <div className="empty-registry"><strong>{messages.noPublishedAddons}</strong></div>}
          {registry.status === "ready" && registry.addons.length > 0 && <div className="addon-grid">
            {registry.addons.map((addon) => <article className="addon-card" key={addon.addonId}>
              <div className="addon-card-heading"><div><h3>{addon.displayName}</h3><code>{addon.addonId}</code></div>{addon.latest?.prerelease && <span>{messages.prerelease}</span>}</div>
              <p>{addon.description}</p>
              <dl><div><dt>{messages.latestVersion}</dt><dd>{addon.latest?.version ?? "—"}</dd></div>{addon.owner.slug && <div><dt>{messages.owner}</dt><dd>{addon.owner.slug}</dd></div>}</dl>
              {addon.latest && <a className="button primary" href={addon.latest.downloadUrl}>{messages.download}</a>}
            </article>)}
          </div>}
        </section>
      </main>
      <footer className="site-footer"><span>Kairo</span><span>{messages.footerDescription}</span></footer>
    </div>
  );
}
