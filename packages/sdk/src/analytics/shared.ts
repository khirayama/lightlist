type AnalyticsParams = Record<string, unknown>;

type AnalyticsClientOptions = {
  log: (eventName: string, params?: AnalyticsParams) => Promise<void> | void;
  logException?: (description: string, fatal: boolean) => Promise<void> | void;
};

export const createAnalyticsClient = ({
  log,
  logException,
}: AnalyticsClientOptions) => ({
  logSignUp: () => log("sign_up", { method: "email" }),
  logLogin: () => log("login", { method: "email" }),
  logSignOut: () => log("app_sign_out"),
  logDeleteAccount: () => log("app_delete_account"),
  logPasswordResetEmailSent: () => log("app_password_reset_email_sent"),
  logEmailChangeRequested: () => log("app_email_change_requested"),
  logTaskListCreate: () => log("app_task_list_create"),
  logTaskListDelete: () => log("app_task_list_delete"),
  logTaskListReorder: () => log("app_task_list_reorder"),
  logTaskAdd: (params: { has_date: boolean }) => log("app_task_add", params),
  logTaskUpdate: (params: { fields: string }) => log("app_task_update", params),
  logTaskDelete: () => log("app_task_delete"),
  logTaskReorder: () => log("app_task_reorder"),
  logTaskSort: () => log("app_task_sort"),
  logTaskDeleteCompleted: (params: { count: number }) =>
    log("app_task_delete_completed", params),
  logShareCodeGenerate: () => log("app_share_code_generate"),
  logShareCodeRemove: () => log("app_share_code_remove"),
  logShareCodeJoin: () => log("app_share_code_join"),
  logShare: () =>
    log("share", { method: "share_code", content_type: "task_list" }),
  logSettingsThemeChange: (params: { theme: "system" | "light" | "dark" }) =>
    log("app_settings_theme_change", params),
  logSettingsLanguageChange: (params: { language: string }) =>
    log("app_settings_language_change", params),
  logSettingsTaskInsertPositionChange: (params: {
    position: "top" | "bottom";
  }) => log("app_settings_task_insert_position_change", params),
  logSettingsAutoSortChange: (params: { enabled: boolean }) =>
    log("app_settings_auto_sort_change", params),
  logException: (description: string, fatal: boolean) => {
    if (logException) {
      return logException(description, fatal);
    }

    return log("app_exception", { description, fatal });
  },
});
