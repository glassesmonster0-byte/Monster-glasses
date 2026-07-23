import { readFile } from "node:fs/promises";
import path from "node:path";
import { HiggsfieldClient } from "@higgsfield/client";
import { createHiggsfieldClient } from "@higgsfield/client/v2";
import { env, MissingConfigError } from "@/lib/env";
import type { GenerationInput, GenerationOutput, ImageGenProvider, VideoGenProvider } from "./types";

type HiggsfieldV2Client = ReturnType<typeof createHiggsfieldClient>;

function assertConfigured() {
  if (!env.higgsfield.keyId) throw new MissingConfigError("HIGGSFIELD_KEY_ID");
  if (!env.higgsfield.keySecret) throw new MissingConfigError("HIGGSFIELD_KEY_SECRET");
}

function v2Client(): HiggsfieldV2Client {
  return createHiggsfieldClient({ apiKey: env.higgsfield.keyId, apiSecret: env.higgsfield.keySecret });
}

function v1UploadClient(): HiggsfieldClient {
  return new HiggsfieldClient({ apiKey: env.higgsfield.keyId, apiSecret: env.higgsfield.keySecret });
}

function mimeFormat(ext: string): "jpeg" | "png" | "webp" {
  if (ext === ".png") return "png";
  if (ext === ".webp") return "webp";
  return "jpeg";
}

/** Yerel kaynak görseli Higgsfield CDN'ine yükler ve herkese açık URL'ini döner. */
async function uploadReferenceImage(relativePath: string): Promise<string> {
  const absolutePath = path.join(env.mediaStoragePath, relativePath);
  const buffer = await readFile(absolutePath);
  const client = v1UploadClient();
  try {
    return await client.uploadImage(buffer, mimeFormat(path.extname(absolutePath).toLowerCase()));
  } finally {
    client.close();
  }
}

/**
 * @higgsfield/client@0.2.1'in v2 tipleri `subscribe()` için `Promise<V2Response>`
 * bildiriyor, ama paketin kendi README'sindeki örnekler ve models/JobSet.ts
 * çalışma zamanında `isCompleted`/`isNsfw`/`jobs[].results.raw.url` alanları olan
 * bir `JobSet` nesnesi döndüğünü gösteriyor (bkz. paketin README "Working with
 * JobSet" bölümü). Bu tip burada elle tanımlanıp cast ediliyor.
 */
type SubscribeResult = {
  isCompleted: boolean;
  isNsfw: boolean;
  jobs: { status: string; results?: { raw: { url: string } } }[];
};

function extractOutputUrl(rawJobSet: Awaited<ReturnType<HiggsfieldV2Client["subscribe"]>>): string {
  const jobSet = rawJobSet as unknown as SubscribeResult;
  if (!jobSet.isCompleted) {
    throw new Error(
      jobSet.isNsfw
        ? "Higgsfield içeriği NSFW olarak işaretledi, üretim reddedildi."
        : `Higgsfield üretimi tamamlanmadı (durum: ${jobSet.jobs[0]?.status ?? "bilinmiyor"}).`,
    );
  }
  const url = jobSet.jobs[0]?.results?.raw.url;
  if (!url) throw new Error("Higgsfield tamamlandı ama çıktı URL'i bulunamadı.");
  return url;
}

/**
 * Higgsfield üzerinden Nano Banana Pro (görsel) ve Kling (video) modellerine
 * erişir. Kimlik doğrulama resmi @higgsfield/client SDK'sı ile yapılır.
 *
 * Not: `imageEndpoint`/`videoEndpoint` ve aşağıdaki `input` alan adları
 * (prompt, aspect_ratio, input_images…) Higgsfield'in halka açık dokümanına
 * erişemediğimiz için en yakın belgelenmiş örneklerden (flux-pro text-to-image,
 * DoP image-to-video) genellenmiştir. İlk gerçek çalıştırmada bir "bad input"
 * hatası alırsanız, Higgsfield dashboard'unuzda ilgili modelin "API" sekmesindeki
 * örnek request gövdesiyle karşılaştırıp bu dosyadaki `input` nesnesini güncelleyin.
 */
export class HiggsfieldImageProvider implements ImageGenProvider {
  readonly name = "higgsfield";
  readonly model = env.higgsfield.imageEndpoint;

  async generateImage(input: GenerationInput): Promise<GenerationOutput> {
    assertConfigured();
    const referenceImageUrl = input.referenceImagePath
      ? await uploadReferenceImage(input.referenceImagePath)
      : undefined;

    const jobSet = await v2Client().subscribe(env.higgsfield.imageEndpoint, {
      input: {
        prompt: input.prompt,
        aspect_ratio: "4:5",
        ...(referenceImageUrl ? { image_reference: { type: "image_url", image_url: referenceImageUrl } } : {}),
      },
      withPolling: true,
    });

    return { outputUrl: extractOutputUrl(jobSet) };
  }
}

export class HiggsfieldVideoProvider implements VideoGenProvider {
  readonly name = "higgsfield";
  readonly model = env.higgsfield.videoEndpoint;

  async generateVideo(input: GenerationInput): Promise<GenerationOutput> {
    assertConfigured();
    if (!input.referenceImagePath) {
      throw new Error("Video üretimi için bir kaynak görsel gerekli.");
    }
    const referenceImageUrl = await uploadReferenceImage(input.referenceImagePath);

    const jobSet = await v2Client().subscribe(env.higgsfield.videoEndpoint, {
      input: {
        prompt: input.prompt,
        input_images: [{ type: "image_url", image_url: referenceImageUrl }],
      },
      withPolling: true,
    });

    return { outputUrl: extractOutputUrl(jobSet) };
  }
}
