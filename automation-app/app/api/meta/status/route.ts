import { NextResponse } from "next/server";
import { testMetaConnection } from "@/services/socialMedia";

export async function GET() {
  const status = await testMetaConnection();
  return NextResponse.json(status);
}
