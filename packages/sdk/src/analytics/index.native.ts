import Constants from "expo-constants";
import { createAnalyticsClient } from "./shared";

const isExpoGo = Constants.executionEnvironment === "storeClient";

const log = async (eventName: string, params?: Record<string, unknown>) => {
  if (isExpoGo) {
    console.log("[analytics]", eventName, params ?? {});
    return;
  }
  const analytics = await import("@react-native-firebase/analytics").then(
    (m) => m.default,
  );
  await analytics().logEvent(eventName, params);
};

const recordError = async (error: Error, fatal: boolean) => {
  if (isExpoGo) {
    console.error("[crashlytics]", error.message, { fatal });
    return;
  }
  const crashlytics = await import("@react-native-firebase/crashlytics").then(
    (m) => m.default,
  );
  crashlytics().recordError(error);
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
} = createAnalyticsClient({
  log,
  logException: (description, fatal) =>
    recordError(new Error(description), fatal),
});
