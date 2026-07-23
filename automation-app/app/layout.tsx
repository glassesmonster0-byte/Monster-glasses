import type { Metadata } from "next";
import { MetaConnectionBadge } from "@/components/MetaConnectionBadge";
import { ShopifyConnectionBadge } from "@/components/ShopifyConnectionBadge";
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
      <body>
        <header className="app-header">
          <div className="app-header-inner">
            <span className="brand">LIAXIS</span>
            <span className="brand-sub">Ürün Otomasyon Paneli — yalnızca lokal kullanım</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <ShopifyConnectionBadge />
              <MetaConnectionBadge />
            </span>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
