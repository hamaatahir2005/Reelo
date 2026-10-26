import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const migrations = readdirSync(resolve(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const header = `-- REELO: first-time setup for a NEW Supabase project only.
-- Run the WHOLE file once in Dashboard > SQL Editor as the project owner.
-- This is transactional: any failure rolls back all setup changes.
-- Do not re-run on an existing installation; use versioned migrations instead.
-- Never paste service-role keys, passwords or access tokens into this file.
begin;
`;
const body = migrations.map((name) => `\n-- ${name}\n${readFileSync(resolve(root, "supabase/migrations", name), "utf8")}`).join("\n");
const footer = `
-- Provision profiles for any real Auth accounts created before setup.
insert into public.profiles(id,username)
select id,'u_'||substr(replace(id::text,'-',''),1,22) from auth.users
on conflict(id) do nothing;
insert into public.account_settings(user_id)
select id from public.profiles on conflict(user_id) do nothing;
notify pgrst, 'reload schema';
commit;
`;
writeFileSync(resolve(root, "supabase/bootstrap.sql"), header + body + footer);
console.log(`Prepared first-time setup from ${migrations.length} migrations.`);
