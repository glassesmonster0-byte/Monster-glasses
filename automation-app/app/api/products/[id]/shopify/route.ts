import { NextRequest, NextResponse } from "next/server";
import { getLatestShopifySync } from "@/services/shopify";
import { syncToShopifyAndGenerateContent } from "@/services/workflow/pipeline";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/shopify">) {
  const { id } = await ctx.params;
  const sync = await getLatestShopifySync(id);
  return NextResponse.json({ shopifySync: sync });
}

/** Manuel "tekrar gönder" aksiyonu — Shopify'dan devam edip içerik üretimine kadar zinciri sürdürür. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/shopify">) {
  const { id } = await ctx.params;

  try {
    await syncToShopifyAndGenerateContent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: "pipeline_failed", message }, { status: 502 });
  }
}
