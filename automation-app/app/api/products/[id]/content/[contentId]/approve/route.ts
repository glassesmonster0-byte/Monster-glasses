import { NextRequest, NextResponse } from "next/server";
import { approveContent, listContentForProduct } from "@/services/aiGeneration";
import { publishIfReviewComplete } from "@/services/workflow/pipeline";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/content/[contentId]/approve">,
) {
  const { id, contentId } = await ctx.params;
  await approveContent(contentId);

  // Bu, üründeki son bekleyen içerikse sosyal medya paylaşımı otomatik başlar.
  let publishError: string | null = null;
  try {
    await publishIfReviewComplete(id);
  } catch (err) {
    publishError = err instanceof Error ? err.message : "Bilinmeyen hata";
  }

  const content = await listContentForProduct(id);
  return NextResponse.json({ content, publishError });
}
