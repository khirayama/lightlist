// These styles apply to every route in the application
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/react";

import "pages/globals.css";

import { I18nProvider, initI18n } from "ui/i18n";
import { jaTranslation, enTranslation } from "common/translations";

initI18n({
  lng: "ja",
  fallbackLng: "ja",
  resources: {
    ja: {
      translation: jaTranslation,
    },
    en: {
      translation: enTranslation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.png" />
        <title>Lightlist</title>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
        />
      </Head>
      <I18nProvider>
        <Analytics />
        <Component {...pageProps} />
      </I18nProvider>
    </>
  );
}
