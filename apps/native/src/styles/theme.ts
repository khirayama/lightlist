export type ThemeName = "light" | "dark";
export type ThemeMode = "system" | ThemeName;
export type Theme = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  error: string;
  inputBackground: string;
  placeholder: string;
};

export const themes: Record<ThemeName, Theme> = {
  light: {
    background: "#F5F3EE",
    surface: "#FFFFFF",
    text: "#1B1D18",
    muted: "#6B6F66",
    border: "#DAD6CE",
    primary: "#1F5C4D",
    primaryText: "#F9F7F2",
    error: "#B4232A",
    inputBackground: "#FAF8F2",
    placeholder: "#8C9087",
  },
  dark: {
    background: "#111412",
    surface: "#1C201D",
    text: "#F2F2EE",
    muted: "#A6AAA2",
    border: "#2B302D",
    primary: "#7AC2A7",
    primaryText: "#0C1512",
    error: "#FF9A91",
    inputBackground: "#171A18",
    placeholder: "#7B8077",
  },
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  jpRegular: "NotoSansJP_400Regular",
  jpMedium: "NotoSansJP_500Medium",
  jpBold: "NotoSansJP_700Bold",
};

export const listColors: string[] = [
  "#F87171", // Coral
  "#FBBF24", // Amber
  "#34D399", // Emerald
  "#38BDF8", // Sky
  "#818CF8", // Indigo
  "#A78BFA", // Violet
];

import { useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { appStore } from "@lightlist/sdk/store";

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const storedTheme = appState.settings?.theme;
  const themeMode: ThemeMode =
    storedTheme === "system" ||
    storedTheme === "light" ||
    storedTheme === "dark"
      ? storedTheme
      : "system";
  const resolvedTheme: ThemeName =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;
  return themes[resolvedTheme];
}
