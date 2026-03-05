import Constants from "expo-constants";

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

export const logSignUp = () => log("sign_up", { method: "email" });
export const logLogin = () => log("login", { method: "email" });
export const logSignOut = () => log("app_sign_out");
export const logDeleteAccount = () => log("app_delete_account");
export const logPasswordResetEmailSent = () =>
  log("app_password_reset_email_sent");
export const logEmailChangeRequested = () => log("app_email_change_requested");
export const logTaskListCreate = () => log("app_task_list_create");
export const logTaskListDelete = () => log("app_task_list_delete");
export const logTaskListReorder = () => log("app_task_list_reorder");
export const logTaskAdd = (params: { has_date: boolean }) =>
  log("app_task_add", params);
export const logTaskUpdate = (params: { fields: string }) =>
  log("app_task_update", params);
export const logTaskDelete = () => log("app_task_delete");
export const logTaskReorder = () => log("app_task_reorder");
export const logTaskSort = () => log("app_task_sort");
export const logTaskDeleteCompleted = (params: { count: number }) =>
  log("app_task_delete_completed", params);
export const logShareCodeGenerate = () => log("app_share_code_generate");
export const logShareCodeRemove = () => log("app_share_code_remove");
export const logShareCodeJoin = () => log("app_share_code_join");
export const logShare = () =>
  log("share", { method: "share_code", content_type: "task_list" });
export const logSettingsThemeChange = (params: {
  theme: "system" | "light" | "dark";
}) => log("app_settings_theme_change", params);
export const logSettingsLanguageChange = (params: { language: string }) =>
  log("app_settings_language_change", params);
export const logSettingsTaskInsertPositionChange = (params: {
  position: "top" | "bottom";
}) => log("app_settings_task_insert_position_change", params);
export const logSettingsAutoSortChange = (params: { enabled: boolean }) =>
  log("app_settings_auto_sort_change", params);
export const logException = (description: string, fatal: boolean) => {
  void recordError(new Error(description), fatal);
};
