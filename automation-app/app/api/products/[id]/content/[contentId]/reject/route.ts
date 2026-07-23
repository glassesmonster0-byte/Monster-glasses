import { NextRequest, NextResponse } from "next/server";
import { listContentForProduct, rejectContent } from "@/services/aiGeneration";
import { publishIfReviewComplete } from "@/services/workflow/pipeline";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/content/[contentId]/reject">,
) {
  const { id, contentId } = await ctx.params;
  await rejectContent(contentId);

  // Reddetme de "karar tamamlandı" sayılır — başka onaylı içerik varsa paylaşım tetiklenir.
  let publishError: string | null = null;
  try {
    await publishIfReviewComplete(id);
  } catch (err) {
    publishError = err instanceof Error ? err.message : "Bilinmeyen hata";
  }

  const content = await listContentForProduct(id);
  return NextResponse.json({ content, publishError });
}
