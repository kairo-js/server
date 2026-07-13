import { redirect } from "next/navigation";
import { preferredLocale } from "./i18n/server";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await preferredLocale();
  const params = new URLSearchParams();
  const values = await searchParams;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") params.set(key, value);
  }
  redirect(`/${locale}${params.size ? `?${params}` : ""}`);
}
