"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");

  return (
    <main className="page">
      <section className="panel auth-panel">
        <p className="eyebrow">kairojs.com</p>
        <h1>Kairo</h1>
        <p className="lead">
          アドオンを公開し、Kairoを使うすべての場所へ届けましょう。
        </p>

        {authError && (
          <p className="notice error" role="alert">
            Googleログインを完了できませんでした。もう一度お試しください。
          </p>
        )}

        <div className="actions">
          <a className="button primary" href="/api/v1/auth/google">
            Googleでログイン
          </a>
          <a className="button secondary" href="/account">
            アカウントを確認
          </a>
        </div>

        <p className="fine-print">
          ログインすると、今後アドオンの投稿やAPIトークンの管理ができるようになります。
        </p>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
