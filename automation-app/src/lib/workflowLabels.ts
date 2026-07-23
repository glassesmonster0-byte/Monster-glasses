export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  researching_price: "Fiyat araştırması yapılıyor…",
  awaiting_price_approval: "Fiyat onayı bekleniyor",
  updating_shopify: "Shopify güncelleniyor…",
  generating_content: "Görsel/video üretiliyor…",
  awaiting_content_approval: "İçerik onayı bekleniyor",
  posting_social: "Sosyal medyaya paylaşılıyor…",
  done: "Tamamlandı",
  failed: "Hata oluştu",
};

export const WORKFLOW_IN_PROGRESS_STATUSES = new Set([
  "researching_price",
  "updating_shopify",
  "generating_content",
  "posting_social",
]);
