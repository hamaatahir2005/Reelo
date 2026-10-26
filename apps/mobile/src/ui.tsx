import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { usePreferences } from "./lib/store";
export function useColors() {
  const light = usePreferences((s) => s.theme) === "light";
  return {
    bg: light ? "#F8FAFC" : "#11111B",
    fg: light ? "#11111B" : "#F8FAFC",
    card: light ? "#E2E8F0" : "#212132",
    muted: light ? "#475569" : "#BAC0D0",
    accent: "#8B5CF6",
  };
}
export function Label({
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const c = useColors();
  const { i18n } = useTranslation();
  return (
    <Text
      {...props}
      style={[
        {
          color: c.fg,
          fontFamily: "NotoSansArabic",
          writingDirection: i18n.dir(),
          textAlign: i18n.dir() === "rtl" ? "right" : "left",
        },
        props.style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const c = useColors();
  const { i18n } = useTranslation();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg, direction: i18n.dir() }}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: "#8B5CF6",
        padding: 14,
        minHeight: 48,
        borderRadius: 16,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        alignItems: "center",
      })}
    >
      <Text
        style={{
          color: "#FFF",
          fontFamily: "NotoSansArabic",
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  const { i18n } = useTranslation();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          color: c.fg,
          backgroundColor: c.card,
          padding: 14,
          minHeight: 52,
          borderRadius: 14,
          fontFamily: "NotoSansArabic",
          textAlign: i18n.dir() === "rtl" ? "right" : "left",
        },
        props.style,
      ]}
    />
  );
}
export function State({
  loading,
  error,
  retry,
  empty,
}: {
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  empty?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ padding: 24, gap: 14 }}>
      {loading ? (
        <>
          <View
            style={{
              height: 120,
              backgroundColor: "#29293B",
              borderRadius: 16,
            }}
          />
          <ActivityIndicator accessibilityLabel={t("loading")} />
        </>
      ) : error ? (
        <>
          <Label accessibilityRole="alert">{t("requestFailed")}</Label>
          {retry && <Button title={t("retry")} onPress={retry} />}
        </>
      ) : empty ? (
        <Label>{t("empty")}</Label>
      ) : null}
    </View>
  );
}
export const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800" },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  card: { padding: 16, borderRadius: 18, backgroundColor: "#212132", gap: 10 },
});
