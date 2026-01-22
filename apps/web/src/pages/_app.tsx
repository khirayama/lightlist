import { Inter } from "next/font/google";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/utils/i18n";
import { appStore } from "@lightlist/sdk/store";
import { AppState, Theme } from "@lightlist/sdk/types";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
});

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
      <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
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
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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

  if (!mounted) {
    return (
      <ErrorBoundary>
        {pwaHead}

        <style jsx global>{`
          :root {
            --font-inter: ${inter.style.fontFamily};
          }
        `}</style>

        <Spinner fullPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {pwaHead}

      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
        }
      `}</style>

      <div className="h-dvh w-full overflow-hidden">
        <div className="h-full w-full overflow-y-auto">
          <Component {...pageProps} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
