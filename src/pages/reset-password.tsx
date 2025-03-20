import i18n from "i18next";
import { useState } from "react";
import { config } from "config";
import { updatePassword } from "services";
import { useCustomTranslation } from "ui/i18n";
import {
  FormField,
  SubmitButton,
  ErrorMessage,
  validatePassword,
  validatePasswordConfirmation,
} from "components/AuthComponents";

export default function ResetPasswordPage({ lang }) {
  i18n.changeLanguage(lang);
  const { t } = useCustomTranslation("pages.resetPassword");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    // パスワードのバリデーション
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(t(passwordValidation.error));
      return;
    }

    // パスワード確認のバリデーション
    const confirmationValidation = validatePasswordConfirmation(
      password,
      confirmPassword,
    );
    if (!confirmationValidation.isValid) {
      setError(t(confirmationValidation.error));
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);
      if (result.success) {
        setSuccess(true);
        window.location.href = config.appBaseUrl;
      } else {
        setError(t(result.error) || t("Failed to update password"));
      }
    } catch (err) {
      setError(t("An unexpected error occurred"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary h-full">
      <header className="absolute top-0 left-0 w-full text-center">
        <h1 className="py-8">
          <a href="/">
            <img src="/logo.svg" alt="Lightlist" className="inline h-[2rem]" />
          </a>
        </h1>
      </header>

      <div className="mx-auto flex h-full max-w-sm items-center justify-center py-12">
        <div className="w-full px-4 pb-16">
          <h2 className="mb-6 text-center text-xl font-semibold">
            {t("Reset Password")}
          </h2>
          {success ? (
            <div className="text-center">
              <p className="mb-2 text-green-600">
                {t("Password has been updated successfully!")}
              </p>
              <p>{t("Redirecting to the app...")}</p>
            </div>
          ) : (
            <>
              <ErrorMessage message={error} />

              <form onSubmit={handleResetPassword}>
                <FormField
                  label={t("New Password")}
                  type="password"
                  placeholder={t("Enter new password")}
                  value={password}
                  onChange={setPassword}
                  required
                  disabled={loading}
                />

                <FormField
                  label={t("Confirm Password")}
                  type="password"
                  placeholder={t("Confirm your password")}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  disabled={loading}
                />

                <SubmitButton
                  text={t("Update Password")}
                  loadingText={t("Processing...")}
                  isLoading={loading}
                />

                <div className="mt-4 text-center">
                  <a href="/login" className="text-primary hover:underline">
                    {t("Back to Login")}
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async ({ query }) => {
  i18n.changeLanguage(query.lang);
  return {
    props: { lang: i18n.resolvedLanguage },
  };
};
