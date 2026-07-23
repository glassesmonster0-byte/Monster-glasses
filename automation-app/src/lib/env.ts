/**
 * Central place to read environment variables. Nothing here throws at
 * import time — services validate the specific keys they need when they're
 * actually invoked, so the app still boots (and shows "bağlı değil" in the
 * panel) when a module's API key hasn't been configured yet.
 */
export const env = {
  databasePath: process.env.DATABASE_PATH ?? "./data/liaxis.db",
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH ?? "./data/media",

  serpApiKey: process.env.SERPAPI_API_KEY,
  defaultMarkupPercent: Number(process.env.DEFAULT_MARKUP_PERCENT ?? 150),

  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION ?? "2025-01",
    // Opsiyonel: verilirse yeni ürünler bu koleksiyona ve stok konumuna atanır.
    defaultCollectionId: process.env.SHOPIFY_DEFAULT_COLLECTION_ID,
    locationId: process.env.SHOPIFY_LOCATION_ID,
    defaultInventoryQuantity: Number(process.env.SHOPIFY_DEFAULT_INVENTORY_QUANTITY ?? 10),
  },

  higgsfield: {
    // @higgsfield/client resmi SDK'sı KEY_ID:KEY_SECRET çiftiyle kimlik doğrular
    // (bkz. https://higgsfield.ai dashboard > API). Tek bir opak "API key" değildir.
    keyId: process.env.HIGGSFIELD_KEY_ID,
    keySecret: process.env.HIGGSFIELD_KEY_SECRET,
    // Higgsfield dashboard'unuzdaki model kataloğundan aldığınız tam endpoint
    // string'i — burada varsayılan olarak yazdıklarımızı ilk kullanımdan önce
    // mutlaka kendi hesabınızdaki gerçek değerle doğrulayın.
    imageEndpoint: process.env.HIGGSFIELD_IMAGE_ENDPOINT ?? "nano-banana-pro/text-to-image",
    videoEndpoint: process.env.HIGGSFIELD_VIDEO_ENDPOINT ?? "/v1/image2video/kling",
  },

  meta: {
    apiVersion: process.env.META_GRAPH_API_VERSION ?? "v21.0",
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
    facebookPageId: process.env.META_FACEBOOK_PAGE_ID,
    instagramBusinessAccountId: process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID,
  },
} as const;

export class MissingConfigError extends Error {
  constructor(what: string) {
    super(`Eksik yapılandırma: ${what}. Lütfen .env.local dosyanızı kontrol edin.`);
    this.name = "MissingConfigError";
  }
}
