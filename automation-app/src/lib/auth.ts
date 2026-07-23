const COOKIE_NAME = "liaxis_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

/**
 * Edge ve Node runtime'ının ikisinde de çalışsın diye Buffer yerine
 * Web Crypto (crypto.subtle) + btoa/atob kullanılıyor — middleware.ts
 * hangi runtime'da çalışırsa çalışsın bu dosya değişmeden kullanılabilir.
 */
function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(sig);
}

export { COOKIE_NAME };

/** Girişten sonra tarayıcıya konacak imzalı, süresi olan oturum token'ı üretir. */
export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = await hmacSign(secret, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

/** Token'ın süresinin dolmadığını ve doğru secret ile imzalandığını doğrular. */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const [expiresAtStr, signature] = token.split(".");
  if (!expiresAtStr || !signature) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expectedSignature = await hmacSign(secret, expiresAtStr);
  return signature === expectedSignature;
}
