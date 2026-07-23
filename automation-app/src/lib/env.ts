/**
 * Central place to read environment variables. Nothing here throws at
 * import time — services validate the specific keys they need when they're
 * actually invoked, so the app still boots (and shows "bağlı değil" in the
 * panel) when a module's API key hasn't been configured yet.
 */
export const env = {
  databasePath: process.env.DATABASE_PATH ?? "./data/liaxis.db",
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH ?? "./data/media",

  // Paneli internete açtığınızda giriş ekranını korur. İkisi de boşsa ve
  // NODE_ENV production ise middleware uygulamayı çalıştırmayı reddeder —
  // şifresiz halde internete açık kalmasını engellemek için.
  appPassword: process.env.APP_PASSWORD,
  authSecret: process.env.AUTH_SECRET,

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

  google: {
    // aistudio.google.com/apikey üzerinden alınır. @google/genai resmi SDK'sı
    // ile doğrudan Google'a bağlanılır (aracı bir servis yok).
    apiKey: process.env.GOOGLE_AI_API_KEY,
    // Nano Banana Pro (Gemini 3 Pro Image) — görsel üretimi.
    imageModel: process.env.GOOGLE_IMAGE_MODEL ?? "gemini-3-pro-image-preview",
    // Veo 3.1 (stabil/GA) — video üretimi.
    veoModel: process.env.GOOGLE_VEO_MODEL ?? "veo-3.1-generate-001",
  },

  kling: {
    // Kling AI, tek bir opak API key değil access key + secret key çifti
    // kullanır (app.klingai.com > API Key sayfasından alınır).
    accessKey: process.env.KLING_ACCESS_KEY,
    secretKey: process.env.KLING_SECRET_KEY,
    videoModel: process.env.KLING_VIDEO_MODEL ?? "kling-v2.6-i2v",
  },

  // Panelde değiştirilebilir varsayılan video sağlayıcısı: "veo" veya "kling".
  defaultVideoProvider: (process.env.DEFAULT_VIDEO_PROVIDER ?? "veo") as "veo" | "kling",

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
