import { env, MissingConfigError } from "@/lib/env";

export function isShopifyConfigured(): boolean {
  return Boolean(env.shopify.storeDomain && env.shopify.accessToken);
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

/** Thin wrapper around the Shopify Admin GraphQL API. */
export async function shopifyGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!env.shopify.storeDomain) throw new MissingConfigError("SHOPIFY_STORE_DOMAIN");
  if (!env.shopify.accessToken) throw new MissingConfigError("SHOPIFY_ADMIN_API_ACCESS_TOKEN");

  const url = `https://${env.shopify.storeDomain}/admin/api/${env.shopify.apiVersion}/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.shopify.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify API isteği başarısız: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL hatası: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Shopify GraphQL yanıtı boş döndü.");
  }
  return json.data;
}

/** Raises a Shopify "user error" list (userErrors on most mutations) as a JS error. */
export function assertNoUserErrors(
  userErrors: { field?: string[] | null; message: string }[] | undefined,
  context: string,
) {
  if (userErrors && userErrors.length > 0) {
    throw new Error(`${context}: ${userErrors.map((e) => e.message).join("; ")}`);
  }
}
