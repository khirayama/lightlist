import { useTranslation } from "react-i18next";
import Link from "next/link";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

import i18n from "@/utils/i18n";
import { BrandLogo } from "@/components/ui/BrandLogo";

const isSupportedLanguage = (value: string): value is "ja" | "en" =>
  value === "ja" || value === "en";

export default function IndexPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!router.isReady) return;
    const queryLang = router.query.lang;
    if (typeof queryLang !== "string" || !isSupportedLanguage(queryLang))
      return;
    if (i18n.language !== queryLang) {
      void i18n.changeLanguage(queryLang);
    }
  }, [router.isReady, router.query.lang]);

  const handleLangChange = (newLang: "ja" | "en") => {
    if (i18n.language !== newLang) {
      void i18n.changeLanguage(newLang);
    }
    void router.replace(
      { pathname: "/", query: { lang: newLang } },
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
          className="mx-auto mb-4 h-10 w-10 text-gray-700 dark:text-gray-300"
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
          className="mx-auto mb-4 h-10 w-10 text-gray-700 dark:text-gray-300"
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
          className="mx-auto mb-4 h-10 w-10 text-gray-700 dark:text-gray-300"
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
    <div className="bg-primary min-h-screen text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <Head>
        <title>{t("title")}</title>
        <meta name="description" content={t("pages.index.subheadline")} />
      </Head>

      <header className="mx-auto max-w-5xl px-6 py-4 text-right">
        <button
          onClick={() => handleLangChange("en")}
          className="rounded-sm px-4 py-2 hover:bg-gray-100 focus-visible:bg-gray-200 dark:hover:bg-gray-800"
        >
          English
        </button>
        <button
          onClick={() => handleLangChange("ja")}
          className="rounded-sm px-4 py-2 hover:bg-gray-100 focus-visible:bg-gray-200 dark:hover:bg-gray-800"
        >
          日本語
        </button>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl">
            <div className="flex justify-center py-2 sm:py-4">
              <BrandLogo
                alt=""
                aria-hidden="true"
                className="h-20 w-auto sm:h-24"
              />
            </div>
            <h1 className="mt-4 whitespace-pre-line text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("pages.index.headline")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-lg text-gray-600 dark:text-gray-400">
              {t("pages.index.subheadline")}
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block rounded-full bg-gray-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {t("pages.index.getStarted")}
              </Link>
            </div>
          </div>
        </section>

        {/* Screenshot Preview */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
              {t("pages.index.preview.title")}
            </h2>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700">
                <img
                  src="/screenshot_ja_desktop.png"
                  alt={t("pages.index.preview.desktopAlt")}
                  width={1280}
                  height={800}
                  className="w-full"
                />
              </div>
              <div className="absolute -right-4 -bottom-6 w-1/4 min-w-[120px] max-w-[200px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-gray-200 sm:-right-6 sm:-bottom-8 dark:ring-gray-700">
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
        <section className="bg-gray-50 pt-16 pb-20 dark:bg-gray-900">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
              {t("pages.index.features.title")}
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {features.map(({ key, icon }) => (
                <div
                  key={key}
                  className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-800"
                >
                  {icon}
                  <h3 className="mb-3 text-lg font-semibold">
                    {t(`pages.index.features.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(`pages.index.features.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t("pages.index.cta.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              {t("pages.index.cta.description")}
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block rounded-full bg-gray-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {t("pages.index.cta.button")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-6 py-10 text-center dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("copyright")}
        </p>
      </footer>
    </div>
  );
}
