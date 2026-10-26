import React, { useState } from "react";
import { Alert, Share, Switch } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { username as validateUsername } from "@reelo/validation";
import { supabase, uid, invoke } from "../src/lib/supabase";
import { usePreferences } from "../src/lib/store";
import { Screen, Label, Field, Button } from "../src/ui";
export default function Settings() {
  const { t } = useTranslation();
  const prefs = usePreferences();
  const client = useQueryClient();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", await uid())
        .single();
      if (error) throw error;
      setUsername(data.username);
      setBio(data.bio || "");
      return data;
    },
  });
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      Alert.alert(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const { error } = await supabase
      .from("profiles")
      .update({ username: validateUsername.parse(username), bio })
      .eq("id", await uid());
    if (error) throw error;
    await client.invalidateQueries({ queryKey: ["profile"] });
    Alert.alert(t("done"));
  }
  async function push() {
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(t("permissionDenied"));
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) throw new Error("notConfigured");
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    const { error } = await supabase
      .from("push_tokens")
      .upsert({ user_id: await uid(), token });
    if (error) throw error;
    Alert.alert(t("done"));
  }
  return (
    <Screen>
      <Label>{t("settings")}</Label>
      <Label>{t("language")}</Label>
      {(["ckb", "ar", "en"] as const).map((locale) => (
        <Button
          key={locale}
          title={{ ckb: "کوردی", ar: "العربية", en: "English" }[locale]}
          onPress={() => {
            prefs.set({ locale });
            void uid().then((user_id) =>
              supabase
                .from("account_settings")
                .update({ locale })
                .eq("user_id", user_id),
            );
          }}
        />
      ))}
      <Button
        title={t(prefs.theme === "dark" ? "lightMode" : "darkMode")}
        onPress={() =>
          prefs.set({ theme: prefs.theme === "dark" ? "light" : "dark" })
        }
      />
      <Field
        accessibilityLabel={t("username")}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        maxLength={24}
      />
      <Field
        accessibilityLabel={t("bio")}
        value={bio}
        onChangeText={setBio}
        maxLength={500}
        multiline
      />
      <Button
        title={t("save")}
        disabled={busy}
        onPress={() => void run(save)}
      />
      <Label>{t("privateAccount")}</Label>
      <Switch
        accessibilityLabel={t("privateAccount")}
        value={q.data?.is_private || false}
        onValueChange={(value) =>
          void run(async () => {
            const { error } = await supabase
              .from("profiles")
              .update({ is_private: value })
              .eq("id", await uid());
            if (error) throw error;
            await q.refetch();
          })
        }
      />
      <Button
        title={t("resetRecommendations")}
        onPress={() =>
          void run(async () => {
            const { error } = await supabase.rpc("reset_recommendations");
            if (error) throw error;
            await client.invalidateQueries({ queryKey: ["feed"] });
            Alert.alert(t("done"));
          })
        }
      />
      <Button title={t("enablePush")} onPress={() => void run(push)} />
      <Button
        title={t("exportData")}
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const data = await invoke("account", { action: "export" });
            await Share.share({ message: JSON.stringify(data, null, 2) });
          })
        }
      />
      <Label>{t("deletionWarning")}</Label>
      <Field
        accessibilityLabel={t("password")}
        placeholder={t("password")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={t("deleteAccount")}
        disabled={busy}
        onPress={() =>
          Alert.alert(t("deleteAccount"), t("deletionWarning"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("deleteAccount"),
              style: "destructive",
              onPress: () =>
                void run(async () => {
                  await invoke("account", {
                    action: "reauthenticate",
                    password,
                  });
                  await invoke("account", {
                    action: "delete",
                    confirm: "DELETE",
                  });
                  await supabase.auth.signOut();
                  router.replace("/auth");
                }),
            },
          ])
        }
      />
      <Button
        title={t("logout")}
        onPress={() =>
          void run(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            client.clear();
            router.replace("/auth");
          })
        }
      />
    </Screen>
  );
}
