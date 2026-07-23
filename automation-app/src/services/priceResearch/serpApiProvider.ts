import { env, MissingConfigError } from "@/lib/env";
import type { PriceProvider, PriceQuote } from "./types";

type SerpApiShoppingResult = {
  source?: string;
  extracted_price?: number;
  price?: string;
  link?: string;
};

type SerpApiResponse = {
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
};

/**
 * Rakip e-ticaret sitelerini doğrudan scrape etmek yerine SerpApi'nin Google
 * Shopping sonuçlarını kullanıyoruz: ToS riski taşımaz, sonuç yapısı stabildir
 * ve tek bir sorguyla onlarca satıcının fiyatına erişilir.
 */
export class SerpApiPriceProvider implements PriceProvider {
  readonly name = "serpapi-google-shopping";

  async searchPrices(query: string): Promise<PriceQuote[]> {
    if (!env.serpApiKey) {
      throw new MissingConfigError("SERPAPI_API_KEY");
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", "tr");
    url.searchParams.set("hl", "tr");
    url.searchParams.set("api_key", env.serpApiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`SerpApi isteği başarısız: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as SerpApiResponse;
    if (data.error) {
      throw new Error(`SerpApi hata döndürdü: ${data.error}`);
    }

    return (data.shopping_results ?? [])
      .filter((r) => typeof r.extracted_price === "number")
      .map((r) => ({
        source: r.source ?? "Bilinmeyen satıcı",
        price: r.extracted_price as number,
        currency: "TRY",
        url: r.link,
      }));
  }
}
