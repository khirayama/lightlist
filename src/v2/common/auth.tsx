import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { type Session, createClient } from "@supabase/supabase-js";

type AuthContext = [
  {
    isLoggedIn: boolean;
    isInitialized: boolean;
    session: Session;
  },
  {
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
          deleteUser: supabase.auth.admin.deleteUser,
          updateUser: supabase.auth.updateUser,
          signOut: supabase.auth.signOut,
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
