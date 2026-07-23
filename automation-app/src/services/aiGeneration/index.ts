import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generatedContent } from "@/db/schema";
import { newId } from "@/lib/id";
import { getProduct } from "@/services/products";
import { buildImagePrompt, buildVideoPrompt } from "@/services/promptEngine";
import { HiggsfieldImageProvider, HiggsfieldVideoProvider } from "./higgsfieldProvider";
import type { ImageGenProvider, VideoGenProvider } from "./types";

const imageProvider: ImageGenProvider = new HiggsfieldImageProvider();
const videoProvider: VideoGenProvider = new HiggsfieldVideoProvider();

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

async function markReady(id: string, outputUrl: string) {
  await db.update(generatedContent).set({ status: "ready", outputPath: outputUrl }).where(eq(generatedContent.id, id));
}

async function markFailed(id: string, message: string) {
  await db.update(generatedContent).set({ status: "failed", errorMessage: message }).where(eq(generatedContent.id, id));
}

/**
 * Ürün için bir reklam görseli ve bir kısa reklam videosu üretir. Prompt'lar
 * otomatik oluşturulur (kullanıcı prompt yazmaz). İkisi de bağımsız denenir —
 * biri başarısız olsa diğeri yine de üretilmeye çalışılır; en az biri
 * başarılıysa panelde onay için gösterilir.
 */
export async function generateContentForProduct(productId: string) {
  const product = await getProduct(productId);
  const referenceImagePath = product.sourceImagePaths[0];

  const imagePrompt = buildImagePrompt(product);
  const imageId = await insertPending(productId, "image", imageProvider.name, imageProvider.model, imagePrompt);
  let imageFailed = false;
  try {
    const { outputUrl } = await imageProvider.generateImage({ prompt: imagePrompt, referenceImagePath });
    await markReady(imageId, outputUrl);
  } catch (err) {
    imageFailed = true;
    await markFailed(imageId, err instanceof Error ? err.message : "Bilinmeyen hata");
  }

  const videoPrompt = buildVideoPrompt(product);
  const videoId = await insertPending(productId, "video", videoProvider.name, videoProvider.model, videoPrompt);
  let videoFailed = false;
  try {
    const { outputUrl } = await videoProvider.generateVideo({ prompt: videoPrompt, referenceImagePath });
    await markReady(videoId, outputUrl);
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

  const id = await insertPending(existing.productId, existing.type, existing.provider, existing.model, existing.prompt);
  const product = await getProduct(existing.productId);
  const referenceImagePath = product.sourceImagePaths[0];

  try {
    const { outputUrl } =
      existing.type === "image"
        ? await imageProvider.generateImage({ prompt: existing.prompt, referenceImagePath })
        : await videoProvider.generateVideo({ prompt: existing.prompt, referenceImagePath });
    await markReady(id, outputUrl);
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
