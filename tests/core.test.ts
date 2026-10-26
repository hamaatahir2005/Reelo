import { describe, it, expect } from "vitest";
import {
  username,
  credentials,
  upload,
  hashtags,
  message,
} from "../packages/validation/src";
import { rank } from "../packages/shared/src";
import { inspectMp4 } from "../supabase/functions/_shared/mp4";
import en from "../packages/shared/src/locales/en.json";
import ar from "../packages/shared/src/locales/ar.json";
import ckb from "../packages/shared/src/locales/ckb.json";
describe("inputs", () => {
  it("validates usernames, passwords and messages", () => {
    expect(username.parse("HELLO_1")).toBe("hello_1");
    expect(username.safeParse("a/b").success).toBe(false);
    expect(
      credentials.safeParse({ email: "invalid", password: "short" }).success,
    ).toBe(false);
    expect(message.safeParse("   ").success).toBe(false);
  });
  it("limits uploads and extracts Unicode hashtags", () => {
    expect(
      upload.safeParse({
        size: 104857601,
        mime: "video/mp4",
        duration: 10,
        width: 1080,
        height: 1920,
        caption: "",
        visibility: "public",
      }).success,
    ).toBe(false);
    expect(hashtags("#کوردستان #عربي #video #video")).toEqual([
      "کوردستان",
      "عربي",
      "video",
    ]);
  });
});
it("ranks fresh followed content and penalizes repeats", () => {
  const base = {
    completion: 0.5,
    likes: 10,
    followed: false,
    ageHours: 2,
    seen: false,
    creatorRepeated: false,
  };
  expect(rank({ ...base, followed: true })).toBeGreaterThan(rank(base));
  expect(rank({ ...base, seen: true })).toBeLessThan(rank(base));
});
it("has equal nonempty translation keys", () => {
  for (const locale of [ar, ckb]) {
    expect(Object.keys(locale).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(locale).every((v) => v.trim().length > 0)).toBe(true);
  }
  expect(ckb.username).not.toBe(en.username);
});
function box(type: string, data: Uint8Array) {
  const b = new Uint8Array(data.length + 8);
  new DataView(b.buffer).setUint32(0, b.length);
  b.set(
    [...type].map((c) => c.charCodeAt(0)),
    4,
  );
  b.set(data, 8);
  return b;
}
function concat(...parts: Uint8Array[]) {
  const b = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let n = 0;
  for (const p of parts) {
    b.set(p, n);
    n += p.length;
  }
  return b;
}
it("validates MP4 container duration and dimensions, rejects malformed bytes", () => {
  const mv = new Uint8Array(100);
  const v = new DataView(mv.buffer);
  v.setUint32(12, 1000);
  v.setUint32(16, 30000);
  const tk = new Uint8Array(84);
  const t = new DataView(tk.buffer);
  t.setUint32(76, 1080 * 65536);
  t.setUint32(80, 1920 * 65536);
  const bytes = concat(
    box("ftyp", new Uint8Array(8)),
    box("moov", concat(box("mvhd", mv), box("trak", box("tkhd", tk)))),
    box("mdat", new Uint8Array(20)),
  );
  expect(inspectMp4(bytes)).toEqual({
    duration: 30,
    width: 1080,
    height: 1920,
  });
  expect(() => inspectMp4(new Uint8Array(30))).toThrow("invalidMedia");
  v.setUint32(16, 91000);
  expect(() =>
    inspectMp4(
      concat(
        box("ftyp", new Uint8Array(8)),
        box("moov", box("mvhd", mv)),
        box("mdat", new Uint8Array(20)),
      ),
    ),
  ).toThrow();
});
