import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import {
  AppState,
  Theme,
  Language,
  TaskInsertPosition,
} from "@lightlist/sdk/types";
import { updateSettings } from "@lightlist/sdk/mutations/app";
import { signOut, deleteAccount } from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSetting = async (next: {
    theme?: Theme;
    language?: Language;
    taskInsertPosition?: TaskInsertPosition;
    autoSort?: boolean;
  }) => {
    setError(null);
    try {
      await updateSettings(next);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    }
  };

  const handleBack = () => {
    if (typeof window === "undefined") {
      router.push("/app");
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app");
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChange((user) => {
      if (!user) {
        router.push("/");
      }
    });

    const unsubscribeStore = appStore.subscribe((newState) => {
      setState(newState);
    });

    setState(appStore.getState());

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, [router]);

  const handleThemeChange = async (theme: Theme) => {
    await updateSetting({ theme });
  };

  const handleLanguageChange = async (language: Language) => {
    await updateSetting({ language });
  };

  const handleTaskInsertPositionChange = async (
    taskInsertPosition: TaskInsertPosition,
  ) => {
    await updateSetting({ taskInsertPosition });
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    await updateSetting({ autoSort });
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await signOut();
      router.push("/");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteAccount();
      router.push("/");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setLoading(false);
    }
  };

  if (!state || !state.user || !state.settings) {
    return <Spinner fullPage />;
  }

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:pt-8">
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            title={t("common.back")}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
          >
            {t("common.back")}
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
        </header>

        {error && <Alert variant="error">{error}</Alert>}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("settings.userInfo.title")}
            </p>
            <p className="text-base font-medium">{state.user.email}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("settings.language.title")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="language"
                  value="ja"
                  checked={state.settings.language === "ja"}
                  onChange={() => handleLanguageChange("ja")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.language.japanese")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={state.settings.language === "en"}
                  onChange={() => handleLanguageChange("en")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.language.english")}</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("settings.theme.title")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={state.settings.theme === "system"}
                  onChange={() => handleThemeChange("system")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.theme.system")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={state.settings.theme === "light"}
                  onChange={() => handleThemeChange("light")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.theme.light")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={state.settings.theme === "dark"}
                  onChange={() => handleThemeChange("dark")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.theme.dark")}</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("settings.taskInsertPosition.title")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="taskInsertPosition"
                  value="bottom"
                  checked={state.settings.taskInsertPosition === "bottom"}
                  onChange={() => handleTaskInsertPositionChange("bottom")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.taskInsertPosition.bottom")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
                <input
                  type="radio"
                  name="taskInsertPosition"
                  value="top"
                  checked={state.settings.taskInsertPosition === "top"}
                  onChange={() => handleTaskInsertPositionChange("top")}
                  className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
                />
                <span>{t("settings.taskInsertPosition.top")}</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("settings.autoSort.title")}
            </legend>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:focus-within:outline-gray-600">
              <input
                type="checkbox"
                name="autoSort"
                checked={state.settings.autoSort}
                onChange={(event) => handleAutoSortChange(event.target.checked)}
                className="h-4 w-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-gray-50 dark:focus-visible:ring-gray-600"
              />
              <span>{t("settings.autoSort.enable")}</span>
            </label>
          </fieldset>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-red-900 shadow-sm dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
          <h2 className="text-sm font-semibold">
            {t("settings.danger.title")}
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-900/30 dark:focus-visible:outline-red-500"
            >
              {!loading && t("settings.danger.signOut")}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:outline-red-500"
            >
              {!loading && t("settings.danger.deleteAccount")}
            </button>
          </div>
        </section>

        <ConfirmDialog
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={() => {
            setShowSignOutConfirm(false);
            handleSignOut();
          }}
          title={t("auth.signOutConfirm.title")}
          message={t("auth.signOutConfirm.message")}
          confirmText={t("auth.button.signOut")}
          cancelText={t("auth.button.cancel")}
          disabled={loading}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            handleDeleteAccount();
          }}
          title={t("auth.deleteAccountConfirm.title")}
          message={t("auth.deleteAccountConfirm.message")}
          confirmText={t("auth.button.delete")}
          cancelText={t("auth.button.cancel")}
          isDestructive={true}
          disabled={loading}
        />
      </div>
    </div>
  );
}
