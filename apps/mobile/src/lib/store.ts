import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "@reelo/shared";
export const usePreferences = create(
  persist<{
    locale: Locale | null;
    theme: "dark" | "light";
    onboarded: boolean;
    set: (
      v: Partial<{
        locale: Locale;
        theme: "dark" | "light";
        onboarded: boolean;
      }>,
    ) => void;
  }>(
    (set) => ({
      locale: null,
      theme: "dark",
      onboarded: false,
      set: (v) => set(v),
    }),
    {
      name: "reelo-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
