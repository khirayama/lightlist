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

async function forceGetUser() {
  try {
    let supabaseToken = localStorage.getItem("sb-localhost-auth-token");

    if (!supabaseToken) {
      console.log("No token found in local storage");
      return;
    }

    const tokenData = JSON.parse(supabaseToken);
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      console.log("No access token found in storage data");
      return;
    }

    const response = await fetch("http://localhost:54321/auth/v1/user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      console.error("Error fetching session:", response.statusText);
      return;
    }

    const userData = await response.json();
    console.log("User data fetched via REST:", userData);

    const session = {
      user: userData,
      access_token: accessToken,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 仮の有効期限（1時間）
    };
    return session;
  } catch (error) {
    console.error("Error checking session:", error);
  }
}

export function AuthWorker() {
  const supabase = createSupabaseClient();

  const [, , mutate] = useGlobalState();

  useEffect(() => {
    // forceGetUser().then((session) => {
    //   mutate(setSession, { session });
    //   mutate(initializeAuth);
    // });
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
