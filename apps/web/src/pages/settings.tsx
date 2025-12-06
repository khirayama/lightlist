"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import { AppState, Theme, Language } from "@lightlist/sdk/types";
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
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden text-slate-900 dark:text-white">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 dark:from-[#0b1020] dark:via-[#0b1020] dark:to-[#0b1020]" />
        <div
          className="absolute inset-0 -z-10 pointer-events-none opacity-60"
          style={{ backgroundImage: "var(--glow)" }}
        />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden py-12 px-4 text-slate-900 dark:text-white">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 dark:from-[#0b1020] dark:via-[#0b1020] dark:to-[#0b1020]" />
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{ backgroundImage: "var(--glow)" }}
      />
      <div className="absolute -top-24 left-10 w-72 h-72 bg-gradient-to-br from-cyan-400/35 to-emerald-400/30 blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-300/25 via-rose-300/30 to-cyan-400/25 blur-3xl -z-10" />

      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-3xl shadow-[0_24px_90px_rgba(15,23,42,0.35)] p-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 shadow hover:border-white/60 transition-colors"
              title={t("common.back")}
            >
              <svg
                className="w-5 h-5 text-slate-800 dark:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold flex-1 text-center">
              {t("settings.title")}
            </h1>
            <div className="w-10" />
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="mb-6 p-5 bg-white/60 dark:bg-white/10 border border-white/20 rounded-2xl">
            <p className="text-sm text-slate-600 dark:text-slate-200">
              {t("settings.userInfo.title")}
            </p>
            <p className="text-lg font-semibold">{state.user.email}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {t("settings.language.title")}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 bg-white/60 dark:bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <input
                  type="radio"
                  name="language"
                  value="ja"
                  checked={state.settings.language === "ja"}
                  onChange={() => handleLanguageChange("ja")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-800 dark:text-white">
                  {t("settings.language.japanese")}
                </span>
              </label>
              <label className="flex items-center gap-2 bg-white/60 dark:bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={state.settings.language === "en"}
                  onChange={() => handleLanguageChange("en")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-800 dark:text-white">
                  {t("settings.language.english")}
                </span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {t("settings.theme.title")}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 bg-white/60 dark:bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={state.settings.theme === "system"}
                  onChange={() => handleThemeChange("system")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-800 dark:text-white">
                  {t("settings.theme.system")}
                </span>
              </label>
              <label className="flex items-center gap-2 bg-white/60 dark:bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={state.settings.theme === "light"}
                  onChange={() => handleThemeChange("light")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-800 dark:text-white">
                  {t("settings.theme.light")}
                </span>
              </label>
              <label className="flex items-center gap-2 bg-white/60 dark:bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={state.settings.theme === "dark"}
                  onChange={() => handleThemeChange("dark")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-800 dark:text-white">
                  {t("settings.theme.dark")}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 mt-6">
            <h2 className="text-sm font-bold mb-3">
              {t("settings.danger.title")}
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {!loading && t("settings.danger.signOut")}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-500 to-amber-400 text-white font-semibold py-3 rounded-xl shadow-[0_18px_60px_rgba(251,113,133,0.3)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {!loading && t("settings.danger.deleteAccount")}
              </button>
            </div>
          </div>
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
