import { LogoutButton } from "@/components/LogoutButton";
import { MetaConnectionBadge } from "@/components/MetaConnectionBadge";
import { ShopifyConnectionBadge } from "@/components/ShopifyConnectionBadge";
import { VideoProviderSetting } from "@/components/VideoProviderSetting";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="brand">LIAXIS</span>
          <span className="brand-sub">Ürün Otomasyon Paneli</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <VideoProviderSetting />
            <ShopifyConnectionBadge />
            <MetaConnectionBadge />
            <LogoutButton />
          </span>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
