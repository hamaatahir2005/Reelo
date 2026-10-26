import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { message } from "@reelo/validation";
import { supabase, uid } from "../../src/lib/supabase";
import { Screen, Label, Field, Button, State } from "../../src/ui";
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState("");
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["chat", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.reverse();
    },
  });
  useEffect(() => {
    const c = supabase
      .channel("chat:" + id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + id,
        },
        () => void q.refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(c);
    };
  }, [id, q.refetch]);
  async function send() {
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: id,
          sender_id: await uid(),
          body: message.parse(body),
        });
      if (error) throw error;
      setBody("");
      await q.refetch();
    } catch {
      Alert.alert(t("requestFailed"));
    }
  }
  return (
    <Screen>
      <Label>{t("conversation")}</Label>
      <State loading={q.isPending} error={q.error} />
      {q.data?.map((m) => (
        <Label key={m.id}>{m.body}</Label>
      ))}
      <Field
        value={body}
        onChangeText={setBody}
        maxLength={4000}
        placeholder={t("message")}
        accessibilityLabel={t("message")}
      />
      <Button
        title={t("send")}
        disabled={!body.trim()}
        onPress={() => void send()}
      />
    </Screen>
  );
}
