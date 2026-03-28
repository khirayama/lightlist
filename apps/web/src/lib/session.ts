import {
  onAuthStateChanged,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { useSyncExternalStore } from "react";

import { getAuthInstance } from "./firebase";
import type { AppState, User } from "./types";

type SessionState = Pick<AppState, "authStatus" | "user">;

const listeners = new Set<() => void>();
const serverSessionState: SessionState = {
  authStatus: "loading",
  user: null,
};

let authUnsubscribe: (() => void) | null = null;
let sessionStarted = false;
let sessionState: SessionState = serverSessionState;
let cachedSessionState: SessionState | null = serverSessionState;

const toUser = (user: FirebaseAuthUser | null): User | null => {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
  };
};

const emitSessionState = (nextState: SessionState) => {
  if (
    sessionState.authStatus === nextState.authStatus &&
    sessionState.user === nextState.user
  ) {
    return;
  }
  sessionState = nextState;
  cachedSessionState = null;
  listeners.forEach((listener) => listener());
};

const ensureSessionStarted = () => {
  if (sessionStarted) {
    return;
  }
  sessionStarted = true;
  const auth = getAuthInstance();
  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    emitSessionState({
      authStatus: user ? "authenticated" : "unauthenticated",
      user: toUser(user),
    });
  });
};

export const subscribeSessionStore = (listener: () => void): (() => void) => {
  ensureSessionStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getServerSessionState = (): SessionState => {
  return serverSessionState;
};

export const getCurrentUser = (): User | null => {
  return sessionState.user;
};

const getCurrentUserEmail = (): string => {
  return getCurrentUser()?.email ?? "";
};

const getCurrentAuthStatus = (): AppState["authStatus"] => {
  return sessionState.authStatus;
};

export const getCurrentSessionState = (): SessionState => {
  if (
    cachedSessionState &&
    cachedSessionState.authStatus === sessionState.authStatus &&
    cachedSessionState.user === sessionState.user
  ) {
    return cachedSessionState;
  }
  cachedSessionState = {
    authStatus: sessionState.authStatus,
    user: sessionState.user,
  };
  return cachedSessionState;
};

export function useSessionState(): SessionState {
  return useSyncExternalStore(
    subscribeSessionStore,
    getCurrentSessionState,
    getServerSessionState,
  );
}

export function useAuthStatus(): AppState["authStatus"] {
  return useSyncExternalStore(
    subscribeSessionStore,
    getCurrentAuthStatus,
    () => getServerSessionState().authStatus,
  );
}

export function useUser(): User | null {
  return useSyncExternalStore(
    subscribeSessionStore,
    getCurrentUser,
    () => getServerSessionState().user,
  );
}

export function useUserEmail(): string {
  return useSyncExternalStore(
    subscribeSessionStore,
    getCurrentUserEmail,
    () => getServerSessionState().user?.email ?? "",
  );
}

export const disposeSessionStore = () => {
  authUnsubscribe?.();
  authUnsubscribe = null;
  sessionStarted = false;
  sessionState = serverSessionState;
  cachedSessionState = serverSessionState;
  listeners.clear();
};

if (typeof window !== "undefined") {
  ensureSessionStarted();
}
