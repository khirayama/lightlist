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
  },
  {
    getUser: () => Promise<{ data: any }>;
    deleteUser: (id: string) => Promise<unknown>;
    updateUser: (attributes: { [key: string]: string }) => Promise<unknown>;
    signOut: () => Promise<unknown>;
  },
];

let ss: Session = null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const AuthContext = createContext<AuthContext>(null);

export const AuthProvider = (props: { children: ReactNode }) => {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      ss = session;
      if (session) {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      ss = session;

      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }

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
          isLoggedIn: !!user,
          isInitialized,
        },
        {
          getUser: supabase.auth.getUser,
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

export const getSession = (): Session => ss;
