import { NextRequest, NextResponse } from "next/server";
import { getLatestShopifySync, syncProductToShopify } from "@/services/shopify";
import { setWorkflowStatus } from "@/services/workflow";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/shopify">) {
  const { id } = await ctx.params;
  const sync = await getLatestShopifySync(id);
  return NextResponse.json({ shopifySync: sync });
}

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/shopify">) {
  const { id } = await ctx.params;

  try {
    const result = await syncProductToShopify(id);
    await setWorkflowStatus(id, "generating_content");
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await setWorkflowStatus(id, "failed", message);
    return NextResponse.json({ error: "shopify_sync_failed", message }, { status: 502 });
  }
}
