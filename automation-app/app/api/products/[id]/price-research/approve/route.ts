import { NextRequest, NextResponse } from "next/server";
import { approvePriceResearch, getLatestPriceResearch } from "@/services/priceResearch";
import { syncProductToShopify } from "@/services/shopify";
import { setWorkflowStatus } from "@/services/workflow";

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
  await setWorkflowStatus(id, "updating_shopify");

  // Fiyat onaylandıktan sonra Shopify senkronizasyonu otomatik tetiklenir —
  // kullanıcının tek işi ürünü girip fiyatı onaylamaktı.
  try {
    await syncProductToShopify(id);
    await setWorkflowStatus(id, "generating_content");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await setWorkflowStatus(id, "failed", message);
    return NextResponse.json({
      priceResearch: updated,
      shopifySyncError: message,
    });
  }

  return NextResponse.json({ priceResearch: updated });
}
