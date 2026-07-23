import { NextRequest, NextResponse } from "next/server";
import { approveContent, listContentForProduct } from "@/services/aiGeneration";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/content/[contentId]/approve">,
) {
  const { id, contentId } = await ctx.params;
  await approveContent(contentId);
  const content = await listContentForProduct(id);
  return NextResponse.json({ content });
}
