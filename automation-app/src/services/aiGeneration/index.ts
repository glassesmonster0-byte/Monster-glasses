import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generatedContent } from "@/db/schema";
import { newId } from "@/lib/id";
import { getProduct } from "@/services/products";
import { buildImagePrompt, buildVideoPrompt } from "@/services/promptEngine";
import { hostMediaPubliclyOnShopify } from "@/services/shopify";
import { getVideoProvider } from "@/services/settings";
import { GoogleImageProvider } from "./googleImageProvider";
import { GoogleVeoProvider } from "./googleVeoProvider";
import { KlingProvider } from "./klingProvider";
import type { GenerationOutput, ImageGenProvider, VideoGenProvider } from "./types";

const imageProvider: ImageGenProvider = new GoogleImageProvider();
const videoProviders: Record<"veo" | "kling", VideoGenProvider> = {
  veo: new GoogleVeoProvider(),
  kling: new KlingProvider(),
};

async function insertPending(productId: string, type: "image" | "video", provider: string, model: string, prompt: string) {
  const id = newId("content");
  await db.insert(generatedContent).values({
    id,
    productId,
    type,
    provider,
    model,
    prompt,
    status: "generating",
    createdAt: new Date(),
  });
  return id;
}

/**
 * Üretilen ham byte'ları herkese açık bir URL'e (Shopify dosya deposu)
 * yükleyip DB'ye yazar. Meta Graph API paylaşımı ve panelde önizleme için
 * herkese açık bir adres şart — lokal uygulamanın kendi böyle bir adresi yok.
 */
async function markReady(id: string, contentType: "image" | "video", output: GenerationOutput, alt: string) {
  const ext = contentType === "image" ? "png" : "mp4";
  const publicUrl = await hostMediaPubliclyOnShopify(output.outputBytes, `${id}.${ext}`, output.mimeType, alt);
  await db.update(generatedContent).set({ status: "ready", outputPath: publicUrl }).where(eq(generatedContent.id, id));
}

async function markFailed(id: string, message: string) {
  await db.update(generatedContent).set({ status: "failed", errorMessage: message }).where(eq(generatedContent.id, id));
}

/**
 * Ürün için bir reklam görseli (Nano Banana Pro) ve bir kısa reklam videosu
 * (Veo 3.1 veya Kling — panelde seçilen sağlayıcıya göre) üretir. Prompt'lar
 * otomatik oluşturulur. İkisi de bağımsız denenir — biri başarısız olsa
 * diğeri yine de üretilmeye çalışılır; en az biri başarılıysa panelde onay
 * için gösterilir.
 */
export async function generateContentForProduct(productId: string) {
  const product = await getProduct(productId);
  const referenceImagePath = product.sourceImagePaths[0];
  const videoProvider = videoProviders[await getVideoProvider()];

  const imagePrompt = buildImagePrompt(product);
  const imageId = await insertPending(productId, "image", imageProvider.name, imageProvider.model, imagePrompt);
  let imageFailed = false;
  try {
    const output = await imageProvider.generateImage({ prompt: imagePrompt, referenceImagePath });
    await markReady(imageId, "image", output, product.name);
  } catch (err) {
    imageFailed = true;
    await markFailed(imageId, err instanceof Error ? err.message : "Bilinmeyen hata");
  }

  const videoPrompt = buildVideoPrompt(product);
  const videoId = await insertPending(productId, "video", videoProvider.name, videoProvider.model, videoPrompt);
  let videoFailed = false;
  try {
    const output = await videoProvider.generateVideo({ prompt: videoPrompt, referenceImagePath });
    await markReady(videoId, "video", output, product.name);
  } catch (err) {
    videoFailed = true;
    await markFailed(videoId, err instanceof Error ? err.message : "Bilinmeyen hata");
  }

  if (imageFailed && videoFailed) {
    throw new Error("Görsel ve video üretiminin ikisi de başarısız oldu.");
  }

  return listContentForProduct(productId);
}

export async function regenerateContent(contentId: string) {
  const [existing] = await db.select().from(generatedContent).where(eq(generatedContent.id, contentId)).limit(1);
  if (!existing) throw new Error(`İçerik bulunamadı: ${contentId}`);

  const product = await getProduct(existing.productId);
  const referenceImagePath = product.sourceImagePaths[0];
  const videoProvider = videoProviders[await getVideoProvider()];

  const provider = existing.type === "image" ? imageProvider : videoProvider;
  const id = await insertPending(existing.productId, existing.type, provider.name, provider.model, existing.prompt);

  try {
    const output =
      existing.type === "image"
        ? await imageProvider.generateImage({ prompt: existing.prompt, referenceImagePath })
        : await videoProvider.generateVideo({ prompt: existing.prompt, referenceImagePath });
    await markReady(id, existing.type, output, product.name);
  } catch (err) {
    await markFailed(id, err instanceof Error ? err.message : "Bilinmeyen hata");
    throw err;
  }

  return listContentForProduct(existing.productId);
}

export async function listContentForProduct(productId: string) {
  return db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.productId, productId))
    .orderBy(desc(generatedContent.createdAt));
}

export async function approveContent(contentId: string) {
  await db
    .update(generatedContent)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(generatedContent.id, contentId));
}

export async function rejectContent(contentId: string) {
  await db.update(generatedContent).set({ status: "rejected" }).where(eq(generatedContent.id, contentId));
}

/** Bu ürün için üretilen tüm içerikler onaylandı/reddedildi mi (paylaşıma geçilebilir mi)? */
export async function isContentReviewComplete(productId: string): Promise<{ complete: boolean; hasApproved: boolean }> {
  const items = await listContentForProduct(productId);
  const pending = items.some((c) => c.status === "ready" || c.status === "generating" || c.status === "pending");
  const hasApproved = items.some((c) => c.status === "approved");
  return { complete: !pending, hasApproved };
}
