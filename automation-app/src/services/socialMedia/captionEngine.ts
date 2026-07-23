type ProductLike = {
  name: string;
  description: string | null;
  category: string | null;
};

const BASE_HASHTAGS = ["#LIAXIS", "#DuruşDesteği", "#Konfor", "#Özgüven", "#GünlükKullanım"];

function categoryHashtag(category: string | null): string | null {
  if (!category) return null;
  const slug = category
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "");
  return slug ? `#${slug}` : null;
}

/** Ürün bilgisinden marka tonuna uygun (duruş desteği, konfor, özgüven) Türkçe caption + hashtag üretir. */
export function buildCaption(product: ProductLike): string {
  const hook = `${product.name} ile gün boyu doğru duruş, gerçek konfor.`;
  const body = product.description ? product.description.trim() : "Kendine güvenin her adımda yanında.";
  const cta = "Detaylar ve satın alma linki profilimizde 🛍️";

  const hashtags = [categoryHashtag(product.category), ...BASE_HASHTAGS].filter((h): h is string => Boolean(h));

  return [hook, body, cta, hashtags.join(" ")].join("\n\n");
}
