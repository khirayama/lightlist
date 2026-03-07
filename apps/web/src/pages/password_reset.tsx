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
import { resolveErrorMessage } from "@lightlist/sdk/utils/errors";
import {
  FormErrors,
  validatePasswordForm,
} from "@lightlist/sdk/utils/validation";

export default function PasswordResetPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primaryText shadow-sm transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";

  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";

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
      } catch (err) {
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
        throw new Error(t("auth.passwordReset.invalidCode"));
      }

      await confirmPasswordReset(oobCode, password);
      setResetSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setErrors({
        general: resolveErrorMessage(err, t, "auth.error.general"),
      });
      setLoading(false);
    }
  };

  if (!router.isReady) {
    return <Spinner fullPage />;
  }

  const content = (() => {
    if (codeValid === false) {
      return (
        <div className="space-y-4">
          <Alert variant="error">
            {errors.general || t("auth.passwordReset.invalidCode")}
          </Alert>
          <button
            type="button"
            onClick={() => router.push("/")}
            className={secondaryButtonClass}
          >
            {t("auth.button.backToSignIn")}
          </button>
        </div>
      );
    }

    if (resetSuccess) {
      return (
        <div className="space-y-4">
          <Alert variant="success">
            {t("auth.passwordReset.resetSuccess")}
          </Alert>
          <div className="flex justify-center">
            <Spinner />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {errors.general && <Alert variant="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className={primaryButtonClass}
          >
            {loading
              ? t("auth.passwordReset.settingNewPassword")
              : t("auth.passwordReset.setNewPassword")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/")}
          className={secondaryButtonClass}
        >
          {t("auth.button.backToSignIn")}
        </button>
      </div>
    );
  })();

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
              {t("auth.passwordReset.title")}
            </h1>
          </div>
          {content}
        </div>
        <p className="mt-6 text-center text-xs text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}
