import { redirect } from "next/navigation";
import { preferredLocale } from "../i18n/server";

export default async function PublishRedirect() {
  redirect(`/${await preferredLocale()}/publish`);
}
