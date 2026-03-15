import type { AppProps } from "next/app";
import Head from "next/head";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/utils/i18n";
import { initializeSdk } from "@lightlist/sdk/config";
import { getCurrentSettings, useSettings } from "@lightlist/sdk/settings";
import { Theme } from "@lightlist/sdk/types";
import {
  getLanguageDirection,
  normalizeLanguage,
} from "@lightlist/sdk/utils/language";
import { logException } from "@lightlist/sdk/analytics";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StartupSplash } from "@/components/ui/StartupSplash";
import "@/styles/globals.css";

const MAIN_CONTENT_ID = "main-content";

initializeSdk({
  firebaseConfig: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  passwordResetUrl: process.env.NEXT_PUBLIC_PASSWORD_RESET_URL,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
};

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const prevLanguageRef = useRef<string | null>(null);
  const { t } = useTranslation();
  const appTitle = t("title");
  const settings = useSettings();

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

    const handleWindowError = (event: ErrorEvent) => {
      logException(event.message, false);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      logException(msg, false);
    };
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (typeof document !== "undefined") {
      document.body.classList.add(inter.variable, notoSansJp.variable);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleMediaChange = () => {
      if (getCurrentSettings()?.theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      mediaQuery.removeEventListener("change", handleMediaChange);
      if (typeof document !== "undefined") {
        document.body.classList.remove(inter.variable, notoSansJp.variable);
      }
    };
  }, []);

  useEffect(() => {
    if (settings) {
      applyTheme(settings.theme);
      if (prevLanguageRef.current !== settings.language) {
        prevLanguageRef.current = settings.language;
        i18n.changeLanguage(settings.language);
      }
    }
  }, [settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const language = normalizeLanguage(
      settings?.language ?? i18n.resolvedLanguage,
    );
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
  }, [settings?.language, i18n.resolvedLanguage]);

  if (!mounted) {
    return (
      <ErrorBoundary>
        {pwaHead}
        <div
          className={`${inter.variable} ${notoSansJp.variable} h-dvh w-full overflow-hidden font-sans`}
        >
          <StartupSplash />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {pwaHead}
      <div
        className={`${inter.variable} ${notoSansJp.variable} h-dvh w-full overflow-hidden font-sans`}
      >
        <div className="h-full w-full overflow-y-auto">
          <a
            href={`#${MAIN_CONTENT_ID}`}
            className="pointer-events-none absolute top-2 z-[2000] -translate-y-16 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primaryText opacity-0 shadow-lg transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-muted dark:bg-primary-dark dark:text-primaryText-dark dark:focus:outline-muted-dark"
            style={{ insetInlineStart: "1rem" }}
          >
            {t("common.skipToMain")}
          </a>
          <Component {...pageProps} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
