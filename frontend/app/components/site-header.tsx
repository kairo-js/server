import Link from "next/link";
import { GitHubIcon, GoogleIcon } from "./auth-icons";

type SiteHeaderProps = {
  showLogin?: boolean;
};

export function SiteHeader({ showLogin = true }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Kairo トップページ">
        <span className="brand-mark" aria-hidden="true">K</span>
        <span>Kairo</span>
      </Link>

      <nav className="header-nav" aria-label="メインナビゲーション">
        <Link href="/#addons">アドオン</Link>
        {showLogin ? (
          <div className="login-actions" aria-label="ログイン方法">
            <a className="provider-button google" href="/api/v1/auth/google">
              <GoogleIcon className="provider-icon" />
              <span>Google</span>
            </a>
            <a className="provider-button github" href="/api/v1/auth/github">
              <GitHubIcon className="provider-icon" />
              <span>GitHub</span>
            </a>
          </div>
        ) : (
          <Link className="header-account-link" href="/account">アカウント</Link>
        )}
      </nav>
    </header>
  );
}
