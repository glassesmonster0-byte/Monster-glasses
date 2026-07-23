import { NextRequest, NextResponse } from "next/server";
import { approvePriceResearch, getLatestPriceResearch } from "@/services/priceResearch";
import { syncToShopifyAndGenerateContent } from "@/services/workflow/pipeline";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/price-research/approve">,
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const approvedPrice = Number(body.approvedPrice);

  if (!Number.isFinite(approvedPrice) || approvedPrice <= 0) {
    return NextResponse.json({ error: "invalid_price", message: "Geçerli bir fiyat girin." }, { status: 400 });
  }

  const latest = await getLatestPriceResearch(id);
  if (!latest) {
    return NextResponse.json({ error: "not_found", message: "Fiyat araştırması bulunamadı." }, { status: 404 });
  }

  const updated = await approvePriceResearch(latest.id, approvedPrice);

  // Fiyat onaylandıktan sonra Shopify senkronizasyonu ve AI içerik üretimi
  // otomatik tetiklenir — kullanıcının tek işi ürünü girip fiyatı onaylamaktı.
  try {
    await syncToShopifyAndGenerateContent(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ priceResearch: updated, pipelineError: message });
  }

  return NextResponse.json({ priceResearch: updated });
}
