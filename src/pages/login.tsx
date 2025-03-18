import i18n from "i18next";
import { useState } from "react";

import { config } from "config";
import { signUpOrIn, resetPasswordForEmail } from "services";
import { useCustomTranslation } from "ui/i18n";

export default function LoginPage({ lang }) {
  i18n.changeLanguage(lang);
  const { t } = useCustomTranslation("pages.login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"register" | "reset">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (view === "register") {
        const result = await signUpOrIn({ email, password }, lang);
        if (result && result.success) {
          window.location.href = config.appBaseUrl;
        } else {
          setError(result?.error || t("Failed to sign in"));
        }
      } else {
        const { error } = await resetPasswordForEmail(email);
        if (error) {
          setError(error.message);
        } else {
          setResetSent(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(t("An unexpected error occurred"));
    } finally {
      setIsLoading(false);
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
          {resetSent ? (
            <div className="text-center">
              <p className="mb-4">
                {t("Password reset instructions have been sent")}
              </p>
              <button
                onClick={() => {
                  setView("register");
                  setResetSent(false);
                }}
                className="text-primary hover:underline"
              >
                {t("Back to Login")}
              </button>
            </div>
          ) : (
            <>
              <h2 className="bg-primary mb-6 text-center text-xl font-semibold">
                {view === "register"
                  ? t("Sign Up or Sign In")
                  : t("Reset Password")}
              </h2>

              {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">
                    {t("Email")}
                  </label>
                  <input
                    type="email"
                    placeholder={t("Email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border p-2"
                    required
                    disabled={isLoading}
                  />
                </div>

                {view !== "reset" && (
                  <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium">
                      {t("Password")}
                    </label>
                    <input
                      type="password"
                      placeholder={t("Password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded border p-2"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="mb-4 flex justify-center">
                  <button
                    type="submit"
                    className="hover:bg-opacity-90 focus:ring-primary rounded-full px-4 py-2 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? view === "register"
                        ? t("Logging In")
                        : t("Sending...")
                      : view === "register"
                        ? t("Sign Up or Sign In")
                        : t("Send reset password instructions")}
                  </button>
                </div>
              </form>

              {view !== "reset" ? (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setView("reset");
                    }}
                    className="text-primary text-sm hover:underline"
                  >
                    {t("Forgot your password?")}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setView("register");
                    }}
                    className="text-primary text-sm hover:underline"
                  >
                    {t("Back to Login")}
                  </button>
                </div>
              )}
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
