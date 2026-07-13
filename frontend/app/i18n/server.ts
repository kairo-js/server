import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";

export async function preferredLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get("kairo_locale")?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;
  const language = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return language.startsWith("en") ? "en" : defaultLocale;
}
