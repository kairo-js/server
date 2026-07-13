"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isLocale } from "../i18n/config";

export function HtmlLocale() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = pathname.split("/")[1];
    if (!isLocale(locale)) return;
    document.documentElement.lang = locale;
    document.cookie = `kairo_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [pathname]);

  return null;
}
