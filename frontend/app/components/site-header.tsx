import Link from "next/link";
import { GitHubIcon, GoogleIcon } from "./auth-icons";
import { LocaleSwitcher } from "./locale-switcher";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";

type SiteHeaderProps = {
  locale: Locale;
  showLogin?: boolean;
};

export function SiteHeader({ locale, showLogin = true }: SiteHeaderProps) {
  const messages = getDictionary(locale);
  return (
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label={`Kairo ${messages.header.home}`}>
        <span className="brand-mark" aria-hidden="true">K</span>
        <span>Kairo</span>
      </Link>

      <nav className="header-nav" aria-label={messages.header.navigation}>
        <Link href={`/${locale}/#addons`}>{messages.header.addons}</Link>
        <Link href={`/${locale}/develop`}>{messages.header.develop}</Link>
        <Link href={`/${locale}/publish`}>{messages.header.publish}</Link>
        <LocaleSwitcher locale={locale} />
        {showLogin ? (
          <div className="login-actions" aria-label={messages.header.loginMethods}>
            <Link className="provider-button google" href="/api/v1/auth/google">
              <GoogleIcon className="provider-icon" />
              <span>Google</span>
            </Link>
            <Link className="provider-button github" href="/api/v1/auth/github">
              <GitHubIcon className="provider-icon" />
              <span>GitHub</span>
            </Link>
          </div>
        ) : (
          <Link className="header-account-link" href={`/${locale}/account`}>{messages.header.account}</Link>
        )}
      </nav>
    </header>
  );
}
