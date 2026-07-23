import { env, MissingConfigError } from "@/lib/env";

export function isMetaConfigured(): boolean {
  return Boolean(env.meta.pageAccessToken && env.meta.facebookPageId && env.meta.instagramBusinessAccountId);
}

function assertConfigured() {
  if (!env.meta.pageAccessToken) throw new MissingConfigError("META_PAGE_ACCESS_TOKEN");
  if (!env.meta.facebookPageId) throw new MissingConfigError("META_FACEBOOK_PAGE_ID");
  if (!env.meta.instagramBusinessAccountId) throw new MissingConfigError("META_INSTAGRAM_BUSINESS_ACCOUNT_ID");
}

type GraphError = { error?: { message: string; type?: string; code?: number } };

/** Thin wrapper around the Meta Graph API (Facebook Page + Instagram Business). */
export async function metaGraphRequest<T>(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  assertConfigured();
  const url = new URL(`https://graph.facebook.com/${env.meta.apiVersion}${path}`);
  const body = new URLSearchParams({ ...params, access_token: env.meta.pageAccessToken! });

  const res = method === "GET" ? await fetch(`${url.toString()}?${body.toString()}`) : await fetch(url.toString(), { method: "POST", body });

  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    throw new Error(`Meta Graph API hatası: ${json.error?.message ?? `${res.status} ${res.statusText}`}`);
  }
  return json;
}

export function facebookPageId(): string {
  return env.meta.facebookPageId!;
}

export function instagramBusinessAccountId(): string {
  return env.meta.instagramBusinessAccountId!;
}
