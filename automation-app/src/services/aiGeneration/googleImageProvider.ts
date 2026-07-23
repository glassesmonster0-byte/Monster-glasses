import { ApiError, GoogleGenAI } from "@google/genai";
import { env, MissingConfigError } from "@/lib/env";
import { readLocalImageAsBase64 } from "./localImage";
import { describeQuotaOrBillingError } from "./quotaError";
import type { GenerationInput, GenerationOutput, ImageGenProvider } from "./types";

/**
 * Nano Banana Pro (Gemini 3 Pro Image) ile doğrudan Google AI Studio / Gemini
 * Developer API üzerinden görsel üretir — aracı bir servis kullanmaz.
 * Kimlik doğrulama: GOOGLE_AI_API_KEY (aistudio.google.com/apikey).
 *
 * Not: Bu model Gemini API üzerinde ücretsiz kotaya sahip değildir, her
 * çağrı faturalandırılır (Google Cloud projenizde faturalandırma etkin
 * olmalı). Kota/faturalama hatalarını sessizce yutmuyoruz — açıkça bildiriyoruz.
 */
export class GoogleImageProvider implements ImageGenProvider {
  readonly name = "google-genai";
  readonly model = env.google.imageModel;

  async generateImage(input: GenerationInput): Promise<GenerationOutput> {
    if (!env.google.apiKey) throw new MissingConfigError("GOOGLE_AI_API_KEY");

    const ai = new GoogleGenAI({ apiKey: env.google.apiKey });

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: input.prompt },
    ];
    if (input.referenceImagePath) {
      const ref = await readLocalImageAsBase64(input.referenceImagePath);
      parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } });
    }

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: parts,
        config: { responseModalities: ["IMAGE"] },
      });

      const base64 = response.data;
      if (!base64) {
        throw new Error("Nano Banana Pro yanıtında görsel verisi bulunamadı.");
      }

      return { outputBytes: Buffer.from(base64, "base64"), mimeType: "image/png" };
    } catch (err) {
      if (err instanceof ApiError) {
        const quotaMessage = describeQuotaOrBillingError(err.status, err.message);
        throw new Error(quotaMessage ?? `Google AI hatası (${err.status}): ${err.message}`);
      }
      throw err;
    }
  }
}
