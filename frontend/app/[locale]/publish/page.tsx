import { notFound } from "next/navigation";
import { PublishPage } from "../../components/publish-page";
import { isLocale } from "../../i18n/config";

export default async function LocalizedPublish({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PublishPage locale={locale} />;
}
