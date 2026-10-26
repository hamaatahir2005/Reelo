import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "../../src/ui";
export default function Layout() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarStyle: {
          direction: i18n.dir(),
          backgroundColor: c.bg,
          borderTopColor: c.card,
        },
        tabBarLabelStyle: { fontFamily: "NotoSansArabic" },
      }}
    >
      {["index", "discover", "studio", "inbox", "profile"].map((name, i) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(["forYou", "discover", "studio", "inbox", "profile"][i]),
          }}
        />
      ))}
    </Tabs>
  );
}
