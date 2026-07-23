import { generateContentForProduct } from "@/services/aiGeneration";
import { syncProductToShopify } from "@/services/shopify";
import { setWorkflowStatus } from "./index";

/**
 * Fiyat onaylandıktan (veya Shopify adımı elle tekrar tetiklendikten) sonraki
 * otomatik adımları yürütür: Shopify senkronizasyonu → AI içerik üretimi →
 * onay bekleme. Kullanıcının bir sonraki müdahalesi sadece içerik onayıdır.
 */
export async function syncToShopifyAndGenerateContent(productId: string): Promise<void> {
  await setWorkflowStatus(productId, "updating_shopify");
  try {
    await syncProductToShopify(productId);
  } catch (err) {
    await setWorkflowStatus(productId, "failed", err instanceof Error ? err.message : "Bilinmeyen hata");
    throw err;
  }

  await setWorkflowStatus(productId, "generating_content");
  try {
    await generateContentForProduct(productId);
    await setWorkflowStatus(productId, "awaiting_content_approval");
  } catch (err) {
    await setWorkflowStatus(productId, "failed", err instanceof Error ? err.message : "Bilinmeyen hata");
    throw err;
  }
}
