import { NextRequest, NextResponse } from "next/server";
import { regenerateContent } from "@/services/aiGeneration";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]/content/[contentId]/regenerate">,
) {
  const { contentId } = await ctx.params;
  try {
    const content = await regenerateContent(contentId);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: "regenerate_failed", message }, { status: 502 });
  }
}
