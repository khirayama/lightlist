import { useState } from "react";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import { useCustomTranslation } from "ui/i18n";
import { ConfirmDialog } from "components/primitives/ConfirmDialog";
import {
  FormField,
  SubmitButton,
  ErrorMessage,
  validatePassword,
  validatePasswordConfirmation,
} from "components/AuthComponents";
import { useGlobalState } from "globalstate/react";
import { updateEmail, updatePreferences, updateProfile } from "mutations";
import { signOut, updatePassword, deleteUser } from "services";

export function Settings({ preferences, profile }) {
  const { t, supportedLanguages } = useCustomTranslation("components.Settings");

  const [, , mutate] = useGlobalState();
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const themes = ["SYSTEM", "LIGHT", "DARK"];
  const lang = preferences.lang.toUpperCase();

  return (
    <div className="bg-primary m-auto h-full w-full overflow-scroll p-4">
      <div className="m-auto max-w-3xl">
        <h1>{t("Settings")}</h1>
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
                      {supportedLanguages.map((ln: string) => (
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoSort"
                checked={preferences.autoSort}
                onChange={(e) => {
                  mutate(updatePreferences, {
                    preferences: { autoSort: e.target.checked },
                  });
                }}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoSort" className="block">
                {t("Automatically sort tasks by date")}
              </label>
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
                  placeholder={t("Enter email")}
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
          <ErrorMessage message={passwordError} />
          {passwordSuccess && (
            <div className="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
              {passwordSuccess}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError(null);
              setPasswordSuccess(null);

              const currentPasswordValidation =
                validatePassword(currentPassword);
              if (!currentPasswordValidation.isValid) {
                setPasswordError(
                  t(
                    currentPasswordValidation.error ||
                      "Invalid current password",
                  ),
                );
                return;
              }

              const newPasswordValidation = validatePassword(newPassword);
              if (!newPasswordValidation.isValid) {
                setPasswordError(
                  t(newPasswordValidation.error || "Invalid new password"),
                );
                return;
              }

              const confirmationValidation = validatePasswordConfirmation(
                newPassword,
                confirmPassword,
              );
              if (!confirmationValidation.isValid) {
                setPasswordError(
                  t(confirmationValidation.error || "Passwords do not match"),
                );
                return;
              }

              setIsUpdatingPassword(true);
              try {
                const result = await updatePassword(newPassword);
                if (result) {
                  setPasswordSuccess(t("Password updated successfully"));
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                } else {
                  setPasswordError(
                    result.error || t("Failed to update password"),
                  );
                }
              } catch (error: any) {
                // Catch any unexpected errors during the service call
                setPasswordError(
                  error.message || t("An unexpected error occurred"),
                );
              } finally {
                setIsUpdatingPassword(false);
              }
            }}
            className="space-y-4"
          >
            <FormField
              label={t("Current Password")}
              type="password"
              placeholder={t("Enter current password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              disabled={isUpdatingPassword}
            />
            <FormField
              label={t("New Password")}
              type="password"
              placeholder={t("Enter new password")}
              value={newPassword}
              onChange={setNewPassword}
              required
              disabled={isUpdatingPassword}
            />
            <FormField
              label={t("Confirm New Password")}
              type="password"
              placeholder={t("Confirm new password")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              disabled={isUpdatingPassword}
            />
            <SubmitButton
              text={t("Update Password")}
              loadingText={t("Updating...")}
              isLoading={isUpdatingPassword}
            />
          </form>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">{t("Account Settings")}</h2>
          <div className="space-y-4">
            <button
              className="w-full rounded-sm border bg-gray-100 px-4 py-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
              onClick={() => {
                signOut().then(() => (window.location.href = "/login"));
              }}
            >
              {t("Log Out")}
            </button>
            <ConfirmDialog
              title="Delete Account"
              description="Are you sure you want to delete your account?"
              trueText="Delete"
              falseText="Cancel"
              handleSelect={async (val) => {
                if (val) {
                  try {
                    const result = await deleteUser();
                    if (result) {
                      window.location.href = "/login";
                    } else {
                      alert(t("Failed to delete account. Please try again."));
                    }
                  } catch (error) {
                    alert(
                      t(
                        "An unexpected error occurred while deleting the account.",
                      ),
                    );
                  }
                }
              }}
            >
              <button className="w-full rounded-sm border bg-gray-100 px-4 py-2 text-red-400 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700">
                {t("Delete Account")}
              </button>
            </ConfirmDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
