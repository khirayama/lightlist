import { useEffect } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

import { useGlobalState } from "globalstate/react";
import {
  initializeAuth,
  setSession,
  fetchApp,
  fetchPreferences,
  fetchProfile,
  fetchTaskLists,
} from "mutations";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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
  const [, , mutate] = useGlobalState();

  useEffect(() => {
    const pollingInterval = 10000;
    const intervalIds = [];

    mutate(fetchApp);
    intervalIds.push(setInterval(() => mutate(fetchApp), pollingInterval));

    mutate(fetchPreferences);
    intervalIds.push(
      setInterval(() => mutate(fetchPreferences), pollingInterval),
    );

    mutate(fetchProfile);
    intervalIds.push(setInterval(() => mutate(fetchProfile), pollingInterval));

    mutate(fetchTaskLists);
    intervalIds.push(
      setInterval(() => mutate(fetchTaskLists), pollingInterval),
    );

    return () => {
      intervalIds.forEach((intervalId) => clearInterval(intervalId));
    };
  }, []);
  return null;
}
