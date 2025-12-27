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

export const listColors: string[] = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#6C5CE7",
  "#A29BFE",
  "#74B9FF",
  "#81ECEC",
  "#55EFC4",
  "#FD79A8",
  "#FDCB6E",
  "#FFFFFF",
];
