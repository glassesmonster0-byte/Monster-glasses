"use client";

import { useEffect, useRef, useState } from "react";
import { GeneratedContentPanel } from "./GeneratedContentPanel";
import { SocialPostsPanel } from "./SocialPostsPanel";

type Workflow = {
  id: string;
  status: string;
  errorMessage: string | null;
} | null;

type PriceResearch = {
  id: string;
  provider: string;
  foundPrices: { source: string; price: number; currency: string; url?: string }[];
  medianPrice: number | null;
  markupPercent: number;
  suggestedPrice: number | null;
  approvedPrice: number | null;
} | null;

type ShopifySync = {
  action: "create" | "update";
  success: boolean;
  changesSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
} | null;

type ContentItem = {
  id: string;
  type: "image" | "video";
  provider: string;
  model: string;
  prompt: string;
  outputPath: string | null;
  status: "pending" | "generating" | "ready" | "approved" | "rejected" | "failed";
  errorMessage: string | null;
};

type SocialPost = {
  id: string;
  platform: "instagram" | "facebook";
  postType: "feed" | "story" | "reels";
  status: "scheduled" | "posting" | "posted" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  researching_price: "Fiyat araştırması yapılıyor…",
  awaiting_price_approval: "Fiyat onayı bekleniyor",
  updating_shopify: "Shopify güncelleniyor…",
  generating_content: "Görsel/video üretiliyor…",
  awaiting_content_approval: "İçerik onayı bekleniyor",
  posting_social: "Sosyal medyaya paylaşılıyor…",
  done: "Tamamlandı",
  failed: "Hata oluştu",
};

const IN_PROGRESS_STATUSES = new Set([
  "researching_price",
  "updating_shopify",
  "generating_content",
  "posting_social",
]);

function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

export function WorkflowPanel({ productId, productName }: { productId: string; productName: string }) {
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const [priceResearch, setPriceResearch] = useState<PriceResearch>(null);
  const [shopifySync, setShopifySync] = useState<ShopifySync>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [overridePrice, setOverridePrice] = useState("");
  const [approving, setApproving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    const [wfRes, prRes, shRes, ctRes, spRes] = await Promise.all([
      fetch(`/api/products/${productId}/workflow`),
      fetch(`/api/products/${productId}/price-research`),
      fetch(`/api/products/${productId}/shopify`),
      fetch(`/api/products/${productId}/content`),
      fetch(`/api/products/${productId}/social-post`),
    ]);
    const wf = await wfRes.json();
    const pr = await prRes.json();
    const sh = await shRes.json();
    const ct = await ctRes.json();
    const sp = await spRes.json();
    setWorkflow(wf.workflow);
    setPriceResearch(pr.priceResearch);
    setShopifySync(sh.shopifySync);
    setContent(ct.content ?? []);
    setSocialPosts(sp.posts ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, then polling
    refresh();
    pollRef.current = setInterval(refresh, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (workflow && !IN_PROGRESS_STATUSES.has(workflow.status) && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [workflow]);

  async function handleRetryResearch() {
    setApproving(true);
    try {
      await fetch(`/api/products/${productId}/price-research`, { method: "POST" });
      pollRef.current ??= setInterval(refresh, 1500);
      await refresh();
    } finally {
      setApproving(false);
    }
  }

  async function handleRetryShopify() {
    setApproving(true);
    try {
      await fetch(`/api/products/${productId}/shopify`, { method: "POST" });
      pollRef.current ??= setInterval(refresh, 1500);
      await refresh();
    } finally {
      setApproving(false);
    }
  }

  async function handleRetrySocialPost() {
    setApproving(true);
    try {
      await fetch(`/api/products/${productId}/social-post`, { method: "POST" });
      pollRef.current ??= setInterval(refresh, 1500);
      await refresh();
    } finally {
      setApproving(false);
    }
  }

  async function handleApprove(price: number) {
    setApproving(true);
    try {
      const res = await fetch(`/api/products/${productId}/price-research/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedPrice: price }),
      });
      if (res.ok) {
        pollRef.current ??= setInterval(refresh, 1500);
        await refresh();
      }
    } finally {
      setApproving(false);
    }
  }

  const status = workflow?.status;
  const alreadyApproved = priceResearch?.approvedPrice != null;

  return (
    <section className="card">
      <h2>{productName} — Süreç Durumu</h2>

      {status && (
        <p className="status-banner" style={{ marginBottom: "1rem" }}>
          {STATUS_LABELS[status] ?? status}
        </p>
      )}
      {workflow?.errorMessage && <p className="status-banner error">{workflow.errorMessage}</p>}

      {priceResearch && (
        <div>
          <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Fiyat Araştırması ({priceResearch.provider})</h3>
          {priceResearch.foundPrices.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Karşılaştırılabilir fiyat bulunamadı.</p>
          ) : (
            <ul style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem", paddingLeft: "1.1rem" }}>
              {priceResearch.foundPrices.slice(0, 8).map((p, i) => (
                <li key={i}>
                  {p.source}: {formatTRY(p.price)}
                </li>
              ))}
            </ul>
          )}

          {priceResearch.medianPrice != null && (
            <p style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Medyan fiyat: <strong>{formatTRY(priceResearch.medianPrice)}</strong> · Kâr marjı: %
              {priceResearch.markupPercent} · Önerilen satış fiyatı:{" "}
              <strong>{priceResearch.suggestedPrice != null ? formatTRY(priceResearch.suggestedPrice) : "—"}</strong>
            </p>
          )}

          {alreadyApproved ? (
            <p className="status-banner success">
              Onaylanan fiyat: {formatTRY(priceResearch.approvedPrice as number)}
            </p>
          ) : (
            <div>
              {priceResearch.suggestedPrice == null && (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Fiyat önerisi hesaplanamadı (araştırma başarısız oldu ya da sonuç bulunamadı). Lütfen manuel fiyat
                  girin ya da{" "}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
                    disabled={approving}
                    onClick={handleRetryResearch}
                  >
                    tekrar deneyin
                  </button>
                  .
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {priceResearch.suggestedPrice != null && (
                  <button
                    className="btn"
                    disabled={approving}
                    onClick={() => handleApprove(priceResearch.suggestedPrice as number)}
                  >
                    Önerilen Fiyatı Onayla
                  </button>
                )}
                <input
                  type="text"
                  placeholder="Manuel fiyat gir"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  style={{ width: "9rem" }}
                  className="override-input"
                />
                <button
                  className="btn btn-secondary"
                  disabled={approving || !overridePrice}
                  onClick={() => handleApprove(Number(overridePrice.replace(",", ".")))}
                >
                  Manuel Fiyatla Onayla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {shopifySync && (
        <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Shopify Senkronizasyonu</h3>
          {shopifySync.success ? (
            <p className="status-banner success">
              {shopifySync.action === "create" ? "Ürün oluşturuldu" : "Ürün güncellendi"} — {shopifySync.changesSummary}
            </p>
          ) : (
            <div>
              <p className="status-banner error">{shopifySync.errorMessage}</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "0.5rem" }}
                disabled={approving}
                onClick={handleRetryShopify}
              >
                Shopify&apos;a Tekrar Gönder
              </button>
            </div>
          )}
        </div>
      )}

      <GeneratedContentPanel productId={productId} content={content} onChanged={refresh} />
      <SocialPostsPanel posts={socialPosts} onRetry={handleRetrySocialPost} retrying={approving} />
    </section>
  );
}
