import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import { useSessionState } from "@lightlist/sdk/session";
import { useSettingsState } from "@lightlist/sdk/settings";
import { Theme, Language, TaskInsertPosition } from "@lightlist/sdk/types";
import { updateSettings } from "@lightlist/sdk/mutations/app";
import {
  signOut,
  deleteAccount,
  sendEmailChangeVerification,
} from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "@lightlist/sdk/utils/errors";
import { validateEmailChangeForm } from "@lightlist/sdk/utils/validation";
import {
  LANGUAGE_DISPLAY_NAMES,
  SUPPORTED_LANGUAGES,
} from "@lightlist/sdk/utils/language";
import {
  logSignOut,
  logDeleteAccount,
  logEmailChangeRequested,
  logSettingsThemeChange,
  logSettingsLanguageChange,
  logSettingsTaskInsertPositionChange,
  logSettingsAutoSortChange,
} from "@lightlist/sdk/analytics";
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
      <section className="rounded-xl border border-red-200 bg-surface p-4 dark:border-red-900/40 dark:bg-surface-dark sm:p-5">
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark sm:p-5">
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
      className={`grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border dark:focus-within:outline-border-dark ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="text-sm font-medium text-text dark:text-text-dark sm:pr-3">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
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
  const { authStatus, user } = useSessionState();
  const { settings, settingsStatus } = useSettingsState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "signOut" | "deleteAccount" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

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
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "loading") {
      return;
    }

    const timerId = window.setTimeout(() => {
      router.replace("/");
    }, 10000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [authStatus, router]);

  const handleThemeChange = async (theme: Theme) => {
    await updateSetting({ theme });
    logSettingsThemeChange({ theme });
  };

  const handleLanguageChange = async (language: Language) => {
    await updateSetting({ language });
    logSettingsLanguageChange({ language });
  };

  const handleTaskInsertPositionChange = async (
    taskInsertPosition: TaskInsertPosition,
  ) => {
    await updateSetting({ taskInsertPosition });
    logSettingsTaskInsertPositionChange({ position: taskInsertPosition });
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    await updateSetting({ autoSort });
    logSettingsAutoSortChange({ enabled: autoSort });
  };

  const handleSignOut = async () => {
    if (pendingAction) {
      return;
    }

    setPendingAction("signOut");
    setError(null);

    try {
      await signOut();
      logSignOut();
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
      logDeleteAccount();
      router.push("/");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setPendingAction(null);
    }
  };

  const handleEmailChangeSubmit = async () => {
    if (isChangingEmail) return;
    const errors = validateEmailChangeForm({ newEmail }, t);
    if (errors.email) {
      setEmailChangeError(errors.email);
      return;
    }
    setEmailChangeError(null);
    setIsChangingEmail(true);
    try {
      await sendEmailChangeVerification(newEmail);
      setEmailChangeSuccess(true);
      setNewEmail("");
      logEmailChangeRequested();
    } catch (err) {
      setEmailChangeError(resolveErrorMessage(err, t, "auth.error.general"));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleEmailChangeClose = () => {
    setShowEmailChangeForm(false);
    setNewEmail("");
    setEmailChangeError(null);
    setEmailChangeSuccess(false);
  };

  if (authStatus === "loading" || settingsStatus === "loading") {
    return <Spinner fullPage />;
  }

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  if (settingsStatus === "error") {
    return (
      <div className="min-h-full w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
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

  if (!user || !settings) {
    return <Spinner fullPage />;
  }

  const actionsDisabled = pendingAction !== null || isChangingEmail;
  const settingsDisabled = isUpdating || actionsDisabled;
  const signOutLabel =
    pendingAction === "signOut"
      ? t("settings.signingOut")
      : t("settings.danger.signOut");
  const deleteAccountLabel =
    pendingAction === "deleteAccount"
      ? t("settings.deletingAccount")
      : t("settings.deleteAccount");
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language,
    label: LANGUAGE_DISPLAY_NAMES[language],
  }));
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
    <div className="min-h-full w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border dark:text-muted-dark dark:hover:bg-surface-dark dark:focus-visible:outline-border-dark"
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
            <legend className="text-sm font-semibold tracking-wide text-muted dark:text-muted-dark">
              {t("settings.preferences.title")}
            </legend>
            <div className="mt-2 divide-y divide-border dark:divide-border-dark">
              <SelectRow
                id="settings-language"
                label={t("settings.language.title")}
                value={settings.language}
                disabled={settingsDisabled}
                options={[...languageOptions]}
                onChange={(next) => void handleLanguageChange(next as Language)}
              />
              <SelectRow
                id="settings-theme"
                label={t("settings.theme.title")}
                value={settings.theme}
                disabled={settingsDisabled}
                options={[...themeOptions]}
                onChange={(next) => void handleThemeChange(next as Theme)}
              />
              <SelectRow
                id="settings-task-insert-position"
                label={t("settings.taskInsertPosition.title")}
                value={settings.taskInsertPosition}
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
              className={`mt-1 flex cursor-pointer items-center justify-between gap-4 border-t border-border py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border dark:border-border-dark dark:focus-within:outline-border-dark ${
                settingsDisabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                name="autoSort"
                checked={settings.autoSort}
                onChange={(event) => handleAutoSortChange(event.target.checked)}
                disabled={settingsDisabled}
                className="peer sr-only"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text dark:text-text-dark">
                  {t("settings.autoSort.title")}
                </span>
                <span className="text-xs text-muted dark:text-muted-dark">
                  {t("settings.autoSort.enable")}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                  settings.autoSort
                    ? "border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark"
                    : "border-border bg-border dark:border-border-dark dark:bg-surface-dark"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition dark:bg-background-dark ${
                    settings.autoSort ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </fieldset>
        </SettingsSection>

        <SettingsSection>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-text dark:text-text-dark">
              {t("settings.actions.title")}
            </h2>
            <div className="border-b border-border pb-3 dark:border-border-dark">
              <p className="text-xs font-medium tracking-wide text-muted dark:text-muted-dark">
                {t("settings.userInfo.title")}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="break-all text-sm font-medium text-text dark:text-text-dark">
                  {user.email}
                </p>
                {!showEmailChangeForm && (
                  <button
                    type="button"
                    onClick={() => setShowEmailChangeForm(true)}
                    disabled={actionsDisabled}
                    className="shrink-0 text-xs text-muted underline hover:text-text disabled:cursor-not-allowed disabled:opacity-60 dark:text-muted-dark dark:hover:text-text-dark"
                  >
                    {t("settings.emailChange.changeButton")}
                  </button>
                )}
              </div>
              {showEmailChangeForm && (
                <div className="mt-3 flex flex-col gap-3">
                  {emailChangeSuccess ? (
                    <Alert variant="success">
                      {t("settings.emailChange.successMessage")}
                    </Alert>
                  ) : (
                    <>
                      {emailChangeError && (
                        <Alert variant="error">{emailChangeError}</Alert>
                      )}
                      <div>
                        <label
                          htmlFor="new-email"
                          className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark"
                        >
                          {t("settings.emailChange.newEmailLabel")}
                        </label>
                        <input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          disabled={isChangingEmail}
                          placeholder={t(
                            "settings.emailChange.newEmailPlaceholder",
                          )}
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleEmailChangeClose}
                          disabled={isChangingEmail}
                          className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:border-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:hover:border-muted-dark dark:hover:bg-surface-dark"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleEmailChangeSubmit()}
                          disabled={isChangingEmail || !newEmail.trim()}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark"
                        >
                          {isChangingEmail
                            ? t("settings.emailChange.submitting")
                            : t("settings.emailChange.submitButton")}
                        </button>
                      </div>
                    </>
                  )}
                  {emailChangeSuccess && (
                    <button
                      type="button"
                      onClick={handleEmailChangeClose}
                      className="text-xs text-muted underline hover:text-text dark:text-muted-dark dark:hover:text-text-dark"
                    >
                      {t("common.close")}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                disabled={actionsDisabled}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text shadow-sm transition hover:border-muted hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:hover:border-muted-dark dark:hover:bg-surface-dark dark:focus-visible:outline-border-dark"
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
