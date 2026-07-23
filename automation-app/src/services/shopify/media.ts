import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { shopifyGraphQL } from "./client";
import { PRODUCT_CREATE_MEDIA_MUTATION, STAGED_UPLOADS_CREATE_MUTATION } from "./queries";

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
  return "image/jpeg";
}

/** Uploads a local image (relative to MEDIA_STORAGE_PATH) to Shopify and attaches it to the product. */
export async function uploadProductImage(shopifyProductId: string, relativeImagePath: string, alt: string) {
  const absolutePath = path.join(env.mediaStoragePath, relativeImagePath);
  const filename = path.basename(absolutePath);
  const mimeType = mimeFromExt(path.extname(absolutePath).toLowerCase());
  const bytes = await readFile(absolutePath);

  const staged = await shopifyGraphQL<StagedUploadsCreateResult>(STAGED_UPLOADS_CREATE_MUTATION, {
    input: [
      {
        resource: "PRODUCT_IMAGE",
        filename,
        mimeType,
        httpMethod: "POST",
      },
    ],
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
    throw new Error(`Görsel Shopify'a yüklenemedi: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  const attached = await shopifyGraphQL<ProductCreateMediaResult>(PRODUCT_CREATE_MEDIA_MUTATION, {
    productId: shopifyProductId,
    media: [{ alt, mediaContentType: "IMAGE", originalSource: target.resourceUrl }],
  });

  if (attached.productCreateMedia.mediaUserErrors.length > 0) {
    throw new Error(
      `Shopify medya ekleme hatası: ${attached.productCreateMedia.mediaUserErrors.map((e) => e.message).join("; ")}`,
    );
  }
}
