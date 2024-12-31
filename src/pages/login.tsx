import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import qs from "query-string";

import { useSupabase } from "libs/supabase";
import { useCustomTranslation } from "libs/i18n";
import { setSession } from "v2/common/auth";
import { register } from "v2/common/services";

export default function LoginPage() {
  const router = useRouter();

  const { t } = useCustomTranslation("pages.login");
  const { supabase } = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"signup" | "login" | "reset">("signup");

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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const url =
                (qs.parse(window?.location.search).redirect as string) || "/v2";
              if (view === "signup") {
                supabase.auth
                  .signUp({ email, password })
                  .then(({ data }) => {
                    setSession(data.session);
                    register({
                      lang: (router.query.lang as string) || "JA",
                    }).then(() => {
                      router.replace(url);
                    });
                  })
                  .catch((err) => {
                    console.warn("TODO", err);
                  });
              } else if (view === "login") {
                supabase.auth
                  .signInWithPassword({ email, password })
                  .then(() => router.replace(url));
              } else {
                supabase.auth.resetPasswordForEmail(email);
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
                {view === "signup"
                  ? "Sign Up"
                  : view === "login"
                    ? "Log In"
                    : "Send email to reset password"}
              </button>
            </div>
          </form>
          {view === "login" && (
            <div>
              <button
                onClick={() => {
                  setView("signup");
                }}
              >
                I don't have an account
              </button>
            </div>
          )}
          {view !== "login" && (
            <div>
              <button
                onClick={() => {
                  setView("login");
                }}
              >
                I already have an account
              </button>
            </div>
          )}
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
