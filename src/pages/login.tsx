import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { config } from "config";
import { useAuth, AuthProvider } from "v2/common/auth";
import { useCustomTranslation } from "v2/libs/i18n";

function Content() {
  const router = useRouter();

  const { t } = useCustomTranslation("pages.login");
  const [{ isLoggedIn }, { signUpOrIn, resetPasswordForEmail }] = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"register" | "reset">("register");

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(config.appBaseUrl);
    }
  }, [isLoggedIn]);

  return (
    <div className="h-full">
      <header className="absolute top-0 left-0 w-full text-center">
        <h1 className="py-8">
          <Link href="/">
            <img src="/logo.svg" alt="Lightlist" className="inline h-[2rem]" />
          </Link>
        </h1>
      </header>

      <div className="mx-auto flex h-full max-w-sm items-center justify-center py-12">
        <div className="pb-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (view === "register") {
                signUpOrIn({ email, password }, router.query.lang as string);
              } else {
                resetPasswordForEmail(email);
              }
            }}
          >
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {view !== "reset" && (
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <div>
              <button>
                {view === "register"
                  ? "Sign Up or Sign In"
                  : "Send email to reset password"}
              </button>
            </div>
          </form>
          {view !== "reset" && (
            <div>
              <button
                onClick={() => {
                  setView("reset");
                }}
              >
                Forgot password
              </button>
            </div>
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
