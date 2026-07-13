"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { GitHubIcon, GoogleIcon } from "./auth-icons";
import { SiteHeader } from "./site-header";

type User = { id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: string };
type AccountState = { status: "loading" } | { status: "signed-out" } | { status: "error" } | { status: "signed-in"; user: User };

export function AccountPage({ locale }: { locale: Locale }) {
  const [account, setAccount] = useState<AccountState>({ status: "loading" });
  const messages = getDictionary(locale).account;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) { setAccount({ status: "signed-out" }); return; }
        if (!response.ok) throw new Error("request failed");
        const body = (await response.json()) as { user: User };
        setAccount({ status: "signed-in", user: body.user });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccount({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  async function logout() {
    const response = await fetch("/api/v1/logout", { method: "POST", credentials: "same-origin" });
    if (response.ok) window.location.href = `/${locale}`;
    else setAccount({ status: "error" });
  }

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} showLogin={false} />
      <main className="account-page"><section className="panel auth-panel">
        <p className="eyebrow">{messages.eyebrow}</p>
        {account.status === "loading" && <p className="lead">{messages.loading}</p>}
        {account.status === "signed-out" && <>
          <h1 className="compact-heading">{messages.loginRequired}</h1><p className="lead">{messages.loginDescription}</p>
          <div className="actions">
            <Link className="button provider-large google" href="/api/v1/auth/google"><GoogleIcon className="provider-icon" />{messages.googleLogin}</Link>
            <Link className="button provider-large github" href="/api/v1/auth/github"><GitHubIcon className="provider-icon" />{messages.githubLogin}</Link>
            <Link className="button secondary" href={`/${locale}`}>{messages.backHome}</Link>
          </div>
        </>}
        {account.status === "error" && <>
          <h1 className="compact-heading">{messages.loadError}</h1><p className="notice error" role="alert">{messages.loadErrorDescription}</p>
          <div className="actions"><a className="button secondary" href={`/${locale}/account`}>{messages.reload}</a></div>
        </>}
        {account.status === "signed-in" && <>
          <h1 className="compact-heading">{account.user.displayName}</h1>
          <dl className="account-details"><div><dt>{messages.email}</dt><dd>{account.user.email}</dd></div><div><dt>{messages.userId}</dt><dd className="monospace">{account.user.id}</dd></div></dl>
          <div className="actions"><button className="button secondary" type="button" onClick={logout}>{messages.logout}</button></div>
        </>}
      </section></main>
    </div>
  );
}
