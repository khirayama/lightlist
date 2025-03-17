import i18n from "i18next";
import { useState } from "react";

import { config } from "config";
import { updatePassword } from "services";
import { useCustomTranslation } from "ui/i18n";

export default function ResetPasswordPage({ lang }) {
  i18n.changeLanguage(lang.toLowerCase());

  const { t } = useCustomTranslation("pages.resetPassword");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("Passwords do not match"));
      return;
    }

    if (password.length < 6) {
      setError(t("Password must be at least 6 characters"));
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
            <form onSubmit={handleResetPassword}>
              {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">
                  {t("New password")}
                </label>
                <input
                  type="password"
                  placeholder={t("Enter new password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border p-2"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium">
                  {t("Confirm Password")}
                </label>
                <input
                  type="password"
                  placeholder={t("Confirm your password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded border p-2"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex justify-center">
                <button type="submit" disabled={loading}>
                  {loading ? t("Processing...") : t("Update Password")}
                </button>
              </div>

              <div className="mt-4 text-center">
                <a href="/login" className="text-primary hover:underline">
                  {t("Back to Login")}
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async ({ query }) => {
  let lang = query.lang?.toUpperCase() || "JA";
  const supportedLngs = Object.keys(i18n.options.resources).map((l) =>
    l.toUpperCase(),
  );
  if (!supportedLngs.includes(lang)) {
    lang = i18n.resolvedLanguage.toUpperCase();
  }

  return {
    props: { lang: lang.toLowerCase() },
  };
};
