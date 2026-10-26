import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
test("locale resources have matching keys and real translations", () => {
  const data = ["en", "ar", "ckb"].map((l) =>
    JSON.parse(readFileSync(`packages/shared/src/locales/${l}.json`)),
  );
  for (const d of data)
    assert.deepEqual(Object.keys(d).sort(), Object.keys(data[0]).sort());
  assert.notEqual(data[0].login, data[2].login);
});
test("all declared tables enable RLS and media bucket is private", () => {
  const sql = readdirSync("supabase/migrations")
    .sort()
    .map((f) => readFileSync("supabase/migrations/" + f, "utf8"))
    .join("\n");
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map(
    (m) => m[1],
  );
  for (const name of tables)
    assert.match(
      sql,
      new RegExp(`alter table public\\.${name} enable row level security`),
    );
  assert.match(sql, /'videos','videos',false/);
  assert.doesNotMatch(sql, /create policy.*for insert.*storage\.objects/);
});
test("EAS profiles produce the requested formats", () => {
  const e = JSON.parse(readFileSync("apps/mobile/eas.json"));
  assert.equal(e.build.preview.android.buildType, "apk");
  assert.equal(e.build.production.android.buildType, "app-bundle");
  assert.equal(e.build["ios-production"].ios.simulator, false);
});
