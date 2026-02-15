import { useTranslation } from "react-i18next";
import Link from "next/link";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

import i18n from "@/utils/i18n";
import { AppIcon } from "@/components/ui/AppIcon";

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
      {
        shallow: true,
      },
    );
  };

  return (
    <div className="bg-primary min-h-screen text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <Head>
        <title>{t("title")}</title>
      </Head>
      <header className="mx-auto max-w-2xl py-4 px-6 text-right">
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

      <main className="pb-12">
        <div className="pt-24 pb-8 text-center">
          <div className="flex justify-center py-4">
            <AppIcon name="logo" size={80} />
          </div>
          <h1 className="p-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
        </div>

        <div className="p-4 text-center">
          <Link
            href="/login"
            className="inline-block rounded-full border-2 border-gray-900 px-8 py-3 text-lg font-semibold transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-50 dark:hover:bg-gray-50 dark:hover:text-gray-900"
          >
            {t("pages.index.getStarted")}
          </Link>
        </div>

        <div className="m-auto max-w-lg p-8 text-center sm:text-justify">
          <p className="my-4 text-lg text-gray-600 dark:text-gray-400">
            {t("pages.index.description1")}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t("pages.index.description2")}
          </p>
        </div>
      </main>

      <div className="bg-gray-100 py-16 dark:bg-gray-900">
        <div className="relative mx-auto aspect-video max-w-3xl overflow-hidden rounded-xl bg-gray-200 shadow-inner dark:bg-gray-800">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600 italic">
            App Screenshots Placeholder
          </div>
        </div>
      </div>

      <footer className="p-20 text-center">
        <div className="p-4 text-center">
          <Link
            href="/login"
            className="inline-block rounded-full border-2 border-gray-900 px-8 py-3 text-lg font-semibold transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-50 dark:hover:bg-gray-50 dark:hover:text-gray-900"
          >
            {t("pages.index.getStarted")}
          </Link>
        </div>
        <p className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          {t("copyright")}
        </p>
      </footer>
    </div>
  );
}
