import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const appPassword = process.env.APP_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;
  const isApiRequest = pathname.startsWith("/api/");

  // Geliştirme ortamında (npm run dev) şifre ayarlanmamışsa akışı kesmiyoruz —
  // README'deki lokal test talimatları buna göre yazıldı. Üretimde
  // (NODE_ENV=production, ör. bulut ortamı) şifre ZORUNLU: ayarlanmamışsa
  // paneli şifresiz açık bırakmak yerine erişimi tamamen reddediyoruz.
  if (!appPassword || !authSecret) {
    if (process.env.NODE_ENV === "production") {
      const message = "Panel şifresi yapılandırılmamış (APP_PASSWORD / AUTH_SECRET). Güvenlik nedeniyle erişim reddedildi.";
      return isApiRequest
        ? NextResponse.json({ error: "not_configured", message }, { status: 503 })
        : new NextResponse(message, { status: 503 });
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token, authSecret) : false;

  if (valid) {
    return NextResponse.next();
  }

  if (isApiRequest) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
