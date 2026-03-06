import { getApps } from "firebase/app";
import {
  type Analytics,
  getAnalytics,
  isSupported,
  logEvent,
} from "firebase/analytics";
import { createAnalyticsClient } from "./shared";

let cached: Analytics | null | undefined;

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (cached !== undefined) return cached;
  const supported = await isSupported();
  if (!supported) {
    cached = null;
    return null;
  }
  const apps = getApps();
  if (apps.length === 0) {
    cached = null;
    return null;
  }
  cached = getAnalytics(apps[0]);
  return cached;
};

const log = async (eventName: string, params?: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", eventName, params ?? {});
  }
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
};

export const {
  logSignUp,
  logLogin,
  logSignOut,
  logDeleteAccount,
  logPasswordResetEmailSent,
  logEmailChangeRequested,
  logTaskListCreate,
  logTaskListDelete,
  logTaskListReorder,
  logTaskAdd,
  logTaskUpdate,
  logTaskDelete,
  logTaskReorder,
  logTaskSort,
  logTaskDeleteCompleted,
  logShareCodeGenerate,
  logShareCodeRemove,
  logShareCodeJoin,
  logShare,
  logSettingsThemeChange,
  logSettingsLanguageChange,
  logSettingsTaskInsertPositionChange,
  logSettingsAutoSortChange,
  logException,
} = createAnalyticsClient({ log });
