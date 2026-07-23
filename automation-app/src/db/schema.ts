import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/** A product entered by the user (Module 1). */
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceUrl: text("source_url"),
  description: text("description"),
  sourceImagePaths: text("source_image_paths", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  category: text("category"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** Overall pipeline status for a product, drives the dashboard's live view. */
export const workflowRuns = sqliteTable("workflow_runs", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  status: text("status", {
    enum: [
      "researching_price",
      "awaiting_price_approval",
      "updating_shopify",
      "generating_content",
      "awaiting_content_approval",
      "posting_social",
      "done",
      "failed",
    ],
  }).notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** Module 2 — price research results for a product. */
export const priceResearchRuns = sqliteTable("price_research_runs", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  provider: text("provider").notNull(),
  foundPrices: text("found_prices", { mode: "json" })
    .$type<{ source: string; price: number; currency: string; url?: string }[]>()
    .notNull()
    .default([]),
  medianPrice: real("median_price"),
  markupPercent: real("markup_percent").notNull(),
  suggestedPrice: real("suggested_price"),
  approvedPrice: real("approved_price"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** Module 3 — Shopify sync log. */
export const shopifySyncs = sqliteTable("shopify_syncs", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  shopifyProductId: text("shopify_product_id"),
  action: text("action", { enum: ["create", "update"] }).notNull(),
  changesSummary: text("changes_summary"),
  success: integer("success", { mode: "boolean" }).notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** Module 4 — AI-generated image/video content awaiting approval. */
export const generatedContent = sqliteTable("generated_content", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  type: text("type", { enum: ["image", "video"] }).notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  outputPath: text("output_path"),
  status: text("status", {
    enum: ["pending", "generating", "ready", "approved", "rejected", "failed"],
  }).notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
});

/** Panelde değiştirilebilir ayarlar (ör. video sağlayıcı tercihi: veo | kling). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Module 5 — social media posting log. */
export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  contentId: text("content_id").references(() => generatedContent.id),
  platform: text("platform", { enum: ["instagram", "facebook"] }).notNull(),
  postType: text("post_type", { enum: ["feed", "story", "reels"] }).notNull(),
  caption: text("caption"),
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
  status: text("status", {
    enum: ["scheduled", "posting", "posted", "failed"],
  }).notNull(),
  platformPostId: text("platform_post_id"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  postedAt: integer("posted_at", { mode: "timestamp" }),
});
