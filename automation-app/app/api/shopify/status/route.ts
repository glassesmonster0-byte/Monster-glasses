import { NextResponse } from "next/server";
import { testShopifyConnection } from "@/services/shopify";

export async function GET() {
  const status = await testShopifyConnection();
  return NextResponse.json(status);
}
