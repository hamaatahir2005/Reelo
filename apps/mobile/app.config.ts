import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: process.env.APP_NAME || "Reelo",
  slug: "reelo-dev",
  scheme: process.env.APP_SCHEME || "reelo-dev",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    backgroundColor: "#11111B",
    resizeMode: "contain",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "dev.placeholder.reelo",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: process.env.ANDROID_PACKAGE || "dev.placeholder.reelo",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#11111B",
    },
    blockedPermissions: [
      "android.permission.READ_PHONE_STATE",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "expo-font",
    [
      "expo-camera",
      {
        cameraPermission: "Allow Reelo to record videos.",
        microphonePermission: "Allow Reelo to record audio with your videos.",
      },
    ],
    [
      "expo-image-picker",
      { photosPermission: "Allow Reelo to select a video to upload." },
    ],
    "expo-notifications",
  ],
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID || "" } },
  experiments: { typedRoutes: true },
};
export default config;
