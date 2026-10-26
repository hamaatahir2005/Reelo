import React from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase, uid } from "./lib/supabase";
import { Screen, Label, Button, State } from "./ui";
export function Profile({ id, own = false }: { id: string; own?: boolean }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["profile", id],
    enabled: !!id,
    queryFn: async () => {
      const [p, v, followers, following] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase
          .from("videos")
          .select("id,caption,status")
          .eq("creator_id", id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("follows")
          .select("*", { head: true, count: "exact" })
          .eq("following_id", id)
          .eq("status", "accepted"),
        supabase
          .from("follows")
          .select("*", { head: true, count: "exact" })
          .eq("follower_id", id)
          .eq("status", "accepted"),
      ]);
      if (p.error || v.error) throw p.error || v.error;
      return {
        profile: p.data,
        videos: v.data,
        followers: followers.count,
        following: following.count,
      };
    },
  });
  async function action(kind: string) {
    try {
      if (kind === "block" || kind === "mute") {
        const { error } = await supabase
          .from(kind === "block" ? "user_blocks" : "user_mutes")
          .upsert(
            kind === "block"
              ? { blocker_id: await uid(), blocked_id: id }
              : { user_id: await uid(), muted_id: id },
          );
        if (error) throw error;
        await client.invalidateQueries();
        router.back();
      } else {
        const { error } = await supabase.rpc(kind, { target: id });
        if (error) throw error;
        await q.refetch();
        Alert.alert(t("done"));
      }
    } catch {
      Alert.alert(t("requestFailed"));
    }
  }
  return (
    <Screen>
      <State loading={q.isPending} error={q.error} />
      {q.data && (
        <>
          <Label style={{ fontSize: 28 }}>
            {q.data.profile.display_name || "@" + q.data.profile.username}
          </Label>
          <Label style={{ writingDirection: "ltr" }}>
            @{q.data.profile.username}
          </Label>
          <Label>{q.data.profile.bio}</Label>
          <Label>
            {t("followers")}: {q.data.followers} · {t("following")}:{" "}
            {q.data.following}
          </Label>
          {own ? (
            <>
              <Button
                title={t("settings")}
                onPress={() => router.push("/settings")}
              />
              <Button
                title={t("saved")}
                onPress={() => router.push("/saved")}
              />
              <Button
                title={t("notifications")}
                onPress={() => router.push("/notifications")}
              />
            </>
          ) : (
            <>
              {["follow_user", "unfollow_user", "block", "mute"].map((k) => (
                <Button key={k} title={t(k)} onPress={() => void action(k)} />
              ))}
              <Button
                title={t("report")}
                onPress={() =>
                  router.push({
                    pathname: "/report",
                    params: { id, kind: "user" },
                  })
                }
              />
              <Button
                title={t("message")}
                onPress={() => {
                  void supabase
                    .rpc("start_conversation", { target: id })
                    .then(({ data, error }) => {
                      if (error) Alert.alert(t("messagingUnavailable"));
                      else
                        router.push({
                          pathname: "/chat/[id]",
                          params: { id: data },
                        });
                    });
                }}
              />
            </>
          )}
          {q.data.videos.map((v) => (
            <Button
              key={v.id}
              title={`${v.caption || t("video")} · ${t(v.status)}`}
              onPress={() =>
                router.push({ pathname: "/video/[id]", params: { id: v.id } })
              }
            />
          ))}
        </>
      )}
    </Screen>
  );
}
