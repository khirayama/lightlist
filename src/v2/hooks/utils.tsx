import { useRef, useEffect } from "react";
import qs from "query-string";

import { useApp } from "v2/hooks/useApp";
import { usePreferences } from "v2/hooks/usePreferences";

export function useAppPageStack() {
  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (query.sheet) {
        const tmp = window.location.href;
        window.history.replaceState({}, "", window.location.pathname);
        window.history.pushState({}, "", tmp);
      }
    }
    isInitialRender.current = false;
  }, []);
}

export function useTheme() {
  const [{ data: preferences }] = usePreferences();
  const resolvedTheme =
    preferences.theme === "SYSTEM"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "DARK"
        : "LIGHT"
      : preferences.theme;

  useEffect(() => {
    if (resolvedTheme === "DARK") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return {
    theme: preferences.theme,
    resolvedTheme,
    isDarkTheme: resolvedTheme === "DARK",
    isLightTheme: resolvedTheme === "LIGHT",
  };
}

export function useActiveStatus() {
  const [, { updateApp }] = useApp();

  useEffect(() => {
    const handleVisibilityChange = () => {
      updateApp({ online: document.visibilityState === "visible" });
    };

    handleVisibilityChange();
    window.addEventListener("beforeunload", () => updateApp({ online: false }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
