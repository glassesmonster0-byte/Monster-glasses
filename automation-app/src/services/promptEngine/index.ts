type ProductLike = {
  name: string;
  description: string | null;
  category: string | null;
};

const BRAND_TONE =
  "confidence, comfort, everyday elegance, posture support, wellbeing — never clinical or medical-looking";

/**
 * AI görsel/video üretim modelleri İngilizce promptlarda daha tutarlı sonuç
 * veriyor; bu yüzden prompt İngilizce üretiliyor, panel arayüzü Türkçe kalıyor.
 */
export function buildImagePrompt(product: ProductLike): string {
  const subject = product.category ?? product.name;
  return [
    `Photorealistic lifestyle product photography for the LIAXIS brand.`,
    `A real-looking adult female model wearing/using "${product.name}" (${subject}) in a natural, softly lit indoor setting (home or minimal studio).`,
    product.description ? `Product context: ${product.description}.` : "",
    `Natural candid pose, genuine confident expression, soft natural light, shallow depth of field, one close-up detail shot of the product's fit and material.`,
    `Brand mood: ${BRAND_TONE}.`,
    `Vertical 4:5 or 9:16 composition suitable for Instagram/Facebook feed and stories. No visible text or logos overlaid on the image. High resolution, realistic skin texture, no uncanny-valley artifacts.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildVideoPrompt(product: ProductLike): string {
  const subject = product.category ?? product.name;
  return [
    `Short cinematic vertical product ad (9:16) for the LIAXIS brand.`,
    `A real-looking adult female model naturally wearing/using "${product.name}" (${subject}) in a bright, everyday indoor setting.`,
    `Dynamic but smooth camera movement: start with a medium shot of the model moving naturally, cut to a close-up detail of the product, end on a confident natural smile.`,
    `Brand mood: ${BRAND_TONE}.`,
    `Natural motion, no jump cuts that break anatomy, no on-screen text, realistic lighting continuity between cuts.`,
  ].join(" ");
}
