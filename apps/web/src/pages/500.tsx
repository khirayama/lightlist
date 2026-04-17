import { useTranslation } from "react-i18next";
import { useEffect } from "react";

import { AppIcon } from "@/common";

export default function ServerErrorPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("pages.serverError.title");
  }, [t]);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AppIcon
            name="alert-circle"
            className="h-6 w-6 text-red-600 dark:text-red-400"
          />
        </div>
        <h1 className="text-lg font-semibold">
          {t("pages.serverError.title")}
        </h1>
        <p className="text-sm text-muted dark:text-muted-dark">
          {t("pages.serverError.description")}
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
        >
          {t("pages.serverError.backHome")}
        </a>
      </div>
    </div>
  );
}
