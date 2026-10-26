import React, { useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { report } from "@reelo/validation";
import { supabase, uid } from "../src/lib/supabase";
import { Screen, Label, Field, Button } from "../src/ui";
export default function Report() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: string }>();
  const { t } = useTranslation();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const r = report.parse({ targetId: id, kind, reason, details });
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: await uid(),
          target_id: r.targetId,
          kind: r.kind,
          reason: r.reason,
          details: r.details,
        });
      if (error) throw error;
      Alert.alert(t("reportReceived"));
      router.back();
    } catch {
      Alert.alert(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Label>{t("report")}</Label>
      {["spam", "harassment", "violence", "sexual", "copyright", "other"].map(
        (r) => (
          <Button
            key={r}
            title={(reason === r ? "✓ " : "") + t(r)}
            onPress={() => setReason(r)}
          />
        ),
      )}
      <Field
        value={details}
        onChangeText={setDetails}
        maxLength={2000}
        multiline
        placeholder={t("details")}
        accessibilityLabel={t("details")}
      />
      <Button title={t("send")} disabled={busy} onPress={() => void send()} />
    </Screen>
  );
}
