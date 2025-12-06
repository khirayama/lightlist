"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import {
  signIn,
  signUp,
  sendPasswordResetEmail,
} from "@lightlist/sdk/mutations/auth";
import { FormInput } from "@/components/ui/FormInput";
import { Alert } from "@/components/ui/Alert";
import { resolveErrorMessage } from "@/utils/errors";
import { validateAuthForm } from "@/utils/validation";

type AuthTab = "signin" | "signup" | "reset";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// ===== Main Component =====
export default function IndexPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        router.push("/app");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAuthAction = async (
    e: React.FormEvent,
    action: () => Promise<void>,
    validationData: Parameters<typeof validateAuthForm>[0],
    setLoadingState: (loading: boolean) => void,
  ) => {
    e.preventDefault();

    const newErrors = validateAuthForm(validationData, t);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoadingState(true);
    setErrors({});

    try {
      await action();
    } catch (error: unknown) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setLoadingState(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    handleAuthAction(
      e,
      () => signIn(email, password),
      { email, password },
      setLoading,
    );
  };

  const handleSignUp = (e: React.FormEvent) => {
    handleAuthAction(
      e,
      () => signUp(email, password),
      { email, password, confirmPassword, requirePasswordConfirm: true },
      setLoading,
    );
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateAuthForm({ email, password: "" }, t);
    if (newErrors.email) {
      setErrors({ email: newErrors.email });
      return;
    }

    setResetLoading(true);
    setErrors({});

    try {
      await sendPasswordResetEmail(email);
      setResetSent(true);
    } catch (error: unknown) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setResetLoading(false);
    }
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setResetSent(false);
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-6 text-slate-900 dark:text-white">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 dark:from-[#0b1020] dark:via-[#0b1020] dark:to-[#0b1020]" />
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{ backgroundImage: "var(--glow)" }}
      />
      <div className="absolute -top-32 -left-24 w-72 h-72 bg-gradient-to-br from-cyan-400/40 to-emerald-400/30 blur-3xl -z-10" />
      <div className="absolute -bottom-20 right-0 w-80 h-80 bg-gradient-to-br from-amber-300/30 via-rose-300/30 to-cyan-400/30 blur-3xl -z-10" />

      <div className="w-full max-w-6xl grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
        <div className="hidden lg:flex flex-col gap-6 rounded-3xl border border-white/20 bg-slate-900/80 dark:bg-white/5 backdrop-blur-3xl p-10 shadow-[0_24px_90px_rgba(15,23,42,0.35)] text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            {t("auth.tabs.signup")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight">{t("title")}</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            {t("auth.passwordReset.instruction")}
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 rounded-full border border-white/25 bg-white/10 text-white/90 text-sm">
              {t("auth.tabs.signin")}
            </span>
            <span className="px-4 py-2 rounded-full border border-white/25 bg-white/10 text-white/90 text-sm">
              {t("auth.tabs.signup")}
            </span>
            <span className="px-4 py-2 rounded-full border border-white/25 bg-white/10 text-white/90 text-sm">
              {t("auth.button.forgotPassword")}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 blur-3xl bg-gradient-to-br from-white/50 via-cyan-200/40 to-emerald-200/50 dark:from-cyan-500/20 dark:via-emerald-500/20 dark:to-lime-400/10" />
          <div className="w-full max-w-lg ml-auto rounded-3xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-3xl shadow-[0_30px_120px_rgba(15,23,42,0.45)] p-8">
            <h1 className="text-3xl font-semibold text-center mb-8">
              {t("title")}
            </h1>

            <div className="flex gap-2 mb-6 bg-white/50 dark:bg-white/5 border border-white/30 rounded-2xl p-1">
              <button
                onClick={() => handleTabChange("signin")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "signin"
                    ? "bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white shadow-[0_14px_40px_rgba(56,189,248,0.28)]"
                    : "text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("auth.tabs.signin")}
              </button>
              <button
                onClick={() => handleTabChange("signup")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "signup"
                    ? "bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white shadow-[0_14px_40px_rgba(56,189,248,0.28)]"
                    : "text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("auth.tabs.signup")}
              </button>
            </div>

            {activeTab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <FormInput
                  id="signin-email"
                  label={t("auth.form.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  disabled={loading}
                  placeholder={t("auth.placeholder.email")}
                />
                <FormInput
                  id="signin-password"
                  label={t("auth.form.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                {errors.general && (
                  <Alert variant="error">{errors.general}</Alert>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? t("auth.button.signingIn")
                    : t("auth.button.signin")}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("reset")}
                  className="w-full text-center text-sm text-cyan-700 dark:text-cyan-200 hover:text-cyan-900 dark:hover:text-white font-semibold py-2"
                >
                  {t("auth.button.forgotPassword")}
                </button>
              </form>
            )}

            {activeTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <FormInput
                  id="signup-email"
                  label={t("auth.form.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  disabled={loading}
                  placeholder={t("auth.placeholder.email")}
                />
                <FormInput
                  id="signup-password"
                  label={t("auth.form.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                <FormInput
                  id="signup-confirm"
                  label={t("auth.form.confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={errors.confirmPassword}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                {errors.general && (
                  <Alert variant="error">{errors.general}</Alert>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? t("auth.button.signingUp")
                    : t("auth.button.signup")}
                </button>
              </form>
            )}

            {activeTab === "reset" && (
              <form onSubmit={handlePasswordReset} className="space-y-5">
                {resetSent ? (
                  <Alert variant="success">
                    {t("auth.passwordReset.success")}
                  </Alert>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {t("auth.passwordReset.instruction")}
                    </p>
                    <FormInput
                      id="reset-email"
                      label={t("auth.form.email")}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      error={errors.email}
                      disabled={resetLoading}
                      placeholder={t("auth.placeholder.email")}
                    />
                    {errors.general && (
                      <Alert variant="error">{errors.general}</Alert>
                    )}
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetLoading
                        ? t("auth.button.sending")
                        : t("auth.button.sendResetEmail")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleTabChange("signin")}
                  className="w-full text-center text-sm text-cyan-700 dark:text-cyan-200 hover:text-cyan-900 dark:hover:text-white font-semibold py-2"
                >
                  {t("auth.button.backToSignIn")}
                </button>
              </form>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-300 text-center mt-6">
              {t("copyright")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
