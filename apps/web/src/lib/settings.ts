import { doc, onSnapshot, type FirestoreError } from "firebase/firestore";
import { useSyncExternalStore } from "react";

import { getDbInstance } from "./firebase";
import { getCurrentSessionState, subscribeSessionStore } from "./session";
import type { AppState, SettingsStore } from "./types";

type SettingsState = Pick<AppState, "settings" | "settingsStatus">;

const listeners = new Set<() => void>();
const serverSettingsState: SettingsState = {
  settings: null,
  settingsStatus: "idle",
};

let settingsStarted = false;
let sessionUnsubscribe: (() => void) | null = null;
let settingsUnsubscribe: (() => void) | null = null;
let settingsState: SettingsState = serverSettingsState;
let cachedSettingsState: SettingsState | null = serverSettingsState;

const mapSettingsStore = (settingsStore: SettingsStore | null) => {
  if (!settingsStore) {
    return null;
  }
  return {
    theme: settingsStore.theme,
    language: settingsStore.language,
    taskInsertPosition: settingsStore.taskInsertPosition,
    autoSort: settingsStore.autoSort,
  };
};

const emitSettingsState = (nextState: SettingsState) => {
  if (
    settingsState.settings === nextState.settings &&
    settingsState.settingsStatus === nextState.settingsStatus
  ) {
    return;
  }
  settingsState = nextState;
  cachedSettingsState = null;
  listeners.forEach((listener) => listener());
};

const resetSettingsState = () => {
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
  emitSettingsState(serverSettingsState);
};

const subscribeUserSettings = (uid: string) => {
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
  emitSettingsState({
    settings: settingsState.settings,
    settingsStatus: "loading",
  });

  settingsUnsubscribe = onSnapshot(
    doc(getDbInstance(), "settings", uid),
    (snapshot) => {
      const settingsStore = snapshot.exists()
        ? (snapshot.data() as SettingsStore)
        : null;
      emitSettingsState({
        settings: mapSettingsStore(settingsStore),
        settingsStatus: "ready",
      });
    },
    (_error: FirestoreError) => {
      emitSettingsState({
        settings: null,
        settingsStatus: "error",
      });
    },
  );
};

const handleSessionChange = () => {
  const session = getCurrentSessionState();
  if (session.authStatus === "authenticated" && session.user) {
    subscribeUserSettings(session.user.uid);
    return;
  }
  resetSettingsState();
};

const ensureSettingsStarted = () => {
  if (settingsStarted) {
    return;
  }
  settingsStarted = true;
  sessionUnsubscribe = subscribeSessionStore(handleSessionChange);
  handleSessionChange();
};

export const subscribeSettingsStore = (listener: () => void): (() => void) => {
  ensureSettingsStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getServerSettingsState = (): SettingsState => {
  return serverSettingsState;
};

export const getCurrentSettings = (): AppState["settings"] => {
  return settingsState.settings;
};

export const getCurrentSettingsStatus = (): AppState["settingsStatus"] => {
  return settingsState.settingsStatus;
};

const getCurrentSettingsState = (): SettingsState => {
  if (
    cachedSettingsState &&
    cachedSettingsState.settings === settingsState.settings &&
    cachedSettingsState.settingsStatus === settingsState.settingsStatus
  ) {
    return cachedSettingsState;
  }
  cachedSettingsState = {
    settings: settingsState.settings,
    settingsStatus: settingsState.settingsStatus,
  };
  return cachedSettingsState;
};

export function useSettingsState(): SettingsState {
  return useSyncExternalStore(
    subscribeSettingsStore,
    getCurrentSettingsState,
    getServerSettingsState,
  );
}

export function useSettings(): AppState["settings"] {
  return useSyncExternalStore(
    subscribeSettingsStore,
    getCurrentSettings,
    () => getServerSettingsState().settings,
  );
}

function useSettingsStatus(): AppState["settingsStatus"] {
  return useSyncExternalStore(
    subscribeSettingsStore,
    getCurrentSettingsStatus,
    () => getServerSettingsState().settingsStatus,
  );
}

const disposeSettingsStore = () => {
  sessionUnsubscribe?.();
  sessionUnsubscribe = null;
  resetSettingsState();
  settingsStarted = false;
  cachedSettingsState = serverSettingsState;
  listeners.clear();
};
