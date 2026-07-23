import { NextRequest, NextResponse } from "next/server";
import { listContentForProduct, rejectContent } from "@/services/aiGeneration";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/content/[contentId]/reject">,
) {
  const { id, contentId } = await ctx.params;
  await rejectContent(contentId);
  const content = await listContentForProduct(id);
  return NextResponse.json({ content });
}
