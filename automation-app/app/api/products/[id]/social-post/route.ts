import { NextRequest, NextResponse } from "next/server";
import { getSocialPostsForProduct, postApprovedContentForProduct } from "@/services/socialMedia";
import { setWorkflowStatus } from "@/services/workflow";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/social-post">) {
  const { id } = await ctx.params;
  const posts = await getSocialPostsForProduct(id);
  return NextResponse.json({ posts });
}

/** Manuel "tekrar dene" — onaylı içerikler için paylaşımı yeniden dener. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/social-post">) {
  const { id } = await ctx.params;

  await setWorkflowStatus(id, "posting_social");
  try {
    await postApprovedContentForProduct(id);
    await setWorkflowStatus(id, "done");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await setWorkflowStatus(id, "failed", message);
    return NextResponse.json({ error: "social_post_failed", message }, { status: 502 });
  }
}
