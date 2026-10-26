import React, { useRef, useState } from "react";
import { Alert, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "../../src/lib/supabase";
import { upload } from "@reelo/validation";
import { Screen, Label, Field, Button } from "../../src/ui";
type Media = {
  uri: string;
  size: number;
  duration: number;
  width: number;
  height: number;
};
function Preview({ uri }: { uri: string }) {
  const p = useVideoPlayer(uri);
  return <VideoView player={p} nativeControls style={{ height: 300 }} />;
}
export default function Studio() {
  const { t } = useTranslation();
  const [media, setMedia] = useState<Media | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "private" | "followers"
  >("public");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPerm, requestCamera] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const camera = useRef<CameraView>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const uploaded = useRef<string | null>(null);
  const client = useQueryClient();
  async function choose() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("permissionDenied"));
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      videoMaxDuration: 90,
    });
    if (!r.canceled) {
      const a = r.assets[0];
      if (a.mimeType && a.mimeType !== "video/mp4") {
        Alert.alert(t("mp4Only"));
        return;
      }
      setMedia({
        uri: a.uri,
        size: a.fileSize || 0,
        duration: (a.duration || 0) / 1000,
        width: a.width,
        height: a.height,
      });
    }
  }
  async function openCamera() {
    const a = await requestCamera();
    const b = await requestMic();
    if (!a.granted || !b.granted) {
      Alert.alert(t("permissionDenied"));
      return;
    }
    setShowCamera(true);
  }
  async function record() {
    if (recording) {
      camera.current?.stopRecording();
      return;
    }
    setRecording(true);
    try {
      const result = await camera.current?.recordAsync({ maxDuration: 90 });
      if (result) {
        const file = await fetch(result.uri).then((r) => r.blob());
        setMedia({
          uri: result.uri,
          size: file.size,
          duration: 0,
          width: 0,
          height: 0,
        });
        setShowCamera(false);
      }
    } catch {
      Alert.alert(t("requestFailed"));
    } finally {
      setRecording(false);
    }
  }
  async function send() {
    if (!media) return;
    setBusy(true);
    setProgress(0);
    try {
      // Gallery metadata validation; recorded media is verified from the container by the server.
      if (media.duration > 0)
        upload.parse({ ...media, caption, visibility, mime: "video/mp4" });
      if (media.size <= 0 || media.size > 104857600)
        throw new Error("invalidInput");
      if (uploaded.current) {
        await invoke("upload", { action: "cancel", videoId: uploaded.current });
        uploaded.current = null;
      }
      const ticket = await invoke("upload", {
        action: "create",
        caption,
        visibility,
        size: media.size,
        mime: "video/mp4",
      });
      uploaded.current = ticket.videoId;
      const blob = await fetch(media.uri).then((r) => r.blob());
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        xhr.current = request;
        request.open("PUT", ticket.signedUrl);
        request.setRequestHeader("Content-Type", "video/mp4");
        request.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        request.onerror = () => reject(new Error("uploadFailed"));
        request.onabort = () => reject(new Error("cancelled"));
        request.onload = () =>
          request.status >= 200 && request.status < 300
            ? resolve()
            : reject(new Error("uploadFailed"));
        request.send(blob);
      });
      await invoke("upload", { action: "complete", videoId: ticket.videoId });
      uploaded.current = null;
      setMedia(null);
      setCaption("");
      await client.invalidateQueries({ queryKey: ["feed"] });
      Alert.alert(t("published"));
    } catch {
      Alert.alert(t("uploadFailed"));
    } finally {
      xhr.current = null;
      setBusy(false);
    }
  }
  async function cancel() {
    xhr.current?.abort();
    if (uploaded.current) {
      try {
        await invoke("upload", { action: "cancel", videoId: uploaded.current });
        uploaded.current = null;
      } catch {
        Alert.alert(t("requestFailed"));
      }
    }
  }
  return (
    <Screen>
      <Label>{t("studio")}</Label>
      <Label>{t("uploadLimits")}</Label>
      {showCamera && cameraPerm?.granted && micPerm?.granted ? (
        <View>
          <CameraView
            ref={camera}
            mode="video"
            facing="back"
            style={{ height: 400 }}
          />
          <Button
            title={t(recording ? "stop" : "record")}
            onPress={() => void record()}
          />
        </View>
      ) : (
        <>
          <Button
            title={t("gallery")}
            disabled={busy}
            onPress={() => void choose()}
          />
          <Button
            title={t("record")}
            disabled={busy}
            onPress={() => void openCamera()}
          />
        </>
      )}
      {media && (
        <>
          <Preview uri={media.uri} />
          <Field
            value={caption}
            onChangeText={setCaption}
            maxLength={2200}
            placeholder={t("caption")}
            accessibilityLabel={t("caption")}
          />
          {(["public", "followers", "private"] as const).map((v) => (
            <Button
              key={v}
              title={(visibility === v ? "✓ " : "") + t(v)}
              disabled={busy}
              onPress={() => setVisibility(v)}
            />
          ))}
          <Button
            title={t("publish")}
            disabled={busy}
            onPress={() => void send()}
          />
        </>
      )}
      {busy && (
        <Label accessibilityLiveRegion="polite">
          {progress}% · {t(progress === 100 ? "processing" : "uploading")}
        </Label>
      )}
      {(busy || uploaded.current) && (
        <Button title={t("cancel")} onPress={() => void cancel()} />
      )}
    </Screen>
  );
}
