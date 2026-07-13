"use client";

import { useSearchParams } from "next/navigation";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { SiteHeader } from "./site-header";

export function HomePage({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  const messages = getDictionary(locale).home;

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
              <a className="text-link" href={`/${locale}/account`}>{messages.publishAddon} <span aria-hidden="true">→</span></a>
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
          <div className="empty-registry">
            <span className="empty-icon" aria-hidden="true">◇</span>
            <strong>{messages.registryPreparing}</strong>
            <p>{messages.registrySoon}</p>
          </div>
        </section>
      </main>
      <footer className="site-footer"><span>Kairo</span><span>{messages.footerDescription}</span></footer>
    </div>
  );
}
