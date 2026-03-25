import { useTranslation } from "react-i18next";
import Link from "next/link";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

import i18n from "@/utils/i18n";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { Language } from "@/lib/types";
import {
  LANGUAGE_DISPLAY_NAMES,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from "@/lib/utils/language";

const OG_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  ja: "ja_JP",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  fr: "fr_FR",
  ko: "ko_KR",
  "zh-CN": "zh_CN",
  hi: "hi_IN",
  ar: "ar_AR",
  "pt-BR": "pt_BR",
  id: "id_ID",
};

export default function IndexPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentLang = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const pageUrl = currentLang === "ja" ? "/" : `/?lang=${currentLang}`;
  const pageTitle = t("pages.index.seo.title");
  const pageDescription = t("pages.index.seo.description");

  useEffect(() => {
    if (!router.isReady) return;
    const queryLang = router.query.lang;
    if (typeof queryLang !== "string") return;
    const normalizedLanguage = normalizeLanguage(queryLang);
    if (i18n.language !== normalizedLanguage) {
      void i18n.changeLanguage(normalizedLanguage);
    }
  }, [router.isReady, router.query.lang]);

  const handleLangChange = (newLang: Language) => {
    if (i18n.language !== newLang) {
      void i18n.changeLanguage(newLang);
    }
    void router.replace(
      {
        pathname: "/",
        query: newLang === "ja" ? {} : { lang: newLang },
      },
      undefined,
      { shallow: true },
    );
  };

  const features = [
    {
      key: "simple",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-4 h-10 w-10 text-muted dark:text-muted-dark"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      key: "multidevice",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-4 h-10 w-10 text-muted dark:text-muted-dark"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3"
          />
        </svg>
      ),
    },
    {
      key: "share",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-4 h-10 w-10 text-muted dark:text-muted-dark"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
          />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="min-h-screen bg-surface text-text dark:bg-background-dark dark:text-text-dark">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={t("pages.index.seo.keywords")} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={pageUrl} />
        {SUPPORTED_LANGUAGES.map((language) => (
          <link
            key={language}
            rel="alternate"
            hrefLang={language}
            href={language === "ja" ? "/" : `/?lang=${language}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={t("title")} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta
          property="og:locale"
          content={OG_LOCALE_BY_LANGUAGE[currentLang]}
        />
        <meta property="og:image" content="/screenshot_ja_desktop.png" />
        <meta
          property="og:image:alt"
          content={t("pages.index.preview.desktopAlt")}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="/screenshot_ja_desktop.png" />
      </Head>

      <header className="mx-auto flex max-w-5xl justify-end px-6 py-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <span className="sr-only">Language</span>
          <select
            value={currentLang}
            onChange={(event) =>
              handleLangChange(normalizeLanguage(event.target.value))
            }
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:focus:border-muted-dark"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {LANGUAGE_DISPLAY_NAMES[language]}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section
          aria-labelledby="landing-hero-title"
          className="px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex justify-center py-2 sm:py-4">
              <BrandLogo
                alt=""
                aria-hidden="true"
                className="h-12 w-auto sm:h-16 lg:h-20"
              />
            </div>
            <h1
              id="landing-hero-title"
              className="mt-4 whitespace-pre-line text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              {t("pages.index.headline")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-lg text-muted dark:text-muted-dark">
              {t("pages.index.subheadline")}
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block rounded-full bg-primary px-10 py-4 text-lg font-semibold text-primaryText transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
              >
                {t("pages.index.getStarted")}
              </Link>
            </div>
          </div>
        </section>

        {/* Screenshot Preview */}
        <section aria-labelledby="landing-preview-title" className="px-6 pb-20">
          <div className="mx-auto max-w-5xl">
            <h2
              id="landing-preview-title"
              className="mb-10 text-center text-2xl font-bold sm:text-3xl"
            >
              {t("pages.index.preview.title")}
            </h2>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border dark:ring-border-dark">
                <img
                  src="/screenshot_ja_desktop.png"
                  alt={t("pages.index.preview.desktopAlt")}
                  width={1280}
                  height={800}
                  className="w-full"
                />
              </div>
              <div className="absolute -right-4 -bottom-6 w-1/4 min-w-[120px] max-w-[200px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border sm:-right-6 sm:-bottom-8 dark:ring-border-dark py-3">
                <img
                  src="/screenshot_ja_mobile.png"
                  alt={t("pages.index.preview.mobileAlt")}
                  width={720}
                  height={1560}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          aria-labelledby="landing-features-title"
          className="bg-background pt-16 pb-20 dark:bg-surface-dark"
        >
          <div className="mx-auto max-w-5xl px-6">
            <h2
              id="landing-features-title"
              className="mb-12 text-center text-2xl font-bold sm:text-3xl"
            >
              {t("pages.index.features.title")}
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {features.map(({ key, icon }) => (
                <div
                  key={key}
                  className="rounded-2xl bg-surface p-8 text-center shadow-sm dark:bg-surface-dark"
                >
                  {icon}
                  <h3 className="mb-3 text-lg font-semibold">
                    {t(`pages.index.features.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted dark:text-muted-dark">
                    {t(`pages.index.features.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          aria-labelledby="landing-cta-title"
          className="px-6 py-24 text-center"
        >
          <div className="mx-auto max-w-2xl">
            <h2
              id="landing-cta-title"
              className="text-3xl font-bold sm:text-4xl"
            >
              {t("pages.index.cta.title")}
            </h2>
            <p className="mt-4 text-lg text-muted dark:text-muted-dark">
              {t("pages.index.cta.description")}
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block rounded-full bg-primary px-10 py-4 text-lg font-semibold text-primaryText transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
              >
                {t("pages.index.cta.button")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10 text-center dark:border-border-dark">
        <p className="text-sm text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </footer>
    </div>
  );
}
