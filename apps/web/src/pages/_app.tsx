import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/utils/i18n";
import { appStore } from "@lightlist/sdk/store";
import { Theme } from "@lightlist/sdk/types";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/globals.css";

const MAIN_CONTENT_ID = "main-content";

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const prevLanguageRef = useRef<string | null>(null);
  const { t } = useTranslation();
  const appTitle = t("title");
  const appState = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    appStore.getServerSnapshot,
  );

  const pwaHead = (
    <Head>
      <link rel="manifest" href="/manifest.webmanifest" />
      <link
        rel="icon"
        href="/icons/icon-192.png"
        sizes="192x192"
        type="image/png"
      />
      <link
        rel="apple-touch-icon"
        href="/icons/apple-touch-icon.png"
        sizes="180x180"
        type="image/png"
      />
      <meta name="application-name" content={appTitle} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={appTitle} />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content="#ffffff"
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content="#0b0b0b"
      />
    </Head>
  );

  useEffect(() => {
    const isSecureOrLocalhost =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isSecureOrLocalhost && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch(() => {});
    }

    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (theme: Theme) => {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          typeof window !== "undefined" &&
          mediaQuery.matches);

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark);
      }
    };

    const handleMediaChange = () => {
      const state = appStore.getState();
      if (state.settings?.theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark);
      }
    };

    if (appState.settings) {
      applyTheme(appState.settings.theme);
      if (prevLanguageRef.current !== appState.settings.language) {
        prevLanguageRef.current = appState.settings.language;
        i18n.changeLanguage(appState.settings.language);
      }
    }
  }, [appState.settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const language =
      appState.settings?.language ?? i18n.resolvedLanguage ?? "en";
    document.documentElement.lang = language === "ja" ? "ja" : "en";
  }, [appState.settings?.language, i18n.resolvedLanguage]);

  if (!mounted) {
    return (
      <ErrorBoundary>
        {pwaHead}
        <div className="h-dvh w-full overflow-hidden font-sans">
          <Spinner fullPage />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {pwaHead}
      <div className="h-dvh w-full overflow-hidden font-sans">
        <div className="h-full w-full overflow-y-auto">
          <a
            href={`#${MAIN_CONTENT_ID}`}
            className="pointer-events-none absolute left-4 top-2 z-[2000] -translate-y-16 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white opacity-0 shadow-lg transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:focus:outline-gray-500"
          >
            {t("common.skipToMain")}
          </a>
          <Component {...pageProps} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
