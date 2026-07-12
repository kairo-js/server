"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
};

type AccountState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "signed-in"; user: User };

export default function AccountPage() {
  const [account, setAccount] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) {
          setAccount({ status: "signed-out" });
          return;
        }
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
    const response = await fetch("/api/v1/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (response.ok) window.location.href = "/";
    else setAccount({ status: "error" });
  }

  return (
    <main className="page">
      <section className="panel auth-panel">
        <p className="eyebrow">Kairo account</p>

        {account.status === "loading" && <p className="lead">読み込んでいます…</p>}

        {account.status === "signed-out" && (
          <>
            <h1 className="compact-heading">ログインが必要です</h1>
            <p className="lead">アカウントを表示するにはGoogleでログインしてください。</p>
            <div className="actions">
              <a className="button primary" href="/api/v1/auth/google">
                Googleでログイン
              </a>
              <a className="button github" href="/api/v1/auth/github">
                GitHubでログイン
              </a>
              <Link className="button secondary" href="/">
                トップへ戻る
              </Link>
            </div>
          </>
        )}

        {account.status === "error" && (
          <>
            <h1 className="compact-heading">読み込めませんでした</h1>
            <p className="notice error" role="alert">
              アカウント情報の取得に失敗しました。時間をおいて再度お試しください。
            </p>
            <div className="actions">
              <a className="button secondary" href="/account">
                再読み込み
              </a>
            </div>
          </>
        )}

        {account.status === "signed-in" && (
          <>
            <h1 className="compact-heading">{account.user.displayName}</h1>
            <dl className="account-details">
              <div>
                <dt>メールアドレス</dt>
                <dd>{account.user.email}</dd>
              </div>
              <div>
                <dt>ユーザーID</dt>
                <dd className="monospace">{account.user.id}</dd>
              </div>
            </dl>
            <div className="actions">
              <button className="button secondary" type="button" onClick={logout}>
                ログアウト
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
