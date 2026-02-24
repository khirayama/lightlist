import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import { Theme, Language, TaskInsertPosition } from "@lightlist/sdk/types";
import { updateSettings } from "@lightlist/sdk/mutations/app";
import { signOut, deleteAccount } from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";

type SelectRowProps = {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
};

type SettingsSectionProps = {
  children: ReactNode;
  tone?: "default" | "danger";
};

function SettingsSection({ children, tone = "default" }: SettingsSectionProps) {
  if (tone === "danger") {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900 sm:p-5">
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      {children}
    </section>
  );
}

function SelectRow({
  disabled,
  id,
  label,
  onChange,
  options,
  value,
}: SelectRowProps) {
  return (
    <label
      htmlFor={id}
      className={`grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-300 dark:focus-within:outline-gray-600 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="text-sm font-medium text-gray-900 dark:text-gray-50 sm:pr-3">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50 dark:focus:border-gray-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    appStore.getServerSnapshot,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "signOut" | "deleteAccount" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSetting = async (next: {
    theme?: Theme;
    language?: Language;
    taskInsertPosition?: TaskInsertPosition;
    autoSort?: boolean;
  }) => {
    if (isUpdating) {
      return;
    }

    setError(null);
    setIsUpdating(true);
    try {
      await updateSettings(next);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    } finally {
      setIsUpdating(false);
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

    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  useEffect(() => {
    if (state.authStatus !== "loading") {
      return;
    }

    const timerId = window.setTimeout(() => {
      router.replace("/");
    }, 10000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [router, state.authStatus]);

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
    if (pendingAction) {
      return;
    }

    setPendingAction("signOut");
    setError(null);

    try {
      await signOut();
      router.push("/");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setPendingAction(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (pendingAction) {
      return;
    }

    setPendingAction("deleteAccount");
    setError(null);

    try {
      await deleteAccount();
      router.push("/");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setPendingAction(null);
    }
  };

  if (state.authStatus === "loading" || state.settingsStatus === "loading") {
    return <Spinner fullPage />;
  }

  if (state.authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  if (state.settingsStatus === "error") {
    return (
      <div className="min-h-full w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:pt-8"
        >
          <Alert variant="error">{t("auth.error.general")}</Alert>
        </main>
      </div>
    );
  }

  if (!state.user || !state.settings) {
    return <Spinner fullPage />;
  }

  const actionsDisabled = pendingAction !== null;
  const settingsDisabled = isUpdating || actionsDisabled;
  const signOutLabel =
    pendingAction === "signOut"
      ? t("settings.signingOut")
      : t("settings.danger.signOut");
  const deleteAccountLabel =
    pendingAction === "deleteAccount"
      ? t("settings.deletingAccount")
      : t("settings.deleteAccount");
  const languageOptions = [
    { value: "ja", label: t("settings.language.japanese") },
    { value: "en", label: t("settings.language.english") },
  ] as const;
  const themeOptions = [
    { value: "system", label: t("settings.theme.system") },
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
  ] as const;
  const taskInsertPositionOptions = [
    { value: "top", label: t("settings.taskInsertPosition.top") },
    { value: "bottom", label: t("settings.taskInsertPosition.bottom") },
  ] as const;

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-10 pt-6 sm:px-6 lg:pt-8"
      >
        <header className="flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={handleBack}
            title={t("common.back")}
            aria-label={t("common.back")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-600"
          >
            <AppIcon
              name="arrow-back"
              className="h-5 w-5"
              aria-hidden="true"
              focusable="false"
            />
          </button>
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
        </header>

        {error && <Alert variant="error">{error}</Alert>}

        <SettingsSection>
          <fieldset className="flex flex-col gap-0">
            <legend className="text-sm font-semibold tracking-wide text-gray-600 dark:text-gray-300">
              {t("settings.preferences.title")}
            </legend>
            <div className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
              <SelectRow
                id="settings-language"
                label={t("settings.language.title")}
                value={state.settings.language}
                disabled={settingsDisabled}
                options={[...languageOptions]}
                onChange={(next) => void handleLanguageChange(next as Language)}
              />
              <SelectRow
                id="settings-theme"
                label={t("settings.theme.title")}
                value={state.settings.theme}
                disabled={settingsDisabled}
                options={[...themeOptions]}
                onChange={(next) => void handleThemeChange(next as Theme)}
              />
              <SelectRow
                id="settings-task-insert-position"
                label={t("settings.taskInsertPosition.title")}
                value={state.settings.taskInsertPosition}
                disabled={settingsDisabled}
                options={[...taskInsertPositionOptions]}
                onChange={(next) =>
                  void handleTaskInsertPositionChange(
                    next as TaskInsertPosition,
                  )
                }
              />
            </div>
            <label
              className={`mt-1 flex cursor-pointer items-center justify-between gap-4 border-t border-gray-200 py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-300 dark:border-gray-800 dark:focus-within:outline-gray-600 ${
                settingsDisabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                name="autoSort"
                checked={state.settings.autoSort}
                onChange={(event) => handleAutoSortChange(event.target.checked)}
                disabled={settingsDisabled}
                className="peer sr-only"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {t("settings.autoSort.title")}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t("settings.autoSort.enable")}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                  state.settings.autoSort
                    ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                    : "border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition dark:bg-gray-950 ${
                    state.settings.autoSort ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </fieldset>
        </SettingsSection>

        <SettingsSection>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-200">
              {t("settings.actions.title")}
            </h2>
            <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
              <p className="text-xs font-medium tracking-wide text-gray-600 dark:text-gray-300">
                {t("settings.userInfo.title")}
              </p>
              <p className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-gray-50">
                {state.user.email}
              </p>
            </div>
            <div className="grid gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                disabled={actionsDisabled}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-600"
              >
                {signOutLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionsDisabled}
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 dark:hover:bg-red-900/40 dark:focus-visible:outline-red-500"
              >
                {deleteAccountLabel}
              </button>
            </div>
          </div>
        </SettingsSection>

        <ConfirmDialog
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={() => {
            setShowSignOutConfirm(false);
            void handleSignOut();
          }}
          title={t("auth.signOutConfirm.title")}
          message={t("auth.signOutConfirm.message")}
          confirmText={t("auth.button.signOut")}
          cancelText={t("auth.button.cancel")}
          disabled={actionsDisabled}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            void handleDeleteAccount();
          }}
          title={t("auth.deleteAccountConfirm.title")}
          message={t("auth.deleteAccountConfirm.message")}
          confirmText={t("auth.button.delete")}
          cancelText={t("auth.button.cancel")}
          isDestructive={true}
          disabled={actionsDisabled}
        />
      </main>
    </div>
  );
}
