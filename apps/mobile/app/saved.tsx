import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { supabase, uid } from "../src/lib/supabase";
import { Screen, Label, Button, State } from "../src/ui";
export default function Saved() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["saved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_videos")
        .select("video_id,videos(caption)")
        .eq("user_id", await uid())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
  return (
    <Screen>
      <Label>{t("saved")}</Label>
      <State
        loading={q.isPending}
        error={q.error}
        empty={!q.isPending && !q.data?.length}
      />
      {q.data?.map((v) => (
        <Button
          key={v.video_id}
          title={t("video")}
          onPress={() =>
            router.push({ pathname: "/video/[id]", params: { id: v.video_id } })
          }
        />
      ))}
    </Screen>
  );
}
