import { colors } from "./colors";

type ThemeName = "light" | "dark";
type ThemeMode = "system" | ThemeName;

export const themes = colors;

export const listColors: string[] = [
  colors.common.coral,
  colors.common.amber,
  colors.common.emerald,
  colors.common.sky,
  colors.common.indigo,
  colors.common.violet,
];
