import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";
import { env } from "@/lib/env";

const VIDEO_PROVIDER_KEY = "videoProvider";

export type VideoProvider = "veo" | "kling";

export async function getVideoProvider(): Promise<VideoProvider> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, VIDEO_PROVIDER_KEY)).limit(1);
  const value = row?.value;
  return value === "veo" || value === "kling" ? value : env.defaultVideoProvider;
}

export async function setVideoProvider(provider: VideoProvider): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: VIDEO_PROVIDER_KEY, value: provider })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: provider } });
}
