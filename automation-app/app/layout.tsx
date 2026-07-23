import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIAXIS Ürün Otomasyon Paneli",
  description: "Sadece dahili kullanım için lokal otomasyon paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
