import React, { useEffect, useState, useRef } from "react";
import { View, Pressable, Share, Alert } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { playback, toggle } from "./lib/api";
import { supabase } from "./lib/supabase";
import { Button, Label, State } from "./ui";
import type { Video } from "@reelo/shared";
function Player({
  url,
  active,
  video,
}: {
  url: string;
  active: boolean;
  video: Video;
}) {
  const [muted, setMuted] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });
  const { t } = useTranslation();
  const started = useRef(0);
  useEffect(() => {
    if (active) {
      started.current = Date.now();
      player.play();
    } else player.pause();
    return () => {
      player.pause();
      if (started.current) {
        const completion = Math.min(
          1,
          (Date.now() - started.current) / 1000 / (player.duration || 90),
        );
        if (completion > 0.03)
          void supabase.rpc("record_watch", { v: video.id, completion });
        started.current = 0;
      }
    };
  }, [active, player, video.id]);
  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);
  return (
    <>
      <VideoView
        player={player}
        style={{ position: "absolute", inset: 0 }}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      <View style={{ position: "absolute", top: 12, right: 12 }}>
        <Button
          title={t(muted ? "unmute" : "mute")}
          onPress={() => setMuted(!muted)}
        />
      </View>
    </>
  );
}
export function VideoCard({
  video,
  active,
  height,
  preload = false,
}: {
  video: Video;
  active: boolean;
  height: number;
  preload?: boolean;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const source = useQuery({
    queryKey: ["playback", video.id],
    queryFn: () => playback(video.id),
    enabled: active || preload,
    staleTime: 240000,
    gcTime: 30000,
  });
  const creator = useQuery({
    queryKey: ["creator", video.creator_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", video.creator_id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const action = useMutation({
    mutationFn: async (table: "likes" | "saved_videos") => ({
      table,
      value: await toggle(table, video.id),
    }),
    onSuccess: (r) => {
      if (r.table === "likes") setLiked(r.value);
      else setSaved(r.value);
      void client.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => Alert.alert(t("requestFailed")),
  });
  async function follow() {
    const { error } = await supabase.rpc("follow_user", {
      target: video.creator_id,
    });
    Alert.alert(t(error ? "requestFailed" : "followSent"));
  }
  return (
    <View
      style={{ height, backgroundColor: "#080810", justifyContent: "flex-end" }}
    >
      {active && source.data ? (
        <Player url={source.data} active={active} video={video} />
      ) : (
        <State
          loading={active && source.isPending}
          error={source.error}
          retry={() => void source.refetch()}
        />
      )}
      <View style={{ padding: 20, gap: 8, backgroundColor: "rgba(0,0,0,.55)" }}>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push({
              pathname: "/user/[id]",
              params: { id: video.creator_id },
            })
          }
        >
          <Label
            style={{
              color: "white",
              fontWeight: "700",
              writingDirection: "ltr",
            }}
          >
            @{creator.data?.username || "…"}
          </Label>
        </Pressable>
        <Label style={{ color: "white" }}>{video.caption}</Label>
        <Label style={{ color: "white" }}>
          {t("views")}: {video.view_count} · {t("likes")}: {video.like_count}
        </Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            title={t(liked ? "unlike" : "like")}
            disabled={action.isPending}
            onPress={() => action.mutate("likes")}
          />
          <Button
            title={t("comments") + ` (${video.comment_count})`}
            onPress={() =>
              router.push({
                pathname: "/comments/[id]",
                params: { id: video.id },
              })
            }
          />
          <Button
            title={t(saved ? "unsave" : "save")}
            disabled={action.isPending}
            onPress={() => action.mutate("saved_videos")}
          />
          <Button
            title={t("share")}
            onPress={() =>
              void Share.share({ message: `reelo-dev://video/${video.id}` })
            }
          />
          <Button title={t("follow")} onPress={() => void follow()} />
          <Button
            title={t("report")}
            onPress={() =>
              router.push({
                pathname: "/report",
                params: { id: video.id, kind: "video" },
              })
            }
          />
        </View>
      </View>
    </View>
  );
}
