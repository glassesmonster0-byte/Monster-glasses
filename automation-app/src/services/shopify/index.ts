import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { shopifySyncs } from "@/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/id";
import { getProduct } from "@/services/products";
import { getLatestPriceResearch } from "@/services/priceResearch";
import { isShopifyConfigured, shopifyGraphQL } from "./client";
import { uploadProductImage } from "./media";
import {
  PRODUCT_CREATE_MUTATION,
  PRODUCT_UPDATE_MUTATION,
  PRODUCT_VARIANTS_BULK_UPDATE_MUTATION,
  SHOP_QUERY,
} from "./queries";

type ShopQueryResult = { shop: { name: string; myshopifyDomain: string } };

type ProductMutationResult = {
  product: { id: string; title: string; variants: { edges: { node: { id: string } }[] } } | null;
  userErrors: { field?: string[]; message: string }[];
};

export async function testShopifyConnection(): Promise<
  { connected: true; shopName: string } | { connected: false; error: string }
> {
  if (!isShopifyConfigured()) {
    return { connected: false, error: "SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_ACCESS_TOKEN eksik." };
  }
  try {
    const data = await shopifyGraphQL<ShopQueryResult>(SHOP_QUERY);
    return { connected: true, shopName: data.shop.name };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}

async function getExistingShopifyProductId(productId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(shopifySyncs)
    .where(and(eq(shopifySyncs.productId, productId), eq(shopifySyncs.success, true), isNotNull(shopifySyncs.shopifyProductId)))
    .orderBy(desc(shopifySyncs.createdAt))
    .limit(1);
  return row?.shopifyProductId ?? null;
}

async function logSync(params: {
  productId: string;
  shopifyProductId: string | null;
  action: "create" | "update";
  changesSummary: string | null;
  success: boolean;
  errorMessage: string | null;
}) {
  await db.insert(shopifySyncs).values({
    id: newId("shopsync"),
    createdAt: new Date(),
    ...params,
  });
}

/**
 * Ürünü Shopify mağazasına gönderir: mevcut değilse oluşturur, varsa günceller
 * (başlık, açıklama, SEO, etiketler, fiyat, görseller, durum, koleksiyon).
 * En son onaylanmış fiyatı kullanır — approve edilmiş bir fiyat yoksa hata verir.
 *
 * Not: Shopify Admin GraphQL şeması API sürümleri arasında değişebiliyor
 * (ör. ProductInput.seo, ileri sürümlerde metafields/translations lehine
 * kaldırılabilir). Gerçek mağazaya karşı ilk çalıştırmada bir hata alırsanız
 * `testShopifyConnection` ile bağlantıyı doğrulayıp hata mesajındaki alan
 * adını kullandığınız SHOPIFY_API_VERSION'ın şema referansıyla karşılaştırın.
 */
export async function syncProductToShopify(productId: string) {
  const product = await getProduct(productId);
  const priceResearch = await getLatestPriceResearch(productId);
  const price = priceResearch?.approvedPrice;

  if (price == null) {
    throw new Error("Shopify senkronizasyonu için önce fiyat onaylanmalı.");
  }

  const existingId = await getExistingShopifyProductId(productId);
  const action: "create" | "update" = existingId ? "update" : "create";

  const productInput: Record<string, unknown> = {
    title: product.name,
    descriptionHtml: product.description ? `<p>${escapeHtml(product.description)}</p>` : undefined,
    tags: product.category ? [product.category] : undefined,
    status: "ACTIVE",
    seo: {
      title: product.name,
      description: product.description ?? undefined,
    },
    ...(existingId
      ? { id: existingId }
      : env.shopify.defaultCollectionId
        ? { collectionsToJoin: [env.shopify.defaultCollectionId] }
        : {}),
  };

  try {
    const mutationResult = await shopifyGraphQL<{
      productCreate?: ProductMutationResult;
      productUpdate?: ProductMutationResult;
    }>(existingId ? PRODUCT_UPDATE_MUTATION : PRODUCT_CREATE_MUTATION, { input: productInput });

    const result = existingId ? mutationResult.productUpdate : mutationResult.productCreate;
    if (!result) throw new Error("Shopify mutasyon yanıtı beklenmedik biçimde boş.");
    if (result.userErrors.length > 0) {
      throw new Error(`Shopify ürün ${action === "create" ? "oluşturma" : "güncelleme"} hatası: ${result.userErrors.map((e) => e.message).join("; ")}`);
    }
    if (!result.product) throw new Error("Shopify ürünü döndürmedi.");

    const shopifyProductId = result.product.id;
    const variantId = result.product.variants.edges[0]?.node.id;

    if (variantId) {
      const variantResult = await shopifyGraphQL<{
        productVariantsBulkUpdate: {
          productVariants: { id: string; price: string }[];
          userErrors: { field?: string[]; message: string }[];
        };
      }>(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
        productId: shopifyProductId,
        variants: [{ id: variantId, price: price.toFixed(2) }],
      });
      if (variantResult.productVariantsBulkUpdate.userErrors.length > 0) {
        throw new Error(
          `Shopify fiyat güncelleme hatası: ${variantResult.productVariantsBulkUpdate.userErrors.map((e) => e.message).join("; ")}`,
        );
      }
    }

    // Yeni ürünse kaynak görselleri Shopify'a yükle (güncellemede mevcut görseller korunur, tekrar yüklenmez).
    if (action === "create") {
      for (const imagePath of product.sourceImagePaths) {
        await uploadProductImage(shopifyProductId, imagePath, product.name);
      }
    }

    await logSync({
      productId,
      shopifyProductId,
      action,
      changesSummary: `Başlık, açıklama, SEO, fiyat (${price} TL)${action === "create" ? ", görseller" : ""} güncellendi.`,
      success: true,
      errorMessage: null,
    });

    return { shopifyProductId, action };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await logSync({
      productId,
      shopifyProductId: existingId,
      action,
      changesSummary: null,
      success: false,
      errorMessage: message,
    });
    throw err;
  }
}

export async function getLatestShopifySync(productId: string) {
  const [row] = await db
    .select()
    .from(shopifySyncs)
    .where(eq(shopifySyncs.productId, productId))
    .orderBy(desc(shopifySyncs.createdAt))
    .limit(1);
  return row ?? null;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
