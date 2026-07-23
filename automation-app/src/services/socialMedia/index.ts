import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generatedContent, socialPosts } from "@/db/schema";
import { newId } from "@/lib/id";
import { getProduct } from "@/services/products";
import { buildCaption } from "./captionEngine";
import { facebookPageId, instagramBusinessAccountId, isMetaConfigured, metaGraphRequest } from "./client";

export { isMetaConfigured };

type Platform = "instagram" | "facebook";
type PostType = "feed" | "story" | "reels";

async function logPost(params: {
  productId: string;
  contentId: string;
  platform: Platform;
  postType: PostType;
  caption: string;
  status: "posted" | "failed";
  platformPostId: string | null;
  errorMessage: string | null;
}) {
  await db.insert(socialPosts).values({
    id: newId("post"),
    createdAt: new Date(),
    postedAt: params.status === "posted" ? new Date() : null,
    scheduledFor: null,
    ...params,
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Instagram video/reels container'ı işlenip FINISHED olana kadar bekler (en fazla ~90sn). */
async function waitForInstagramContainerReady(creationId: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const status = await metaGraphRequest<{ status_code: string }>(`/${creationId}`, { fields: "status_code" });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") throw new Error("Instagram video işleme hatası (status: ERROR).");
    await sleep(3000);
  }
  throw new Error("Instagram video işleme zaman aşımına uğradı.");
}

async function publishInstagram(
  postType: "feed" | "story" | "reels",
  mediaUrl: string,
  caption: string,
  isVideo: boolean,
): Promise<string> {
  const igId = instagramBusinessAccountId();

  const createParams: Record<string, string> = { caption };
  if (isVideo) {
    createParams.video_url = mediaUrl;
    createParams.media_type = postType === "reels" ? "REELS" : "VIDEO";
  } else {
    createParams.image_url = mediaUrl;
    if (postType === "story") createParams.media_type = "STORIES";
  }

  const created = await metaGraphRequest<{ id: string }>(`/${igId}/media`, createParams, "POST");

  if (isVideo) {
    await waitForInstagramContainerReady(created.id);
  }

  const published = await metaGraphRequest<{ id: string }>(
    `/${igId}/media_publish`,
    { creation_id: created.id },
    "POST",
  );
  return published.id;
}

async function publishFacebook(mediaUrl: string, caption: string, isVideo: boolean): Promise<string> {
  const pageId = facebookPageId();
  if (isVideo) {
    const result = await metaGraphRequest<{ id: string }>(
      `/${pageId}/videos`,
      { file_url: mediaUrl, description: caption },
      "POST",
    );
    return result.id;
  }
  const result = await metaGraphRequest<{ id: string }>(
    `/${pageId}/photos`,
    { url: mediaUrl, caption },
    "POST",
  );
  return result.id;
}

async function publishOne(
  productId: string,
  contentId: string,
  mediaUrl: string,
  caption: string,
  isVideo: boolean,
  platform: Platform,
  postType: PostType,
) {
  try {
    const platformPostId =
      platform === "instagram"
        ? await publishInstagram(postType, mediaUrl, caption, isVideo)
        : await publishFacebook(mediaUrl, caption, isVideo);
    await logPost({ productId, contentId, platform, postType, caption, status: "posted", platformPostId, errorMessage: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await logPost({ productId, contentId, platform, postType, caption, status: "failed", platformPostId: null, errorMessage: message });
  }
}

/**
 * Onaylanmış tüm içerikleri (görsel + video) Instagram ve Facebook'a paylaşır:
 * görsel → IG feed + IG story + FB fotoğraf; video → IG reels + FB video.
 * Her platform/format bağımsız denenir ve loglanır — biri başarısız olsa
 * diğerleri yine de denenir.
 */
export async function postApprovedContentForProduct(productId: string): Promise<void> {
  const product = await getProduct(productId);
  const caption = buildCaption(product);

  const approved = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.productId, productId));

  const approvedItems = approved.filter((c) => c.status === "approved" && c.outputPath);
  if (approvedItems.length === 0) {
    throw new Error("Paylaşılacak onaylı içerik bulunamadı.");
  }

  for (const item of approvedItems) {
    const mediaUrl = item.outputPath as string;
    if (item.type === "image") {
      await publishOne(productId, item.id, mediaUrl, caption, false, "instagram", "feed");
      await publishOne(productId, item.id, mediaUrl, caption, false, "instagram", "story");
      await publishOne(productId, item.id, mediaUrl, caption, false, "facebook", "feed");
    } else {
      await publishOne(productId, item.id, mediaUrl, caption, true, "instagram", "reels");
      await publishOne(productId, item.id, mediaUrl, caption, true, "facebook", "feed");
    }
  }

  const results = await getSocialPostsForProduct(productId);
  if (results.every((r) => r.status === "failed")) {
    throw new Error("Tüm sosyal medya paylaşımları başarısız oldu.");
  }
}

export async function testMetaConnection(): Promise<
  { connected: true; pageName: string; igUsername: string } | { connected: false; error: string }
> {
  if (!isMetaConfigured()) {
    return {
      connected: false,
      error: "META_PAGE_ACCESS_TOKEN / META_FACEBOOK_PAGE_ID / META_INSTAGRAM_BUSINESS_ACCOUNT_ID eksik.",
    };
  }
  try {
    const [page, ig] = await Promise.all([
      metaGraphRequest<{ name: string }>(`/${facebookPageId()}`, { fields: "name" }),
      metaGraphRequest<{ username: string }>(`/${instagramBusinessAccountId()}`, { fields: "username" }),
    ]);
    return { connected: true, pageName: page.name, igUsername: ig.username };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}

export async function getSocialPostsForProduct(productId: string) {
  return db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.productId, productId))
    .orderBy(desc(socialPosts.createdAt));
}
