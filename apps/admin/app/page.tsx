"use client";
import React, { useEffect, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import { createInstance } from "i18next";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from "react-i18next";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import en from "../../../packages/shared/src/locales/en.json";
import ar from "../../../packages/shared/src/locales/ar.json";
import ckb from "../../../packages/shared/src/locales/ckb.json";
const i18n = createInstance();
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ckb: { translation: ckb },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
const configured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://unconfigured.invalid",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "unconfigured",
  { auth: { persistSession: false, detectSessionInUrl: false } },
);
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
async function call(body: Record<string, unknown>) {
  const { data, error } = await sb.functions.invoke("admin", { body });
  if (error || data?.error) throw new Error(data?.error || "requestFailed");
  return data;
}
function Dashboard() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    const locale = localStorage.getItem("reelo-admin-locale");
    if (locale && ["en", "ar", "ckb"].includes(locale))
      void i18n.changeLanguage(locale);
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) client.clear();
    });
    return () => subscription.unsubscribe();
  }, [client, i18n]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir();
  }, [i18n.language, i18n]);
  const role = useQuery({
    queryKey: ["role", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", session!.user.id)
        .single();
      if (error) throw error;
      return data.role;
    },
  });
  const query = useQuery({
    queryKey: ["admin", tab, term],
    enabled: !!session && !!role.data,
    queryFn: () => call({ action: tab, search: term }),
  });
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
    } catch {
      setError(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function mutate(
    action: string,
    target?: string,
    key?: string,
    enabled?: boolean,
  ) {
    if (reason.trim().length < 5) {
      setError(t("reason"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await call({ action, target, key, enabled, reason });
      await client.invalidateQueries({ queryKey: ["admin"] });
      setReason("");
    } catch {
      setError(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  const rows = Array.isArray(query.data) ? query.data : [];
  const columns = rows.length
    ? Object.keys(rows[0])
        .filter((k) => !["payload", "details", "avatar_path"].includes(k))
        .slice(0, 6)
    : [];
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#343449] p-6">
        <div>
          <span className="text-3xl font-black text-violet-400">◩ REELO</span>
          <p className="text-sm text-slate-400">{t("admin")}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            aria-label={t("language")}
            value={i18n.language}
            onChange={(e) => {
              void i18n.changeLanguage(e.target.value);
              localStorage.setItem("reelo-admin-locale", e.target.value);
            }}
          >
            <option value="en">English</option>
            <option value="ckb">کوردی</option>
            <option value="ar">العربية</option>
          </select>
          {session && (
            <button
              className="btn quiet"
              onClick={() => void sb.auth.signOut()}
            >
              {t("logout")}
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {!configured ? (
          <p role="alert">{t("setupRequired")}</p>
        ) : !session ? (
          <form
            onSubmit={(e) => void login(e)}
            className="card mx-auto mt-12 grid max-w-md gap-5"
          >
            <h1>{t("login")}</h1>
            <label className="grid gap-2">
              {t("email")}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label className="grid gap-2">
              {t("password")}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button className="btn" disabled={busy}>
              {t("login")}
            </button>
          </form>
        ) : role.isPending ? (
          <p>{t("loading")}</p>
        ) : !role.data ? (
          <p role="alert">{t("noAdmin")}</p>
        ) : (
          <>
            <nav className="flex flex-wrap gap-3" aria-label={t("admin")}>
              {[
                "overview",
                "users",
                "videos",
                "reports",
                ...(role.data === "admin" ? ["audit", "flags"] : []),
              ].map((k) => (
                <button
                  key={k}
                  className={"btn " + (tab === k ? "" : "quiet")}
                  onClick={() => setTab(k)}
                >
                  {t(k)}
                </button>
              ))}
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1>{t(tab)}</h1>
              <button
                className="btn quiet"
                onClick={() => void query.refetch()}
              >
                {t("retry")}
              </button>
            </div>
            {tab === "users" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setTerm(search);
                }}
                className="flex gap-3"
              >
                <input
                  aria-label={t("search")}
                  placeholder={t("username")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn">{t("search")}</button>
              </form>
            )}
            {query.isFetching && <p aria-live="polite">{t("loading")}</p>}
            {query.error && (
              <p role="alert" className="error">
                {t("requestFailed")}
              </p>
            )}
            {tab === "overview" && query.data && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(query.data).map(([key, value]) => (
                  <div className="card" key={key}>
                    <p className="text-slate-400">
                      {t(key === "profiles" ? "users" : key)}
                    </p>
                    <p className="mt-3 text-4xl font-bold">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
            {tab !== "overview" && (
              <>
                <label className="grid max-w-xl gap-2">
                  {t("reason")}
                  <textarea
                    value={reason}
                    maxLength={2000}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div className="card overflow-x-auto">
                  {!rows.length ? (
                    <p>{t("empty")}</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          {columns.map((k) => (
                            <th key={k}>{t(k)}</th>
                          ))}
                          <th>{t("admin")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r: any, index: number) => (
                          <tr key={r.id || r.key || index}>
                            {columns.map((k) => (
                              <td key={k}>
                                {typeof r[k] === "boolean"
                                  ? String(r[k])
                                  : String(r[k] ?? "—")}
                              </td>
                            ))}
                            <td>
                              {tab === "videos" && r.status !== "removed" && (
                                <button
                                  className="btn"
                                  disabled={busy}
                                  onClick={() => void mutate("moderate", r.id)}
                                >
                                  {t("moderate")}
                                </button>
                              )}
                              {tab === "users" && role.data === "admin" && (
                                <button
                                  className="btn"
                                  disabled={busy}
                                  onClick={() => void mutate("restrict", r.id)}
                                >
                                  {t("restrict")}
                                </button>
                              )}
                              {tab === "flags" && (
                                <button
                                  className="btn"
                                  disabled={
                                    busy ||
                                    ["live", "purchases", "payouts"].includes(
                                      r.key,
                                    )
                                  }
                                  onClick={() =>
                                    void mutate(
                                      "flag",
                                      undefined,
                                      r.key,
                                      !r.enabled,
                                    )
                                  }
                                >
                                  {r.enabled ? "✓" : "○"} {t(r.key)}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
export default function Page() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <Dashboard />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
