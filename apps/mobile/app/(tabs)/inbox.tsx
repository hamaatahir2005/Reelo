import React, { useEffect } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "../../src/lib/supabase";
import { Screen, Label, Button, State } from "../../src/ui";
export default function Inbox() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const c = supabase
      .channel("inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void q.refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(c);
    };
  }, [q.refetch]);
  return (
    <Screen>
      <Label>{t("inbox")}</Label>
      <Label>{t("messagingNotice")}</Label>
      <State
        loading={q.isPending}
        error={q.error}
        empty={!q.isPending && !q.data?.length}
      />
      {q.data?.map((c, i) => (
        <Button
          key={c.id}
          title={`${t("conversation")} ${i + 1}`}
          onPress={() =>
            router.push({ pathname: "/chat/[id]", params: { id: c.id } })
          }
        />
      ))}
    </Screen>
  );
}
