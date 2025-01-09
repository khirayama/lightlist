import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from "react";
import {
  type Session,
  VerifyOtpParams,
  createClient,
} from "@supabase/supabase-js";
import { register } from "v2/common/services";

function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isPhoneNumber(phoneNumber: string): boolean {
  const numberRegex = /^\d+$/;
  return numberRegex.test(phoneNumber);
}

type AuthContext = [
  {
    isLoggedIn: boolean;
    isInitialized: boolean;
    session: Session;
  },
  {
    signUpOrInWithOtp: (
      emailOrPhoneNumber: string,
      lang?: string,
    ) => Promise<unknown>;
    verifyOtpWithToken: (
      emailOrPhoneNumber: string,
      token: string,
      lang?: string,
    ) => Promise<unknown>;
    verifyOtpWithLink: (token: string, lang?: string) => Promise<unknown>;
    updateUser: (attributes: { [key: string]: string }) => Promise<unknown>;
    deleteUser: (id: string) => Promise<unknown>;
    signOut: () => Promise<unknown>;
  },
];

let ss: Session = null;

export const setSession = (session: Session) => {
  ss = session;
};

export const getSession = (): Session => ss;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const AuthContext = createContext<AuthContext>(null);

export const AuthProvider = (props: { children: ReactNode }) => {
  const [session, setSessionState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionState(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setSessionState(session);

      if (event === "INITIAL_SESSION") {
        setIsInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifyOtp = async (options: VerifyOtpParams, lang: string) => {
    return supabase.auth.verifyOtp(options).then(({ data }) => {
      setSession(data.session);
      if (isSignUp) {
        register({ lang });
      }
    });
  };

  return (
    <AuthContext.Provider
      value={[
        {
          isLoggedIn: !!session?.user,
          isInitialized,
          session,
        },
        {
          signUpOrInWithOtp: async (emailOrPhoneNumber: string) => {
            let options:
              | {
                  email: string;
                  options: {
                    shouldCreateUser: boolean;
                  };
                }
              | {
                  phone: string;
                  options: {
                    shouldCreateUser: boolean;
                  };
                };
            if (isEmail(emailOrPhoneNumber)) {
              options = {
                email: emailOrPhoneNumber,
                options: {
                  shouldCreateUser: false,
                },
              };
            } else if (isPhoneNumber(emailOrPhoneNumber)) {
              options = {
                phone: emailOrPhoneNumber,
                options: {
                  shouldCreateUser: false,
                },
              };
            } else {
              throw new Error("Invalid email or phone number");
            }
            return supabase.auth.signInWithOtp(options).then((res) => {
              if (res.error) {
                options.options.shouldCreateUser = true;
                setIsSignUp(true);
                return supabase.auth.signInWithOtp(options);
              }
            });
          },
          verifyOtpWithToken: (
            emailOrPhoneNumber: string,
            token: string,
            lang: string = "JA",
          ) => {
            let options: VerifyOtpParams;
            if (isEmail(emailOrPhoneNumber)) {
              options = {
                email: emailOrPhoneNumber,
                token,
                type: "email",
              };
            } else if (isPhoneNumber(emailOrPhoneNumber)) {
              options = {
                phone: emailOrPhoneNumber,
                token,
                type: "sms",
              };
            } else {
              throw new Error("Invalid email or phone number");
            }
            return verifyOtp(options, lang);
          },
          verifyOtpWithLink: (token: string, lang: string = "JA") => {
            return verifyOtp(
              {
                token_hash: token,
                type: "magiclink",
              },
              lang,
            );
          },
          deleteUser: (options) => supabase.auth.admin.deleteUser(options),
          updateUser: (options) => supabase.auth.updateUser(options),
          signOut: () => supabase.auth.signOut(),
        },
      ]}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContext => {
  return useContext(AuthContext);
};
