import type { AppProps } from "next/app";
import Head from "next/head";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Component, ErrorInfo, ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { withTranslation, WithTranslation } from "react-i18next";

import i18n, {
  getLanguageDirection,
  normalizeLanguage,
} from "@/lib/translation";
import { getCurrentSettings, useSettings } from "@/lib/settings";
import { Theme } from "@/lib/types";
import { logException } from "@/lib/analytics";
import { AppIcon } from "@/components/ui/AppIcon";
import "@/styles/globals.css";

const MAIN_CONTENT_ID = "main-content";

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

interface ErrorBoundaryProps extends WithTranslation {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    logException(error.message, true);
  }

  public render() {
    const { t, children, fallback } = this.props;

    if (this.state.hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon
                name="alert-circle"
                className="h-6 w-6 text-red-600 dark:text-red-400"
              />
            </div>
            <h2 className="text-lg font-semibold">{t("pages.error.title")}</h2>
            <p className="text-sm text-muted dark:text-muted-dark">
              {t("pages.error.description")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
            >
              {t("pages.error.reload")}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryBase);

export default function App({ Component, pageProps }: AppProps) {
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
