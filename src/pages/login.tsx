import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import qs from "query-string";

import { config } from "config";
import { useAuth, AuthProvider } from "v2/common/auth";
import { useCustomTranslation } from "v2/libs/i18n";

function Content() {
  const router = useRouter();

  const { t } = useCustomTranslation("pages.login");
  const [{ isLoggedIn }, { signUpOrInWithOtp, verifyOtpWithToken }] = useAuth();
  const [view, setView] = useState<"signup" | "opt">("signup");

  const [emailOrPhoneNumber, setEmailOrPhoneNumber] = useState("");
  const [token, setToken] = useState("");

  if (view === "opt" && isLoggedIn) {
    window.location.replace(config.appBaseUrl);
  }

  return (
    <div className="h-full">
      <header className="absolute left-0 top-0 w-full text-center">
        <h1 className="py-8">
          <Link href="/">
            <img src="/logo.svg" alt="Lightlist" className="inline h-[2rem]" />
          </Link>
        </h1>
      </header>

      <div className="mx-auto flex h-full max-w-sm items-center justify-center py-12">
        <div className="pb-16">
          {view === "signup" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signUpOrInWithOtp(
                  emailOrPhoneNumber,
                  router.query.lang as string,
                ).then(() => {
                  setView("opt");
                });
              }}
            >
              <div>
                <input
                  type="email"
                  placeholder="Email or Phone Number"
                  value={emailOrPhoneNumber}
                  onChange={(e) => setEmailOrPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <button>Sign Up or Log In</button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const url =
                  (qs.parse(window?.location.search).redirect as string) ||
                  config.appBaseUrl;
                verifyOtpWithToken(
                  emailOrPhoneNumber,
                  token,
                  router.query.lang as string,
                ).then(() => {
                  window.location.replace(url);
                });
              }}
            >
              <div>
                <input
                  type="number"
                  placeholder="OTP Code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div>
                <button>Submit OTP Code</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <Content />
    </AuthProvider>
  );
}
