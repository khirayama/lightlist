"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

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
    setError(null);
    try {
      await updateSettings({ theme });
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    }
  };

  const handleLanguageChange = async (language: Language) => {
    setError(null);
    try {
      await updateSettings({ language });
      await i18next.changeLanguage(language);
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    }
  };

  const handleTaskInsertPositionChange = async (
    taskInsertPosition: TaskInsertPosition,
  ) => {
    setError(null);
    try {
      await updateSettings({ taskInsertPosition });
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    }
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    setError(null);
    try {
      await updateSettings({ autoSort });
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await signOut();
      router.push("/");
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setLoading(false);
    }
  };

  if (!state || !state.user || !state.settings) {
    return <Spinner />;
  }

  return (
    <div>
      <div>
        <button onClick={() => router.back()} title={t("common.back")}>
          {t("common.back")}
        </button>
        <h1>{t("settings.title")}</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <p>{t("settings.userInfo.title")}</p>
        <p>{state.user.email}</p>
      </div>

      <div>
        <p>{t("settings.language.title")}</p>
        <label>
          <input
            type="radio"
            name="language"
            value="ja"
            checked={state.settings.language === "ja"}
            onChange={() => handleLanguageChange("ja")}
          />
          {t("settings.language.japanese")}
        </label>
        <label>
          <input
            type="radio"
            name="language"
            value="en"
            checked={state.settings.language === "en"}
            onChange={() => handleLanguageChange("en")}
          />
          {t("settings.language.english")}
        </label>
      </div>

      <div>
        <p>{t("settings.theme.title")}</p>
        <label>
          <input
            type="radio"
            name="theme"
            value="system"
            checked={state.settings.theme === "system"}
            onChange={() => handleThemeChange("system")}
          />
          {t("settings.theme.system")}
        </label>
        <label>
          <input
            type="radio"
            name="theme"
            value="light"
            checked={state.settings.theme === "light"}
            onChange={() => handleThemeChange("light")}
          />
          {t("settings.theme.light")}
        </label>
        <label>
          <input
            type="radio"
            name="theme"
            value="dark"
            checked={state.settings.theme === "dark"}
            onChange={() => handleThemeChange("dark")}
          />
          {t("settings.theme.dark")}
        </label>
      </div>

      <div>
        <p>{t("settings.taskInsertPosition.title")}</p>
        <label>
          <input
            type="radio"
            name="taskInsertPosition"
            value="bottom"
            checked={state.settings.taskInsertPosition === "bottom"}
            onChange={() => handleTaskInsertPositionChange("bottom")}
          />
          {t("settings.taskInsertPosition.bottom")}
        </label>
        <label>
          <input
            type="radio"
            name="taskInsertPosition"
            value="top"
            checked={state.settings.taskInsertPosition === "top"}
            onChange={() => handleTaskInsertPositionChange("top")}
          />
          {t("settings.taskInsertPosition.top")}
        </label>
      </div>

      <div>
        <p>{t("settings.autoSort.title")}</p>
        <label>
          <input
            type="checkbox"
            name="autoSort"
            checked={state.settings.autoSort}
            onChange={(event) => handleAutoSortChange(event.target.checked)}
          />
          {t("settings.autoSort.enable")}
        </label>
      </div>

      <div>
        <h2>{t("settings.danger.title")}</h2>
        <div>
          <button
            onClick={() => setShowSignOutConfirm(true)}
            disabled={loading}
          >
            {!loading && t("settings.danger.signOut")}
          </button>

          <button onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
            {!loading && t("settings.danger.deleteAccount")}
          </button>
        </div>
      </div>

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
  );
}
