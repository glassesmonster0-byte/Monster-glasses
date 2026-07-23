import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { shopifyGraphQL } from "./client";
import {
  FILE_CREATE_MUTATION,
  NODE_FILE_STATUS_QUERY,
  PRODUCT_CREATE_MEDIA_MUTATION,
  STAGED_UPLOADS_CREATE_MUTATION,
} from "./queries";

type StagedUploadsCreateResult = {
  stagedUploadsCreate: {
    stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[];
    userErrors: { field?: string[]; message: string }[];
  };
};

type ProductCreateMediaResult = {
  productCreateMedia: {
    media: { alt: string | null; mediaContentType: string }[];
    mediaUserErrors: { field?: string[]; message: string }[];
  };
};

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  return "image/jpeg";
}

/** Ham byte'ları Shopify'ın staged upload hedefine yükler, kaynak URL'ini döner. */
async function stagedUploadBytes(
  bytes: Buffer,
  filename: string,
  mimeType: string,
  resource: "PRODUCT_IMAGE" | "IMAGE" | "VIDEO",
): Promise<string> {
  const staged = await shopifyGraphQL<StagedUploadsCreateResult>(STAGED_UPLOADS_CREATE_MUTATION, {
    input: [{ resource, filename, mimeType, httpMethod: "POST" }],
  });

  if (staged.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      `Shopify staged upload hatası: ${staged.stagedUploadsCreate.userErrors.map((e) => e.message).join("; ")}`,
    );
  }

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error("Shopify staged upload hedefi alınamadı.");

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), filename);

  const uploadRes = await fetch(target.url, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error(`Dosya Shopify'a yüklenemedi: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  return target.resourceUrl;
}

/** Uploads a local image (relative to MEDIA_STORAGE_PATH) to Shopify and attaches it to the product. */
export async function uploadProductImage(shopifyProductId: string, relativeImagePath: string, alt: string) {
  const absolutePath = path.join(env.mediaStoragePath, relativeImagePath);
  const filename = path.basename(absolutePath);
  const mimeType = mimeFromExt(path.extname(absolutePath).toLowerCase());
  const bytes = await readFile(absolutePath);

  const resourceUrl = await stagedUploadBytes(bytes, filename, mimeType, "PRODUCT_IMAGE");

  const attached = await shopifyGraphQL<ProductCreateMediaResult>(PRODUCT_CREATE_MEDIA_MUTATION, {
    productId: shopifyProductId,
    media: [{ alt, mediaContentType: "IMAGE", originalSource: resourceUrl }],
  });

  if (attached.productCreateMedia.mediaUserErrors.length > 0) {
    throw new Error(
      `Shopify medya ekleme hatası: ${attached.productCreateMedia.mediaUserErrors.map((e) => e.message).join("; ")}`,
    );
  }
}

type FileCreateResult = {
  fileCreate: {
    files: { id: string; fileStatus: string }[];
    userErrors: { field?: string[]; message: string }[];
  };
};

type NodeFileStatusResult = {
  node: { fileStatus: string; image?: { url: string }; sources?: { url: string }[] } | null;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * AI ile üretilen görsel/video byte'larını Shopify'a genel bir dosya olarak
 * yükleyip herkese açık bir CDN URL'i döner. Lokal uygulamanın kendi herkese
 * açık bir adresi olmadığından (Meta Graph API görsel/video paylaşımı için
 * herkese açık bir URL şart koşar), üretilen içerikleri zaten bağlı olduğunuz
 * Shopify mağazasının dosya deposunda barındırıyoruz — ayrı bir CDN/servise
 * gerek kalmadan.
 */
export async function hostMediaPubliclyOnShopify(
  bytes: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
): Promise<string> {
  const isVideo = mimeType.startsWith("video/");
  const resourceUrl = await stagedUploadBytes(bytes, filename, mimeType, isVideo ? "VIDEO" : "IMAGE");

  const created = await shopifyGraphQL<FileCreateResult>(FILE_CREATE_MUTATION, {
    files: [{ alt, contentType: isVideo ? "VIDEO" : "IMAGE", originalSource: resourceUrl }],
  });

  if (created.fileCreate.userErrors.length > 0) {
    throw new Error(`Shopify dosya oluşturma hatası: ${created.fileCreate.userErrors.map((e) => e.message).join("; ")}`);
  }

  const file = created.fileCreate.files[0];
  if (!file) throw new Error("Shopify dosya oluşturmadı.");

  for (let attempt = 0; attempt < 20; attempt++) {
    const status = await shopifyGraphQL<NodeFileStatusResult>(NODE_FILE_STATUS_QUERY, { id: file.id });
    const url = status.node?.image?.url ?? status.node?.sources?.[0]?.url;
    if (status.node?.fileStatus === "READY" && url) return url;
    if (status.node?.fileStatus === "FAILED") throw new Error("Shopify dosya işleme başarısız oldu.");
    await sleep(2000);
  }

  throw new Error("Shopify dosya işleme zaman aşımına uğradı.");
}
