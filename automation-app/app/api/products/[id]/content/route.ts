import { NextRequest, NextResponse } from "next/server";
import { generateContentForProduct, listContentForProduct } from "@/services/aiGeneration";
import { setWorkflowStatus } from "@/services/workflow";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/content">) {
  const { id } = await ctx.params;
  const content = await listContentForProduct(id);
  return NextResponse.json({ content });
}

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/content">) {
  const { id } = await ctx.params;

  await setWorkflowStatus(id, "generating_content");
  try {
    const content = await generateContentForProduct(id);
    await setWorkflowStatus(id, "awaiting_content_approval");
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await setWorkflowStatus(id, "failed", message);
    return NextResponse.json({ error: "content_generation_failed", message }, { status: 502 });
  }
}
