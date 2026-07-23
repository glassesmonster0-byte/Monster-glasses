import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { priceResearchRuns } from "@/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/id";
import { getProduct } from "@/services/products";
import { SerpApiPriceProvider } from "./serpApiProvider";
import type { PriceProvider, PriceQuote } from "./types";

const provider: PriceProvider = new SerpApiPriceProvider();

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function buildSearchQuery(productName: string, category: string | null): string {
  return category ? `${productName} ${category}` : productName;
}

/**
 * Bulunan medyan fiyata kâr marjını uygular: önerilen fiyat = medyan × (1 + marj/100).
 * Örn. medyan 200 TL, marj %150 → önerilen 500 TL.
 */
function applyMarkup(medianPrice: number, markupPercent: number): number {
  return Math.round(medianPrice * (1 + markupPercent / 100) * 100) / 100;
}

export async function runPriceResearch(productId: string, markupPercent = env.defaultMarkupPercent) {
  const product = await getProduct(productId);
  const query = buildSearchQuery(product.name, product.category);

  let foundPrices: PriceQuote[] = [];
  try {
    foundPrices = await provider.searchPrices(query);
  } catch (err) {
    const id = newId("price");
    await db.insert(priceResearchRuns).values({
      id,
      productId,
      provider: provider.name,
      foundPrices: [],
      markupPercent,
      medianPrice: null,
      suggestedPrice: null,
      createdAt: new Date(),
    });
    throw err;
  }

  const medianPrice = median(foundPrices.map((p) => p.price));
  const suggestedPrice = medianPrice !== undefined ? applyMarkup(medianPrice, markupPercent) : undefined;

  const id = newId("price");
  await db.insert(priceResearchRuns).values({
    id,
    productId,
    provider: provider.name,
    foundPrices,
    markupPercent,
    medianPrice: medianPrice ?? null,
    suggestedPrice: suggestedPrice ?? null,
    createdAt: new Date(),
  });

  return getLatestPriceResearch(productId);
}

export async function getLatestPriceResearch(productId: string) {
  const [run] = await db
    .select()
    .from(priceResearchRuns)
    .where(eq(priceResearchRuns.productId, productId))
    .orderBy(desc(priceResearchRuns.createdAt))
    .limit(1);
  return run ?? null;
}

export async function approvePriceResearch(priceResearchId: string, approvedPrice: number) {
  await db
    .update(priceResearchRuns)
    .set({ approvedPrice, approvedAt: new Date() })
    .where(eq(priceResearchRuns.id, priceResearchId));

  const [row] = await db
    .select()
    .from(priceResearchRuns)
    .where(eq(priceResearchRuns.id, priceResearchId))
    .limit(1);
  if (!row) throw new Error(`Fiyat araştırması bulunamadı: ${priceResearchId}`);
  return row;
}
