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
import { FormErrors, validateAuthForm } from "@/utils/validation";

type AuthTab = "signin" | "signup" | "reset";

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
    } catch (error) {
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
    } catch (error) {
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

  const tabButtonClass = (isActive: boolean) =>
    [
      "inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:focus-visible:outline-gray-500",
      isActive
        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-50"
        : "text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-900/60",
    ].join(" ");

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200 dark:focus-visible:outline-gray-500";

  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500";

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
          </div>

          <div
            className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
            role="tablist"
            aria-label={t("title")}
          >
            <button
              id="auth-tab-signin"
              type="button"
              role="tab"
              aria-selected={activeTab === "signin"}
              aria-controls="auth-panel-signin"
              className={tabButtonClass(activeTab === "signin")}
              onClick={() => handleTabChange("signin")}
            >
              {t("auth.tabs.signin")}
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              role="tab"
              aria-selected={activeTab === "signup"}
              aria-controls="auth-panel-signup"
              className={tabButtonClass(activeTab === "signup")}
              onClick={() => handleTabChange("signup")}
            >
              {t("auth.tabs.signup")}
            </button>
          </div>

          {activeTab === "signin" && (
            <section
              id="auth-panel-signin"
              role="tabpanel"
              aria-labelledby="auth-tab-signin"
              className="space-y-4"
            >
              <form onSubmit={handleSignIn} className="space-y-4">
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
                  className={primaryButtonClass}
                >
                  {loading
                    ? t("auth.button.signingIn")
                    : t("auth.button.signin")}
                </button>
              </form>
              <button
                type="button"
                onClick={() => handleTabChange("reset")}
                className={secondaryButtonClass}
              >
                {t("auth.button.forgotPassword")}
              </button>
            </section>
          )}

          {activeTab === "signup" && (
            <section
              id="auth-panel-signup"
              role="tabpanel"
              aria-labelledby="auth-tab-signup"
              className="space-y-4"
            >
              <form onSubmit={handleSignUp} className="space-y-4">
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
                  className={primaryButtonClass}
                >
                  {loading
                    ? t("auth.button.signingUp")
                    : t("auth.button.signup")}
                </button>
              </form>
            </section>
          )}

          {activeTab === "reset" && (
            <section className="space-y-4">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetSent ? (
                  <Alert variant="success">
                    {t("auth.passwordReset.success")}
                  </Alert>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
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
                      className={primaryButtonClass}
                    >
                      {resetLoading
                        ? t("auth.button.sending")
                        : t("auth.button.sendResetEmail")}
                    </button>
                  </>
                )}
              </form>
              <button
                type="button"
                onClick={() => handleTabChange("signin")}
                className={secondaryButtonClass}
              >
                {t("auth.button.backToSignIn")}
              </button>
            </section>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {t("copyright")}
        </p>
      </div>
    </div>
  );
}
