export type PriceQuote = {
  source: string;
  price: number;
  currency: string;
  url?: string;
};

export interface PriceProvider {
  readonly name: string;
  /** Returns raw price quotes found for the given search query. Empty array if none found. */
  searchPrices(query: string): Promise<PriceQuote[]>;
}
