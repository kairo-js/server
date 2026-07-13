"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "../i18n/config";
import { dictionaries } from "../i18n/dictionaries";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  function hrefFor(nextLocale: Locale) {
    const parts = pathname.split("/");
    if (locales.includes(parts[1] as Locale)) parts[1] = nextLocale;
    else parts.splice(1, 0, nextLocale);
    return parts.join("/");
  }

  return (
    <div className="locale-switcher" aria-label="Language">
      {locales.map((item) => (
        <Link
          href={hrefFor(item)}
          key={item}
          lang={item}
          className={item === locale ? "active" : ""}
          aria-current={item === locale ? "page" : undefined}
          onClick={() => { document.cookie = `kairo_locale=${item}; Path=/; Max-Age=31536000; SameSite=Lax`; }}
        >
          <span aria-hidden="true">{item.toUpperCase()}</span>
          <span className="sr-only">{dictionaries[item].languageName}</span>
        </Link>
      ))}
    </div>
  );
}
