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
    <div>
      <h1>{t("title")}</h1>

      <div>
        <button onClick={() => handleTabChange("signin")}>
          {t("auth.tabs.signin")}
        </button>
        <button onClick={() => handleTabChange("signup")}>
          {t("auth.tabs.signup")}
        </button>
        <button onClick={() => handleTabChange("reset")}>
          {t("auth.button.forgotPassword")}
        </button>
      </div>

      {activeTab === "signin" && (
        <form onSubmit={handleSignIn}>
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
          {errors.general && <Alert variant="error">{errors.general}</Alert>}
          <button type="submit" disabled={loading}>
            {loading ? t("auth.button.signingIn") : t("auth.button.signin")}
          </button>
        </form>
      )}

      {activeTab === "signup" && (
        <form onSubmit={handleSignUp}>
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
          {errors.general && <Alert variant="error">{errors.general}</Alert>}
          <button type="submit" disabled={loading}>
            {loading ? t("auth.button.signingUp") : t("auth.button.signup")}
          </button>
        </form>
      )}

      {activeTab === "reset" && (
        <form onSubmit={handlePasswordReset}>
          {resetSent ? (
            <Alert variant="success">{t("auth.passwordReset.success")}</Alert>
          ) : (
            <>
              <p>{t("auth.passwordReset.instruction")}</p>
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
              <button type="submit" disabled={resetLoading}>
                {resetLoading
                  ? t("auth.button.sending")
                  : t("auth.button.sendResetEmail")}
              </button>
            </>
          )}
          <button type="button" onClick={() => handleTabChange("signin")}>
            {t("auth.button.backToSignIn")}
          </button>
        </form>
      )}

      <p>{t("copyright")}</p>
    </div>
  );
}
