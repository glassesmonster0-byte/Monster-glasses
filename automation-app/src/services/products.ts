import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { newId } from "@/lib/id";
import { saveProductImage } from "@/lib/media";

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı en az 2 karakter olmalı"),
  sourceUrl: z.string().trim().url("Geçerli bir link girin").optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  category: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export async function createProduct(input: ProductInput, images: File[]) {
  if (images.length === 0) {
    throw new Error("En az bir kaynak görsel yüklemelisiniz.");
  }

  const sourceImagePaths = await Promise.all(images.map(saveProductImage));

  const id = newId("prod");
  await db.insert(products).values({
    id,
    name: input.name,
    sourceUrl: input.sourceUrl || null,
    description: input.description || null,
    category: input.category || null,
    sourceImagePaths,
    createdAt: new Date(),
  });

  return getProduct(id);
}

export async function listProducts() {
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) throw new Error(`Ürün bulunamadı: ${id}`);
  return product;
}
