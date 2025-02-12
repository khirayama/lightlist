import { useEffect } from "react";

import { createSupabaseClient, Session } from "common/supabase";
import { useGlobalState } from "globalstate/react";
import {
  initializeAuth,
  setSession,
  fetchApp,
  fetchPreferences,
  fetchProfile,
  fetchTaskLists,
} from "mutations";

const supabase = createSupabaseClient();

export function AuthWorker() {
  const [, , mutate] = useGlobalState();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session: Session) => {
      if (event === "INITIAL_SESSION") {
        mutate(initializeAuth);
      }

      mutate(setSession, { session });
    });
  }, []);

  return null;
}

export function PollingWorker() {
  const [
    {
      auth: { session },
    },
    ,
    mutate,
  ] = useGlobalState();

  useEffect(() => {
    const pollingInterval = 10000;
    const intervalIds = [];

    const checkSession = (fn) => {
      const currentTime = Math.floor(Date.now() / 1000);
      if (session?.expires_at && session.expires_at > currentTime) {
        return fn;
      } else {
        console.warn("Session expired");
        return () => {};
      }
    };

    mutate(checkSession(fetchApp));
    intervalIds.push(
      setInterval(() => mutate(checkSession(fetchApp)), pollingInterval),
    );

    mutate(checkSession(fetchPreferences));
    intervalIds.push(
      setInterval(
        () => mutate(checkSession(fetchPreferences)),
        pollingInterval,
      ),
    );

    mutate(checkSession(fetchProfile));
    intervalIds.push(
      setInterval(() => mutate(checkSession(fetchProfile)), pollingInterval),
    );

    mutate(checkSession(fetchTaskLists));
    intervalIds.push(
      setInterval(() => mutate(checkSession(fetchTaskLists)), pollingInterval),
    );

    return () => {
      intervalIds.forEach((intervalId) => clearInterval(intervalId));
    };
  }, [session.expires_at]);

  return null;
}
