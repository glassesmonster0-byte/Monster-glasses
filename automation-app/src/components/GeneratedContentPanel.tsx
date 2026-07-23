"use client";

import { useState } from "react";

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

const TYPE_LABELS: Record<ContentItem["type"], string> = { image: "Görsel", video: "Video" };

export function GeneratedContentPanel({
  productId,
  content,
  onChanged,
}: {
  productId: string;
  content: ContentItem[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(contentId: string, action: "approve" | "reject" | "regenerate") {
    setBusyId(contentId);
    try {
      await fetch(`/api/products/${productId}/content/${contentId}/${action}`, { method: "POST" });
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (content.length === 0) return null;

  return (
    <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Üretilen Reklam İçerikleri</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {content.map((item) => (
          <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="badge">
                {TYPE_LABELS[item.type]} · {item.model}
              </span>
              <span className="badge">{item.status}</span>
            </div>

            {item.status === "generating" && <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Üretiliyor…</p>}

            {item.status === "failed" && <p className="status-banner error">{item.errorMessage}</p>}

            {item.outputPath && (item.status === "ready" || item.status === "approved") && (
              <div style={{ marginBottom: "0.5rem" }}>
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.outputPath} alt={item.prompt} style={{ maxWidth: "260px", borderRadius: "6px" }} />
                ) : (
                  <video src={item.outputPath} controls style={{ maxWidth: "260px", borderRadius: "6px" }} />
                )}
              </div>
            )}

            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.6rem" }}>{item.prompt}</p>

            {item.status === "ready" && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" disabled={busyId === item.id} onClick={() => act(item.id, "approve")}>
                  Onayla
                </button>
                <button
                  className="btn btn-danger"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "reject")}
                >
                  Reddet
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "regenerate")}
                >
                  Yeniden Üret
                </button>
              </div>
            )}

            {(item.status === "rejected" || item.status === "failed") && (
              <button
                className="btn btn-secondary"
                disabled={busyId === item.id}
                onClick={() => act(item.id, "regenerate")}
              >
                Yeniden Üret
              </button>
            )}

            {item.status === "approved" && <p className="status-banner success">Onaylandı</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
