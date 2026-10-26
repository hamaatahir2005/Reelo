export type Locale = "en" | "ar" | "ckb";
export const brand = {
  name: "Reelo",
  tagline: "Your Videos, Your World",
  primary: "#8B5CF6",
  secondary: "#F43F8B",
  dark: "#11111B",
  light: "#F8FAFC",
};
export type Video = {
  id: string;
  creator_id: string;
  caption: string;
  visibility: "public" | "followers" | "private";
  created_at: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  profiles: { username: string; display_name: string | null } | null;
};
export type RankingSignals = {
  completion: number;
  likes: number;
  followed: boolean;
  ageHours: number;
  seen: boolean;
  creatorRepeated: boolean;
};
export const rankingWeights = {
  completion: 2,
  likes: 0.25,
  follow: 1.4,
  freshness: 2,
  repeatPenalty: 5,
};
export function rank(s: RankingSignals, w = rankingWeights) {
  return (
    Math.max(0, Math.min(1, s.completion)) * w.completion +
    Math.log1p(Math.max(0, s.likes)) * w.likes +
    Number(s.followed) * w.follow +
    w.freshness / (1 + Math.max(0, s.ageHours) / 24) -
    Number(s.seen) * w.repeatPenalty -
    Number(s.creatorRepeated)
  );
}
export interface VideoProvider {
  readonly name: string;
  createUpload(input: {
    path: string;
    mime: string;
  }): Promise<{ url: string; token?: string }>;
  playback(path: string): Promise<{ url: string; type: "mp4" | "hls" }>;
}
export interface LiveProvider {
  start(
    userId: string,
  ): Promise<{ id: string; ingestUrl: string; streamKey: string }>;
  playback(id: string): Promise<string>;
  stop(id: string): Promise<void>;
}
export const modules = { live: false, purchases: false, payouts: false };
