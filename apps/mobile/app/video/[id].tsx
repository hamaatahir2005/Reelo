import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useWindowDimensions } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { Screen, State } from "../../src/ui";
import { VideoCard } from "../../src/VideoCard";
export default function Video() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();
  const q = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  return (
    <Screen scroll={false}>
      {q.data ? (
        <VideoCard video={q.data} active height={height - 80} />
      ) : (
        <State loading={q.isPending} error={q.error} />
      )}
    </Screen>
  );
}
