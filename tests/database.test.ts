import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  c = "33333333-3333-4333-8333-333333333333";
const video = "44444444-4444-4444-8444-444444444444";
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema public,auth,storage to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;`,
  );
  for (const name of readdirSync("supabase/migrations").sort()) {
    const sql = readFileSync("supabase/migrations/" + name, "utf8")
      .replace("create extension if not exists pgcrypto;", "")
      .replace(/alter publication supabase_realtime add table[^;]+;/g, "");
    await db.exec(sql);
  }
  await db.exec(
    `insert into auth.users(id) values('${a}'),('${b}'),('${c}');insert into videos(id,creator_id,status,visibility) values('${video}','${a}','ready','private');`,
  );
});
afterAll(() => db.close());
describe.sequential("PostgreSQL RLS and RPC authorization", () => {
  it("creates profiles and RLS for every public table", async () => {
    const rows = await db.query<{ relname: string }>(
      `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`,
    );
    expect(rows.rows).toEqual([]);
    expect((await db.query("select * from profiles")).rows).toHaveLength(3);
  });
  it("owner can view private media; other users cannot", async () => {
    expect(
      (await asUser(a, () => db.query("select * from videos"))).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(b, () => db.query("select * from videos"))).rows,
    ).toHaveLength(0);
  });
  it("rejects self escalation and forged counts/status", async () => {
    await expect(
      asUser(b, () => db.exec(`insert into user_roles values('${b}','admin')`)),
    ).rejects.toThrow();
    await expect(
      asUser(a, () =>
        db.exec(
          `update videos set status='ready',like_count=500 where id='${video}'`,
        ),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(b, () => db.exec(`update feature_flags set enabled=true`)),
    ).rejects.toThrow();
  });
  it("private-account follows require owner approval", async () => {
    await db.exec(
      `update profiles set is_private=true where id='${a}';update videos set visibility='followers' where id='${video}';`,
    );
    await asUser(b, () => db.exec(`select follow_user('${a}')`));
    expect(
      (await asUser(b, () => db.query("select * from videos"))).rows,
    ).toHaveLength(0);
    await asUser(a, () => db.exec(`select accept_follow('${b}')`));
    expect(
      (await asUser(b, () => db.query("select * from videos"))).rows,
    ).toHaveLength(1);
  });
  it("updates real engagement counts, limits forged view counts", async () => {
    await asUser(b, () =>
      db.exec(
        `insert into likes(user_id,video_id) values('${b}','${video}');select record_watch('${video}',.7);select record_watch('${video}',1);insert into comments(video_id,user_id,body) values('${video}','${b}','سڵاو');`,
      ),
    );
    const result = await db.query<{
      like_count: number;
      view_count: number;
      comment_count: number;
    }>(
      `select like_count,view_count,comment_count from videos where id='${video}'`,
    );
    expect(result.rows[0]).toEqual({
      like_count: 1,
      view_count: 1,
      comment_count: 1,
    });
    await expect(
      asUser(c, () =>
        db.exec(
          `insert into likes(user_id,video_id) values('${b}','${video}')`,
        ),
      ),
    ).rejects.toThrow();
  });
  it("blocks revoke access and delete follow relationships", async () => {
    await asUser(a, () =>
      db.exec(`insert into user_blocks values('${a}','${b}',now())`),
    );
    expect(
      (await asUser(b, () => db.query("select * from videos"))).rows,
    ).toHaveLength(0);
    await expect(
      asUser(b, () => db.exec(`select follow_user('${a}')`)),
    ).rejects.toThrow();
  });
  it("prevents conversation access by nonparticipants", async () => {
    await db.exec(
      `insert into conversations(id) values('${video}');insert into conversation_participants values('${video}','${a}',null),('${video}','${c}',null);update feature_flags set enabled=true where key='messaging';`,
    );
    expect(
      (await asUser(b, () => db.query("select * from conversations"))).rows,
    ).toHaveLength(0);
    await expect(
      asUser(b, () =>
        db.exec(
          `insert into messages(conversation_id,sender_id,body) values('${video}','${b}','intrusion')`,
        ),
      ),
    ).rejects.toThrow();
    await asUser(c, () =>
      db.exec(
        `insert into messages(conversation_id,sender_id,body) values('${video}','${c}','hello')`,
      ),
    );
    expect(
      (await asUser(a, () => db.query("select * from messages"))).rows,
    ).toHaveLength(1);
  });
  it("audits admin actions atomically and keeps financial modules disabled", async () => {
    await db.exec(`insert into user_roles values('${a}','admin');`);
    await expect(
      asUser(b, () =>
        db.exec(
          `select admin_action('${a}','moderate','${video}','reviewed',null,false)`,
        ),
      ),
    ).rejects.toThrow();
    await db.exec(
      `select admin_action('${a}','moderate','${video}','policy violation',null,false)`,
    );
    expect((await db.query("select * from audit_logs")).rows).toHaveLength(1);
    await expect(
      db.exec(
        `select admin_action('${a}','flag',null,'not cleared','purchases',true)`,
      ),
    ).rejects.toThrow();
  });
  it("cascades personal records on account deletion", async () => {
    await db.exec(`delete from auth.users where id='${c}'`);
    expect(
      (await db.query(`select * from messages where sender_id='${c}'`)).rows,
    ).toHaveLength(0);
    expect(
      (await db.query(`select * from profiles where id='${c}'`)).rows,
    ).toHaveLength(0);
  });
});
