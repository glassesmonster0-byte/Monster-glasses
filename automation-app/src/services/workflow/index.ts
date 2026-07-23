import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workflowRuns } from "@/db/schema";
import { newId } from "@/lib/id";

export type WorkflowStatus = (typeof workflowRuns.$inferSelect)["status"];

export async function getWorkflowForProduct(productId: string) {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.productId, productId))
    .orderBy(desc(workflowRuns.createdAt))
    .limit(1);
  return run ?? null;
}

/** Ensures a workflow_run row exists for the product and moves it to `status`. */
export async function setWorkflowStatus(
  productId: string,
  status: WorkflowStatus,
  errorMessage?: string,
) {
  const existing = await getWorkflowForProduct(productId);
  const now = new Date();

  if (!existing) {
    const id = newId("wf");
    await db.insert(workflowRuns).values({
      id,
      productId,
      status,
      errorMessage: errorMessage ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return getWorkflowForProduct(productId);
  }

  await db
    .update(workflowRuns)
    .set({ status, errorMessage: errorMessage ?? null, updatedAt: now })
    .where(eq(workflowRuns.id, existing.id));
  return getWorkflowForProduct(productId);
}
