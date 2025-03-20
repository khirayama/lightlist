import i18n from "i18next";
import { useState } from "react";
import { config } from "config";
import { signUpOrIn, resetPasswordForEmail } from "services";
import { useCustomTranslation } from "ui/i18n";
import {
  FormField,
  SubmitButton,
  ErrorMessage,
  validateEmail,
} from "components/AuthComponents";

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

    // メールアドレスの検証
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(t(emailValidation.error));
      return;
    }

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
          <h2 className="mb-6 text-center text-xl font-semibold">
            {view === "register"
              ? t("Sign Up or Sign In")
              : t("Reset Password")}
          </h2>
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
              <ErrorMessage message={error} />

              <form onSubmit={handleSubmit}>
                <FormField
                  label={t("Email")}
                  type="email"
                  placeholder={t("Email")}
                  value={email}
                  onChange={setEmail}
                  required
                  disabled={isLoading}
                />

                {view !== "reset" && (
                  <FormField
                    label={t("Password")}
                    type="password"
                    placeholder={t("Password")}
                    value={password}
                    onChange={setPassword}
                    required
                    disabled={isLoading}
                  />
                )}

                <SubmitButton
                  text={
                    view === "register"
                      ? t("Sign Up or Sign In")
                      : t("Send reset password instructions")
                  }
                  loadingText={
                    view === "register" ? t("Logging In") : t("Sending...")
                  }
                  isLoading={isLoading}
                />
              </form>

              {view !== "reset" ? (
                <div className="text-center">
                  <button
                    onClick={() => setView("reset")}
                    className="text-primary text-sm hover:underline"
                  >
                    {t("Forgot your password?")}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setView("register")}
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
