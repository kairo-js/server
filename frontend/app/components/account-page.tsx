"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { GitHubIcon, GoogleIcon } from "./auth-icons";
import { SiteHeader } from "./site-header";

type User = { id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: string };
type APIToken = { id: string; name: string; lastUsedAt: string | null; expiresAt: string | null; createdAt: string };
type AccountState = { status: "loading" } | { status: "signed-out" } | { status: "error" } | { status: "signed-in"; user: User };

export function AccountPage({ locale }: { locale: Locale }) {
  const [account, setAccount] = useState<AccountState>({ status: "loading" });
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [tokenName, setTokenName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [copied, setCopied] = useState(false);
  const messages = getDictionary(locale).account;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) { setAccount({ status: "signed-out" }); return; }
        if (!response.ok) throw new Error("request failed");
        const body = (await response.json()) as { user: User };
        setAccount({ status: "signed-in", user: body.user });
        const tokensResponse = await fetch("/api/v1/tokens", { signal: controller.signal, credentials: "same-origin" });
        if (!tokensResponse.ok) throw new Error("token request failed");
        const tokensBody = (await tokensResponse.json()) as { tokens: APIToken[] };
        setTokens(tokensBody.tokens);
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

  async function createToken(event: React.FormEvent) {
    event.preventDefault();
    if (!tokenName.trim()) return;
    setTokenBusy(true); setTokenError(false); setNewToken(null); setCopied(false);
    try {
      const response = await fetch("/api/v1/tokens", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tokenName }) });
      if (!response.ok) throw new Error("create failed");
      const body = (await response.json()) as { token: string; metadata: APIToken };
      setTokens((current) => [body.metadata, ...current]);
      setNewToken(body.token); setTokenName("");
    } catch { setTokenError(true); } finally { setTokenBusy(false); }
  }

  async function revokeToken(id: string) {
    setTokenBusy(true); setTokenError(false);
    try {
      const response = await fetch(`/api/v1/tokens/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("revoke failed");
      setTokens((current) => current.filter((token) => token.id !== id));
    } catch { setTokenError(true); } finally { setTokenBusy(false); }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
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
          <section className="token-section">
            <h2>{messages.tokensTitle}</h2><p>{messages.tokensDescription}</p>
            <form className="token-form" onSubmit={createToken}>
              <label className="form-field"><span>{messages.tokenName}</span><input value={tokenName} maxLength={120} placeholder={messages.tokenNamePlaceholder} onChange={(event) => setTokenName(event.target.value)} /></label>
              <button className="button primary" disabled={tokenBusy || !tokenName.trim()}>{tokenBusy ? messages.creatingToken : messages.createToken}</button>
            </form>
            {tokenError && <p className="notice error" role="alert">{messages.tokenError}</p>}
            {newToken && <div className="new-token"><strong>{messages.tokenCreated}</strong><p>{messages.tokenCreatedNotice}</p><code>{newToken}</code><button className="button secondary" type="button" onClick={copyToken}>{copied ? messages.copiedToken : messages.copyToken}</button></div>}
            <div className="token-list">
              {tokens.length === 0 && <p>{messages.noTokens}</p>}
              {tokens.map((token) => <article key={token.id}><div><strong>{token.name}</strong><small>{messages.createdAt}: {new Date(token.createdAt).toLocaleDateString(locale)} · {messages.lastUsed}: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString(locale) : messages.neverUsed}</small></div><button type="button" disabled={tokenBusy} onClick={() => revokeToken(token.id)}>{messages.revokeToken}</button></article>)}
            </div>
          </section>
          <div className="actions"><button className="button secondary" type="button" onClick={logout}>{messages.logout}</button></div>
        </>}
      </section></main>
    </div>
  );
}
