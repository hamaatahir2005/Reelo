import React, { useState, useRef } from "react";
import { FlatList, View, ViewToken } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { feed } from "../../src/lib/api";
import { VideoCard } from "../../src/VideoCard";
import { Screen, Button, State } from "../../src/ui";
export default function Feed() {
  const [mode, setMode] = useState("forYou");
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [active, setActive] = useState<string | null>(null);
  const [height, setHeight] = useState(600);
  const focused = useIsFocused();
  const { t } = useTranslation();
  const q = useInfiniteQuery({
    queryKey: ["feed", mode, asOf],
    queryFn: ({ pageParam }) => feed(mode, pageParam, asOf),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastOffset) =>
      last.length === 10 && lastOffset < 490 ? lastOffset + 10 : undefined,
    maxPages: 5,
  });
  const videos = [
    ...new Map((q.data?.pages.flat() || []).map((v) => [v.id, v])).values(),
  ];
  const visible = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) =>
    setActive(viewableItems[0]?.item.id || null),
  );
  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: "row", gap: 8, padding: 8 }}>
        {["forYou", "following"].map((m) => (
          <Button
            key={m}
            title={t(m)}
            onPress={() => {
              setMode(m);
              setActive(null);
            }}
          />
        ))}
      </View>
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        <State
          loading={q.isPending}
          error={q.error}
          retry={() => void q.refetch()}
          empty={!q.isPending && !videos.length}
        />
        <FlatList
          key={mode}
          data={videos}
          keyExtractor={(v) => v.id}
          renderItem={({ item, index }) => (
            <VideoCard
              video={item}
              height={height}
              preload={
                index ===
                (active ? videos.findIndex((v) => v.id === active) : 0) + 1
              }
              active={focused && (active ? active === item.id : index === 0)}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
          onViewableItemsChanged={visible.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          onEndReachedThreshold={1}
          refreshing={q.isRefetching}
          onRefresh={() => {
            setActive(null);
            setAsOf(new Date().toISOString());
          }}
        />
      </View>
    </Screen>
  );
}
