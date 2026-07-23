import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  if (!env.appPassword || !env.authSecret) {
    return NextResponse.json(
      { error: "not_configured", message: "APP_PASSWORD / AUTH_SECRET ayarlanmamış." },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== env.appPassword) {
    return NextResponse.json({ error: "invalid_password", message: "Şifre yanlış." }, { status: 401 });
  }

  const token = await createSessionToken(env.authSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
