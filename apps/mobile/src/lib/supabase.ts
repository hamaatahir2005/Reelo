import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform, AppState } from "react-native";
export const configured = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);
// Chunk tokens because native secure stores may enforce small item limits.
const storage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return sessionStorage.getItem(key);
    const n = Number(await SecureStore.getItemAsync(key + ".n"));
    if (!n) return null;
    let out = "";
    for (let i = 0; i < n; i++) {
      const part = await SecureStore.getItemAsync(key + "." + i);
      if (part === null) return null;
      out += part;
    }
    return out;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      sessionStorage.setItem(key, value);
      return;
    }
    await storage.removeItem(key);
    const parts = value.match(/[\s\S]{1,1500}/g) || [];
    for (let i = 0; i < parts.length; i++)
      await SecureStore.setItemAsync(key + "." + i, parts[i]);
    await SecureStore.setItemAsync(key + ".n", String(parts.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      sessionStorage.removeItem(key);
      return;
    }
    const n = Number(await SecureStore.getItemAsync(key + ".n"));
    for (let i = 0; i < n; i++)
      await SecureStore.deleteItemAsync(key + "." + i);
    await SecureStore.deleteItemAsync(key + ".n");
  },
};
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://unconfigured.invalid",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "unconfigured",
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  },
);
AppState.addEventListener("change", (s) => {
  if (s === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
export async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error || data?.error)
    throw new Error(data?.error || error?.message || "requestFailed");
  return data;
}
export async function uid() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("unauthorized");
  return user.id;
}
