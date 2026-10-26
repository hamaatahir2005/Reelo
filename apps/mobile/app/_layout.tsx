import "../src/lib/i18n";
import React, { useEffect, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  NotoSansArabic_400Regular,
} from "@expo-google-fonts/noto-sans-arabic";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "../src/lib/supabase";
import { usePreferences } from "../src/lib/store";
import { Label } from "../src/ui";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000, gcTime: 120000 } },
});
export default function Root() {
  const pathname = usePathname();
  const [fonts, error] = useFonts({
    NotoSansArabic: NotoSansArabic_400Regular,
  });
  const { i18n, t } = useTranslation();
  const locale = usePreferences((s) => s.locale);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (locale) void i18n.changeLanguage(locale);
  }, [locale, i18n]);
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setReady(true);
      if (!session) {
        client.clear();
        if (pathname !== "/auth/callback") router.replace("/auth");
      } else if (event === "PASSWORD_RECOVERY")
        router.replace("/auth?mode=newPassword");
      else if (event === "SIGNED_IN") router.replace("/(tabs)");
    });
    supabase.auth.getSession().then(({ data }) => {
      setReady(true);
      if (!data.session && pathname !== "/auth/callback")
        router.replace("/auth");
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <QueryClientProvider client={client}>
      <View style={{ flex: 1, direction: i18n.dir() }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation:
              i18n.dir() === "rtl" ? "slide_from_left" : "slide_from_right",
          }}
        />
        {((!fonts && !error) || !ready) && <View style={{position:"absolute",inset:0,backgroundColor:"#11111B",justifyContent:"center",padding:24}}><Label>{t("loading")}</Label></View>}
      </View>
    </QueryClientProvider>
  );
}
