import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import { newId } from "./id";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

/** Persists an uploaded product image to disk and returns its relative path. */
export async function saveProductImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Desteklenmeyen görsel türü: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Görsel 15MB sınırını aşıyor.");
  }

  const dir = path.join(env.mediaStoragePath, "source-images");
  await mkdir(dir, { recursive: true });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${newId("img")}.${ext}`;
  const filePath = path.join(dir, filename);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  return path.join("source-images", filename);
}
