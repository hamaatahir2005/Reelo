import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase, uid } from "../src/lib/supabase";
import { Screen, Label, Button, State } from "../src/ui";
export default function Notifications() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", await uid())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const c = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => void q.refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(c);
    };
  }, [q.refetch]);
  return (
    <Screen>
      <Label>{t("notifications")}</Label>
      <State
        loading={q.isPending}
        error={q.error}
        empty={!q.isPending && !q.data?.length}
      />
      {q.data?.map((n) => (
        <Button
          key={n.id}
          title={t(n.kind) + (n.read_at ? "" : " •")}
          onPress={() => {
            void supabase
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .eq("id", n.id)
              .then(() => q.refetch());
          }}
        />
      ))}
    </Screen>
  );
}
