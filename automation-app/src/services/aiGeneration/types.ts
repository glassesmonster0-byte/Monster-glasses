export type GenerationInput = {
  prompt: string;
  /** Local path (relative to MEDIA_STORAGE_PATH) of a reference/source image, if any. */
  referenceImagePath?: string;
};

export type GenerationOutput = {
  /** Raw bytes of the generated asset — providers return bytes, not a hosted URL. */
  outputBytes: Buffer;
  mimeType: string;
};

export interface ImageGenProvider {
  readonly name: string;
  readonly model: string;
  generateImage(input: GenerationInput): Promise<GenerationOutput>;
}

export interface VideoGenProvider {
  readonly name: string;
  readonly model: string;
  generateVideo(input: GenerationInput): Promise<GenerationOutput>;
}
