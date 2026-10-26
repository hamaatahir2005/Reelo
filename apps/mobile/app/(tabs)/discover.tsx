import React, { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "../../src/lib/supabase";
import { Screen, Label, Field, Button, State } from "../../src/ui";
export default function Discover() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const text = term.replace(/[%_,()]/g, "").slice(0, 80);
      const [users, videos] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,username")
          .ilike("username", `%${text.replace("#", "")}%`)
          .limit(20),
        supabase
          .from("videos")
          .select("id,caption")
          .eq("status", "ready")
          .ilike("caption", `%${text}%`)
          .limit(20),
      ]);
      if (users.error || videos.error) throw users.error || videos.error;
      return { users: users.data, videos: videos.data };
    },
  });
  return (
    <Screen>
      <Label>{t("discover")}</Label>
      <Field
        value={input}
        onChangeText={setInput}
        placeholder={t("searchHint")}
        accessibilityLabel={t("search")}
      />
      <Button title={t("search")} onPress={() => setTerm(input.trim())} />
      <State
        loading={q.isFetching}
        error={q.error}
        empty={!!q.data && !q.data.users.length && !q.data.videos.length}
      />
      {q.data?.users.map((u) => (
        <Button
          key={u.id}
          title={"@" + u.username}
          onPress={() =>
            router.push({ pathname: "/user/[id]", params: { id: u.id } })
          }
        />
      ))}
      {q.data?.videos.map((v) => (
        <Button
          key={v.id}
          title={v.caption || t("video")}
          onPress={() =>
            router.push({ pathname: "/video/[id]", params: { id: v.id } })
          }
        />
      ))}
    </Screen>
  );
}
