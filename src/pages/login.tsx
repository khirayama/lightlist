import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { config } from "config";
import { signUpOrIn, resetPasswordForEmail } from "services";

function Content() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"register" | "reset">("register");

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
        <div className="pb-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (view === "register") {
                signUpOrIn(
                  { email, password },
                  router.query.lang as string,
                ).then(() => {
                  router.push(config.appBaseUrl);
                });
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
  return <Content />;
}
