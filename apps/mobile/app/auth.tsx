import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { supabase } from "../src/lib/supabase";
import { credentials } from "@reelo/validation";
import { Screen, Label, Field, Button, styles } from "../src/ui";
import { usePreferences } from "../src/lib/store";
export default function Auth() {
  const { mode: initial } = useLocalSearchParams<{ mode: string }>();
  const [mode, setMode] = useState(initial || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();
  const prefs = usePreferences();
  useEffect(() => {
    if (initial) setMode(initial);
  }, [initial]);
  async function submit() {
    setBusy(true);
    try {
      let error;
      if (mode === "reset") {
        if (!email.includes("@")) throw new Error("invalidInput");
        ({ error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL("/auth/callback", {
            queryParams: { next: "recovery" },
          }),
        }));
      } else if (mode === "newPassword") {
        if (password.length < 12) throw new Error("invalidInput");
        ({ error } = await supabase.auth.updateUser({ password }));
      } else {
        const input = credentials.parse({ email, password });
        if (mode === "register")
          ({ error } = await supabase.auth.signUp({
            ...input,
            options: { emailRedirectTo: Linking.createURL("/auth/callback") },
          }));
        else ({ error } = await supabase.auth.signInWithPassword(input));
      }
      if (error) throw error;
      if (mode !== "login") Alert.alert(t("checkEmail"));
      if (mode === "newPassword") router.replace("/(tabs)");
    } catch {
      Alert.alert(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  if (!prefs.onboarded)
    return (
      <Screen>
        <Label style={styles.title}>Reelo</Label>
        <Label>{t("tagline")}</Label>
        <Label>{t("onboarding")}</Label>
        {(["ckb", "ar", "en"] as const).map((locale) => (
          <Button
            key={locale}
            title={{ ckb: "کوردی", ar: "العربية", en: "English" }[locale]}
            onPress={() => prefs.set({ locale, onboarded: true })}
          />
        ))}
      </Screen>
    );
  return (
    <Screen>
      <Label style={styles.title}>Reelo</Label>
      <Label>{t(mode)}</Label>
      {mode !== "newPassword" && (
        <Field
          accessibilityLabel={t("email")}
          placeholder={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      )}
      {mode !== "reset" && (
        <Field
          accessibilityLabel={t("password")}
          placeholder={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}
      <Label>{t("passwordHint")}</Label>
      <Button title={t(mode)} disabled={busy} onPress={() => void submit()} />
      {["login", "register", "reset"]
        .filter((m) => m !== mode)
        .map((m) => (
          <Button key={m} title={t(m)} onPress={() => setMode(m)} />
        ))}
    </Screen>
  );
}
