import { useEffect } from "react";

export function useTheme(theme: "SYSTEM" | "DARK" | "LIGHT") {
  const resolvedTheme =
    theme === "SYSTEM"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "DARK"
        : "LIGHT"
      : theme;

  useEffect(() => {
    if (resolvedTheme === "DARK") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return {
    theme,
    resolvedTheme,
    isDarkTheme: resolvedTheme === "DARK",
    isLightTheme: resolvedTheme === "LIGHT",
  };
}
