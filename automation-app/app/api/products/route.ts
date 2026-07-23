import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProduct, listProductsWithStatus, productInputSchema } from "@/services/products";

export async function GET() {
  const items = await listProductsWithStatus();
  return NextResponse.json({ products: items });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const parsed = productInputSchema.safeParse({
    name: formData.get("name"),
    sourceUrl: formData.get("sourceUrl") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: (parsed.error as ZodError).flatten() },
      { status: 400 },
    );
  }

  const images = formData.getAll("images").filter((v): v is File => v instanceof File);

  try {
    const product = await createProduct(parsed.data, images);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: "create_failed", message }, { status: 400 });
  }
}
