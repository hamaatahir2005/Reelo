import { supabase } from "./supabase";
// An anonymous permission denial is expected: it confirms the object exists
// while preserving the database's authenticated-only grants.
export async function databaseReady(): Promise<boolean> {
  const results = await Promise.all([
    supabase.from("profiles").select("id").limit(0),
    supabase.from("feature_flags").select("key").limit(0),
    supabase.rpc("ranked_feed", { page_offset: 0 }),
  ]);
  if (results.some(({ error }) => error && ["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code))) return false;
  const failure = results.find(({ error }) => error && error.code !== "42501");
  if (failure?.error) throw failure.error;
  return true;
}
