import { NextRequest, NextResponse } from "next/server";
import { getVideoProvider, setVideoProvider } from "@/services/settings";

export async function GET() {
  const provider = await getVideoProvider();
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.provider !== "veo" && body.provider !== "kling") {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }
  await setVideoProvider(body.provider);
  return NextResponse.json({ provider: body.provider });
}
