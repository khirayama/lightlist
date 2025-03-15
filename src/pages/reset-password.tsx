import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { config } from "config";
import { updatePassword } from "services";
import { useCustomTranslation } from "ui/i18n";

function Content() {
  const router = useRouter();
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
        setTimeout(() => {
          router.push(config.appBaseUrl);
        }, 3000);
      } else {
        setError(result.error || t("Failed to update password"));
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
          <Link href="/">
            <img src="/logo.svg" alt="Lightlist" className="inline h-[2rem]" />
          </Link>
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
                  {t("New Password")}
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
                <button
                  type="submit"
                  className="bg-primary hover:bg-opacity-90 focus:ring-primary rounded-full px-4 py-2 text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  disabled={loading}
                >
                  {loading ? t("Processing...") : t("Update Password")}
                </button>
              </div>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-primary hover:underline">
                  {t("Back to Login")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Content />;
}
