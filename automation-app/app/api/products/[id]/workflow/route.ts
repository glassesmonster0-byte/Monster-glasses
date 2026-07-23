import { NextRequest, NextResponse } from "next/server";
import { getWorkflowForProduct } from "@/services/workflow";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/workflow">) {
  const { id } = await ctx.params;
  const workflow = await getWorkflowForProduct(id);
  return NextResponse.json({ workflow });
}
