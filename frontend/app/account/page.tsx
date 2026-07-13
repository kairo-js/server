import { redirect } from "next/navigation";
import { preferredLocale } from "../i18n/server";

export default async function AccountRedirect() {
  redirect(`/${await preferredLocale()}/account`);
}
