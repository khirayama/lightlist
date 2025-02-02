import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { type Session, createClient } from "@supabase/supabase-js";
import { register } from "v2/common/services";

type AuthContext = [
  {
    isLoggedIn: boolean;
    isInitialized: boolean;
    session: Session;
  },
  {
    signUpOrIn: (
      options: { email: string; password: string },
      lang: string,
    ) => Promise<unknown>;
    resetPasswordForEmail: (email: string) => Promise<unknown>;
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

  return (
    <AuthContext.Provider
      value={[
        {
          isLoggedIn: !!session?.user,
          isInitialized,
          session,
        },
        {
          signUpOrIn: async (options, lang: string = "JA") => {
            const res = await supabase.auth.signUp(options);
            if (res.error) {
              return supabase.auth.signInWithPassword(options);
            }
            return register({ lang });
          },
          resetPasswordForEmail: (email) =>
            supabase.auth.resetPasswordForEmail(email),
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
