import { z } from "zod";
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/, "usernameInvalid");
export const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
});
export const caption = z.string().trim().max(2200);
export const report = z.object({
  targetId: z.string().uuid(),
  kind: z.enum(["video", "user", "comment", "message"]),
  reason: z.enum([
    "spam",
    "harassment",
    "violence",
    "sexual",
    "copyright",
    "other",
  ]),
  details: z.string().max(2000).default(""),
});
export const upload = z.object({
  size: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024),
  mime: z.literal("video/mp4"),
  duration: z.number().positive().max(90),
  width: z.number().int().min(144).max(3840),
  height: z.number().int().min(144).max(3840),
  caption,
  visibility: z.enum(["public", "followers", "private"]),
});
export const message = z.string().trim().min(1).max(4000);
export function hashtags(text: string): string[] {
  return [
    ...new Set(
      (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((s) =>
        s.slice(1).toLowerCase(),
      ),
    ),
  ].slice(0, 20);
}
