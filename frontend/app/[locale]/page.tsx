import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HomePage } from "../components/home-page";
import { isLocale } from "../i18n/config";

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Suspense><HomePage locale={locale} /></Suspense>;
}
