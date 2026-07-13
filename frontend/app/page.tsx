"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "./components/site-header";

function HomeContent() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">ADD-ONS FOR KAIRO</p>
            <h1>つくる人と、<br />遊ぶ人をつなぐ。</h1>
            <p className="hero-lead">
              Kairoのアドオンを見つけて、すぐに導入。閲覧とダウンロードにアカウントは必要ありません。
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#addons">アドオンを探す</a>
              <a className="text-link" href="/account">アドオンを公開する <span aria-hidden="true">→</span></a>
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

        {authError && (
          <p className="notice error page-notice" role="alert">
            ログインを完了できませんでした。もう一度お試しください。
          </p>
        )}

        <section className="registry-section" id="addons">
          <div>
            <p className="eyebrow">REGISTRY</p>
            <h2>アドオンレジストリ</h2>
          </div>
          <p className="section-description">
            公開されたアドオンは、Web・API・将来のKairo CLIから同じように利用できます。
          </p>
          <div className="empty-registry">
            <span className="empty-icon" aria-hidden="true">◇</span>
            <strong>レジストリを準備しています</strong>
            <p>最初のアドオン公開機能をまもなく追加します。</p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>Kairo</span>
        <span>Open add-on registry for Kairo</span>
      </footer>
    </div>
  );
}

export default function Home() {
  return <Suspense><HomeContent /></Suspense>;
}
