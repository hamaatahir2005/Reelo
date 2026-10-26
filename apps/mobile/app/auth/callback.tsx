import React, { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { Screen, Label } from "../../src/ui";
import { useTranslation } from "react-i18next";
export default function Callback() {
  const url = Linking.useURL();
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();
  useEffect(() => {
    if (!url) return;
    const code = new URL(url).searchParams.get("code");
    if (!code) {
      setFailed(true);
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setFailed(true);
      else
        router.replace(
          new URL(url).searchParams.get("next") === "recovery"
            ? "/auth?mode=newPassword"
            : "/(tabs)",
        );
    });
  }, [url]);
  return (
    <Screen>
      <Label>{t(failed ? "requestFailed" : "loading")}</Label>
    </Screen>
  );
}
