import { supabase, uid } from "./supabase";
import type { Video } from "@reelo/shared";
export async function feed(
  mode: string,
  offset = 0,
  asOf = new Date().toISOString(),
): Promise<Video[]> {
  const { data, error } = await supabase.rpc("ranked_feed", {
    mode,
    page_offset: offset,
    as_of: asOf,
  });
  if (error) throw error;
  return data || [];
}
export async function playback(id: string) {
  const { data, error } = await supabase
    .from("video_assets")
    .select("storage_path")
    .eq("video_id", id)
    .eq("kind", "original")
    .eq("verified", true)
    .single();
  if (error) throw error;
  const { data: url, error: e } = await supabase.storage
    .from("videos")
    .createSignedUrl(data.storage_path, 300);
  if (e) throw e;
  return url.signedUrl;
}
export async function toggle(table: "likes" | "saved_videos", videoId: string) {
  const user = await uid();
  const { data, error } = await supabase
    .from(table)
    .select("video_id")
    .eq("user_id", user)
    .eq("video_id", videoId)
    .maybeSingle();
  if (error) throw error;
  const result = data
    ? await supabase
        .from(table)
        .delete()
        .eq("user_id", user)
        .eq("video_id", videoId)
    : await supabase.from(table).insert({ user_id: user, video_id: videoId });
  if (result.error) throw result.error;
  return !data;
}
