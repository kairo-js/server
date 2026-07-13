import { notFound } from "next/navigation";
import { AccountPage } from "../../components/account-page";
import { isLocale } from "../../i18n/config";

export default async function LocalizedAccount({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountPage locale={locale} />;
}
