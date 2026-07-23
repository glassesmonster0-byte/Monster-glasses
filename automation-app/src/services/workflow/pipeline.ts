import { generateContentForProduct, isContentReviewComplete } from "@/services/aiGeneration";
import { syncProductToShopify } from "@/services/shopify";
import { postApprovedContentForProduct } from "@/services/socialMedia";
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

/**
 * Bir içerik onaylandığında/reddedildiğinde çağrılır: üründeki tüm içerikler
 * karara bağlandıysa (bekleyen kalmadıysa) ve en az biri onaylıysa, sosyal
 * medya paylaşımını otomatik tetikler. Kullanıcının son müdahalesi içerik
 * onayıydı — gerisi otomatik.
 */
export async function publishIfReviewComplete(productId: string): Promise<void> {
  const { complete, hasApproved } = await isContentReviewComplete(productId);
  if (!complete || !hasApproved) return;

  await setWorkflowStatus(productId, "posting_social");
  try {
    await postApprovedContentForProduct(productId);
    await setWorkflowStatus(productId, "done");
  } catch (err) {
    await setWorkflowStatus(productId, "failed", err instanceof Error ? err.message : "Bilinmeyen hata");
    throw err;
  }
}
