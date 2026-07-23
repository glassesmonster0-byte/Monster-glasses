import { readFile } from "node:fs/promises";
import path from "node:path";
import { APICallError } from "@ai-sdk/provider";
import { createKlingAI } from "@ai-sdk/klingai";
import { experimental_generateVideo } from "ai";
import { env, MissingConfigError } from "@/lib/env";
import { describeQuotaOrBillingError } from "./quotaError";
import type { GenerationInput, GenerationOutput, VideoGenProvider } from "./types";

/**
 * Kling AI'a doğrudan bağlanır (aracı bir servis olmadan) — resmi
 * @ai-sdk/klingai sağlayıcısı ve Vercel AI SDK'nın experimental_generateVideo
 * fonksiyonu ile. Kimlik doğrulama: KLING_ACCESS_KEY + KLING_SECRET_KEY
 * (app.klingai.com > API Key sayfasından alınır — Kling tek bir opak API
 * key değil, access key/secret key çifti kullanır).
 */
export class KlingProvider implements VideoGenProvider {
  readonly name = "kling";
  readonly model = env.kling.videoModel;

  async generateVideo(input: GenerationInput): Promise<GenerationOutput> {
    if (!env.kling.accessKey) throw new MissingConfigError("KLING_ACCESS_KEY");
    if (!env.kling.secretKey) throw new MissingConfigError("KLING_SECRET_KEY");
    if (!input.referenceImagePath) {
      throw new Error("Video üretimi için bir kaynak görsel gerekli.");
    }

    const klingai = createKlingAI({ accessKey: env.kling.accessKey, secretKey: env.kling.secretKey });
    const absolutePath = path.join(env.mediaStoragePath, input.referenceImagePath);
    const imageBytes = await readFile(absolutePath);

    try {
      const { video } = await experimental_generateVideo({
        model: klingai.video(this.model),
        prompt: { image: imageBytes, text: input.prompt },
        duration: 5,
        providerOptions: { klingai: { mode: "pro" } },
      });

      return { outputBytes: Buffer.from(video.uint8Array), mimeType: video.mediaType || "video/mp4" };
    } catch (err) {
      if (err instanceof APICallError) {
        const quotaMessage = describeQuotaOrBillingError(err.statusCode, err.message);
        throw new Error(quotaMessage ?? `Kling API hatası (${err.statusCode}): ${err.message}`);
      }
      throw err;
    }
  }
}
