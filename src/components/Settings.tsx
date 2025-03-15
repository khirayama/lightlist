import { useState } from "react";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import { useCustomTranslation } from "ui/i18n";
import { ConfirmDialog } from "components/primitives/ConfirmDialog";
import { useGlobalState } from "globalstate/react";
import {
  updateEmail,
  updatePassword,
  deleteTaskList,
  updatePreferences,
  updateProfile,
} from "mutations";

export function Settings({ preferences, app, profile }) {
  const [, , mutate] = useGlobalState();
  const { t, supportedLanguages } = useCustomTranslation("components.Settings");
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const themes = ["SYSTEM", "LIGHT", "DARK"];
  const lang = preferences.lang.toLowerCase();

  return (
    <div className="bg-primary m-auto h-full w-full overflow-scroll p-4">
      <div className="m-auto max-w-3xl">
        <h1>設定</h1>
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">
            {t("Appearance & Language")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block">{t("Theme")}</label>
              <Select.Root
                value={preferences.theme}
                onValueChange={(v: Preferences["theme"]) => {
                  mutate(updatePreferences, {
                    preferences: { theme: v },
                  });
                }}
              >
                <Select.Trigger className="bg-button inline-flex w-full items-center rounded-sm border p-2">
                  <Select.Value aria-label={t(preferences.theme)}>
                    {t(preferences.theme)}
                  </Select.Value>
                  <Select.Icon className="pl-2">
                    <ChevronDownIcon />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-primary z-500 rounded-sm border p-2 shadow-sm">
                    <Select.Viewport>
                      {themes.map((theme) => (
                        <Select.Item
                          key={theme}
                          value={theme}
                          className="bg-button flex items-center p-2"
                        >
                          <Select.ItemText>{t(theme)}</Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div>
              <label className="mb-2 block">{t("Language")}</label>
              <Select.Root
                value={lang}
                onValueChange={(v: Preferences["lang"]) => {
                  mutate(updatePreferences, {
                    preferences: { lang: v },
                  });
                }}
              >
                <Select.Trigger className="inline-flex w-full items-center rounded-sm border p-2 focus-visible:bg-gray-200 dark:text-white dark:focus-visible:bg-gray-700">
                  <Select.Value aria-label={t(preferences.lang)}>
                    {t(preferences.lang)}
                  </Select.Value>
                  <Select.Icon className="pl-2">
                    <ChevronDownIcon />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-primary focus-visible:bg-primary z-500 rounded-sm border p-2 shadow-sm dark:focus-visible:bg-gray-700">
                    <Select.Viewport>
                      {supportedLanguages.map((ln) => (
                        <Select.Item
                          key={ln}
                          value={ln}
                          className="flex items-center p-2 focus-visible:bg-gray-200 dark:text-white dark:focus-visible:bg-gray-700"
                        >
                          <Select.ItemText>{t(ln)}</Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">{t("Profile Settings")}</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block">{t("Display Name")}</label>
              <div className="flex">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                />
                <button
                  onClick={() => {
                    mutate(updateProfile, { profile: { displayName } });
                  }}
                  className="ml-4 rounded-sm border bg-gray-100 px-4 py-2 dark:bg-gray-600"
                >
                  {t("Update")}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block">{t("Email")}</label>
              <div className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                />
                <button
                  onClick={() => {
                    mutate(updateEmail, { email });
                  }}
                  className="ml-4 rounded-sm border bg-gray-100 px-4 py-2 dark:bg-gray-600"
                >
                  {t("Update")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">{t("Change Password")}</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block">{t("Current Password")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
              />
            </div>
            <div>
              <label className="mb-2 block">{t("New Password")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
              />
            </div>
            <div>
              <label className="mb-2 block">{t("Confirm New Password")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
              />
            </div>
            <button
              onClick={() => {
                if (newPassword === confirmPassword) {
                  mutate(updatePassword, { currentPassword, newPassword });
                }
              }}
              className="rounded-sm border bg-gray-100 px-4 py-2 dark:bg-gray-600"
            >
              {t("Update Password")}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">{t("Account Settings")}</h2>
          <div className="space-y-4">
            <button
              className="w-full rounded-sm border bg-gray-100 px-4 py-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
              onClick={() => {
                // TODO: sign out by supabase
              }}
            >
              {t("Log out")}
            </button>
            <ConfirmDialog
              title="Delete Account"
              description="Are you sure you want to delete your account?"
              trueText="Delete"
              falseText="Cancel"
              handleSelect={(val) => {
                if (val) {
                  Promise.all(
                    app.taskListIds.map((tlid) => {
                      mutate(deleteTaskList, { taskListId: tlid });
                    }),
                  ).then(async () => {
                    // TODO: delete user by supabase
                  });
                }
              }}
            >
              <button className="w-full rounded-sm border bg-gray-100 px-4 py-2 text-red-400 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700">
                {t("Delete account")}
              </button>
            </ConfirmDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
