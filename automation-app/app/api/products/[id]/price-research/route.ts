import { NextRequest, NextResponse } from "next/server";
import { getLatestPriceResearch, runPriceResearch } from "@/services/priceResearch";
import { setWorkflowStatus } from "@/services/workflow";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/price-research">) {
  const { id } = await ctx.params;
  const run = await getLatestPriceResearch(id);
  return NextResponse.json({ priceResearch: run });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/products/[id]/price-research">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const markupPercent = typeof body.markupPercent === "number" ? body.markupPercent : undefined;

  await setWorkflowStatus(id, "researching_price");

  try {
    const run = await runPriceResearch(id, markupPercent);
    await setWorkflowStatus(id, "awaiting_price_approval");
    return NextResponse.json({ priceResearch: run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await setWorkflowStatus(id, "failed", message);
    return NextResponse.json({ error: "price_research_failed", message }, { status: 502 });
  }
}
