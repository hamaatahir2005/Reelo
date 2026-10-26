import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase, uid } from "../../src/lib/supabase";
import { Screen, Label, Field, Button, State } from "../../src/ui";
export default function Comments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["comments", id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from("comments")
        .select("*,profiles(username)")
        .eq("video_id", id)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
  async function send() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          video_id: id,
          user_id: await uid(),
          body: body.trim(),
          parent_id: parent,
        });
      if (error) throw error;
      setBody("");
      setParent(null);
      await client.invalidateQueries({ queryKey: ["comments", id] });
      await client.invalidateQueries({ queryKey: ["feed"] });
    } catch {
      Alert.alert(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Label>{t("comments")}</Label>
      <State
        loading={q.isPending}
        error={q.error}
        empty={!q.isPending && !q.data?.pages[0]?.length}
      />
      {q.data?.pages.flat().map((c) => (
        <View
          key={c.id}
          style={{
            padding: 12,
            borderBottomWidth: 1,
            borderColor: "#444",
            gap: 8,
          }}
        >
          <Label>
            @{c.profiles?.username} {c.parent_id ? "↳" : ""}
          </Label>
          <Label>{c.body}</Label>
          <Button title={t("reply")} onPress={() => setParent(c.id)} />
        </View>
      ))}
      {q.hasNextPage && (
        <Button title={t("loadMore")} onPress={() => void q.fetchNextPage()} />
      )}
      <Field
        value={body}
        onChangeText={setBody}
        maxLength={2000}
        placeholder={t(parent ? "reply" : "comment")}
        accessibilityLabel={t("comment")}
      />
      {parent && <Button title={t("cancel")} onPress={() => setParent(null)} />}
      <Button
        title={t("send")}
        disabled={busy || !body.trim()}
        onPress={() => void send()}
      />
    </Screen>
  );
}
