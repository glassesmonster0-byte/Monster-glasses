export type GenerationInput = {
  prompt: string;
  /** Local path (relative to MEDIA_STORAGE_PATH) of a reference/source image, if any. */
  referenceImagePath?: string;
};

export type GenerationOutput = {
  /** Publicly reachable URL of the generated asset (also reused later for Instagram/Facebook publishing). */
  outputUrl: string;
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
