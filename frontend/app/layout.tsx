import type { Metadata } from "next";
import "./globals.css";
import { HtmlLocale } from "./components/html-locale";

export const metadata: Metadata = {
  title: "Kairo — Add-on registry",
  description: "Kairo add-on registry / Kairoアドオンの公開・配布サービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body><HtmlLocale />{children}</body>
    </html>
  );
}
