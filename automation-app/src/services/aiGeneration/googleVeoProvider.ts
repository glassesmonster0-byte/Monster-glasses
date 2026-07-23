import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ApiError, GoogleGenAI } from "@google/genai";
import { env, MissingConfigError } from "@/lib/env";
import { readLocalImageAsBase64 } from "./localImage";
import { describeQuotaOrBillingError } from "./quotaError";
import type { GenerationInput, GenerationOutput, VideoGenProvider } from "./types";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Veo 3.1 ile doğrudan Google AI Studio / Gemini Developer API üzerinden
 * video üretir — aracı bir servis kullanmaz. Kimlik doğrulama: GOOGLE_AI_API_KEY.
 *
 * Not: Veo 3.1'in Gemini API üzerinde ücretsiz kotası yoktur, her çağrı
 * ilk saniyeden itibaren faturalandırılır (Google Cloud projenizde
 * faturalandırma etkin olmalı). Kota/faturalama hatalarını sessizce
 * yutmuyoruz — açıkça bildiriyoruz.
 */
export class GoogleVeoProvider implements VideoGenProvider {
  readonly name = "google-veo";
  readonly model = env.google.veoModel;

  async generateVideo(input: GenerationInput): Promise<GenerationOutput> {
    if (!env.google.apiKey) throw new MissingConfigError("GOOGLE_AI_API_KEY");
    if (!input.referenceImagePath) {
      throw new Error("Video üretimi için bir kaynak görsel gerekli.");
    }

    const ai = new GoogleGenAI({ apiKey: env.google.apiKey });
    const ref = await readLocalImageAsBase64(input.referenceImagePath);

    try {
      let operation = await ai.models.generateVideos({
        model: this.model,
        prompt: input.prompt,
        image: { imageBytes: ref.data, mimeType: ref.mimeType },
        config: { aspectRatio: "9:16", generateAudio: true },
      });

      const maxAttempts = 30; // ~10 dakika (20sn aralıklarla)
      for (let attempt = 0; attempt < maxAttempts && !operation.done; attempt++) {
        await sleep(20000);
        operation = await ai.operations.getVideosOperation({ operation });
      }

      if (!operation.done) {
        throw new Error("Veo video üretimi zaman aşımına uğradı.");
      }
      if (operation.error) {
        throw new Error(`Veo video üretimi hatası: ${JSON.stringify(operation.error)}`);
      }

      const video = operation.response?.generatedVideos?.[0]?.video;
      if (!video) {
        throw new Error("Veo tamamlandı ama video döndürmedi.");
      }

      const tmpDir = await mkdtemp(path.join(tmpdir(), "liaxis-veo-"));
      const downloadPath = path.join(tmpDir, "video.mp4");
      try {
        await ai.files.download({ file: video, downloadPath });
        const bytes = await readFile(downloadPath);
        return { outputBytes: bytes, mimeType: "video/mp4" };
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const quotaMessage = describeQuotaOrBillingError(err.status, err.message);
        throw new Error(quotaMessage ?? `Google AI hatası (${err.status}): ${err.message}`);
      }
      throw err;
    }
  }
}
