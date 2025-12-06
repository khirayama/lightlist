"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "@lightlist/sdk/mutations/auth";
import { Spinner } from "@/components/ui/Spinner";
import { FormInput } from "@/components/ui/FormInput";
import { Alert } from "@/components/ui/Alert";
import { resolveErrorMessage } from "@/utils/errors";
import { validatePasswordForm } from "@/utils/validation";

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// ===== Main Component =====
export default function PasswordResetPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Verify password reset code
  useEffect(() => {
    if (!router.isReady) return;

    const { oobCode } = router.query;

    if (!oobCode || typeof oobCode !== "string") {
      setCodeValid(false);
      return;
    }

    const verifyCode = async () => {
      try {
        await verifyPasswordResetCode(oobCode);
        setCodeValid(true);
      } catch (err: unknown) {
        setErrors({
          general: resolveErrorMessage(err, t, "auth.error.general"),
        });
        setCodeValid(false);
      }
    };

    verifyCode();
  }, [router.isReady, router.query, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const validationErrors = validatePasswordForm(
      { password, confirmPassword },
      t,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const { oobCode } = router.query;

      if (!oobCode || typeof oobCode !== "string") {
        throw new Error("Invalid reset code");
      }

      await confirmPasswordReset(oobCode, password);
      setResetSuccess(true);

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: unknown) {
      setErrors({
        general: resolveErrorMessage(err, t, "auth.error.general"),
      });
      setLoading(false);
    }
  };

  if (!router.isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (codeValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-transparent dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            {t("auth.passwordReset.title")}
          </h1>
          <Alert variant="error">
            {errors.general || t("auth.passwordReset.invalidCode")}
          </Alert>
          <button
            onClick={() => router.push("/")}
            className="mt-6 w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t("auth.button.backToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-transparent dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            {t("auth.passwordReset.title")}
          </h1>
          <Alert variant="success">
            {t("auth.passwordReset.resetSuccess")}
          </Alert>
          <div className="mt-4 flex justify-center">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-transparent dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          {t("auth.passwordReset.title")}
        </h1>

        {errors.general && <Alert variant="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <FormInput
            id="password"
            label={t("auth.passwordReset.newPassword")}
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
          />

          <FormInput
            id="confirmPassword"
            label={t("auth.passwordReset.confirmNewPassword")}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
          >
            {loading
              ? t("auth.passwordReset.settingNewPassword")
              : t("auth.passwordReset.setNewPassword")}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full bg-gray-300 text-gray-800 font-medium py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          {t("auth.button.backToSignIn")}
        </button>
      </div>
    </div>
  );
}
