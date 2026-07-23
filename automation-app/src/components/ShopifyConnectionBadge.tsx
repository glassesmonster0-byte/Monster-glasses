"use client";

import { useEffect, useState } from "react";

type Status = { connected: true; shopName: string } | { connected: false; error: string } | null;

export function ShopifyConnectionBadge() {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    fetch("/api/shopify/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, error: "Kontrol edilemedi" }));
  }, []);

  if (!status) return null;

  return (
    <span className="badge" title={status.connected ? status.shopName : status.error}>
      Shopify: {status.connected ? `bağlı (${status.shopName})` : "bağlı değil"}
    </span>
  );
}
