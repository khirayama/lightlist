import { ExpoConfig, ConfigContext } from "expo/config";

type AppEnv = "development" | "staging" | "production";

const DEFAULT_APP_ENV: AppEnv = "development";

const APP_VARIANTS = {
  development: {
    name: "Lightlist (Dev)",
    bundleId: "com.lightlist.app.dev",
    scheme: "lightlist-dev",
  },
  staging: {
    name: "Lightlist (Staging)",
    bundleId: "com.lightlist.app.staging",
    scheme: "lightlist-staging",
  },
  production: {
    name: "Lightlist",
    bundleId: "com.lightlist.app",
    scheme: "lightlist",
  },
} satisfies Record<
  AppEnv,
  {
    name: string;
    bundleId: string;
    scheme: string;
  }
>;

const resolveAppEnv = (): AppEnv => {
  const appEnv = process.env.APP_ENV;
  if (appEnv === "production" || appEnv === "staging") {
    return appEnv;
  }

  return DEFAULT_APP_ENV;
};

const appEnv = resolveAppEnv();
const appVariant = APP_VARIANTS[appEnv];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appVariant.name,
  slug: "lightlist-native",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: appVariant.scheme,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
    dark: {
      image: "./assets/splash-icon.png",
      backgroundColor: "#030712",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: appVariant.bundleId,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: appVariant.bundleId,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        dark: {
          image: "./assets/splash-icon.png",
          backgroundColor: "#030712",
        },
      },
    ],
    "expo-font",
    "@react-native-community/datetimepicker",
    "@react-native-firebase/app",
    "@react-native-firebase/crashlytics",
  ],
  extra: {
    APP_ENV: appEnv,
  },
});
