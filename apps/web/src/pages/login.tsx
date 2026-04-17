import { HTMLInputTypeAttribute, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  sendPasswordResetEmail,
  signIn,
  signUp,
  useAuthStatus,
} from "@/common";
import {
  FormErrors,
  LANGUAGE_DISPLAY_NAMES,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  resolveErrorMessage,
  validateAuthForm,
} from "@/common";
import { Alert } from "@/common";
import { logLogin, logSignUp, logPasswordResetEmailSent } from "@/common";

type AuthTab = "signin" | "signup" | "reset";

type FormInputProps = {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder: string;
};

function FormInput({
  id,
  label,
  type,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-text dark:text-text-dark"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-error dark:text-error-dark"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const authStatus = useAuthStatus();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      window.location.replace("/app");
    }
  }, [authStatus]);

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
      async () => {
        await signIn(email, password);
        logLogin();
      },
      { email, password },
      setLoading,
    );
  };

  const handleSignUp = (e: React.FormEvent) => {
    const resolvedLanguage = normalizeLanguage(i18n.language);
    handleAuthAction(
      e,
      async () => {
        await signUp(email, password, resolvedLanguage);
        logSignUp();
      },
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
      await sendPasswordResetEmail(email, normalizeLanguage(i18n.language));
      setResetSent(true);
      logPasswordResetEmailSent();
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
      "inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark",
      isActive
        ? "bg-surface text-text shadow-sm dark:bg-surface-dark dark:text-text-dark"
        : "text-muted hover:bg-surface/70 dark:text-muted-dark dark:hover:bg-surface-dark/60",
    ].join(" ");

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primaryText shadow-sm transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";

  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";
  const selectedLanguage = normalizeLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  return (
    <div className="min-h-screen w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6"
      >
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
          </div>
          <div className="mb-6 flex justify-end">
            <select
              value={selectedLanguage}
              onChange={(event) =>
                void i18n.changeLanguage(normalizeLanguage(event.target.value))
              }
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
              aria-label="Language"
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_DISPLAY_NAMES[language]}
                </option>
              ))}
            </select>
          </div>

          <div
            className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-background p-1 dark:bg-surface-dark"
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
                    <p className="text-sm text-muted dark:text-muted-dark">
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

        <p className="mt-6 text-center text-xs text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}
