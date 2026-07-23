import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

/** Yerel kaynak görseli (relative to MEDIA_STORAGE_PATH) base64 + mimeType olarak okur. */
export async function readLocalImageAsBase64(relativePath: string): Promise<{ data: string; mimeType: string }> {
  const absolutePath = path.join(env.mediaStoragePath, relativePath);
  const bytes = await readFile(absolutePath);
  return { data: bytes.toString("base64"), mimeType: mimeFromExt(path.extname(absolutePath).toLowerCase()) };
}
