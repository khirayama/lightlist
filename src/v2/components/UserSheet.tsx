import { useState } from "react";
import qs from "query-string";

import { useCustomTranslation } from "v2/libs/i18n";
import { useAppPageStack } from "v2/libs/ui/navigation";
import { ParamsSheet } from "v2/libs/ui/components/ParamsSheet";
import { ConfirmDialog } from "v2/libs/ui/components/ConfirmDialog";
import { useAuth } from "v2/common/auth";
import { useProfile } from "v2/hooks/useProfile";
import { useApp } from "v2/hooks/useApp";
import { useTaskLists } from "v2/hooks/useTaskLists";

export function UserSheet() {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "user";
  };

  const [{ data: app }] = useApp();
  const [{ data: profile }, { updateProfile }] = useProfile();
  const [, { deleteTaskList }] = useTaskLists();
  const [{ session }, { deleteUser, updateUser, signOut }] = useAuth();
  const { push } = useAppPageStack();

  const { t } = useCustomTranslation("components.UserSheet");
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");

  return (
    <ParamsSheet isSheetOpen={isSheetOpen} title={t("Log In")}>
      <div>
        <div className="flex p-4">
          <div className="flex-1 pr-4">
            <input
              className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
              type="text"
              placeholder={t("New display name")}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
              }}
            />
          </div>
          <button
            className="rounded-sm border bg-gray-100 p-2 px-4 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            onClick={() => {
              updateProfile({ displayName });
            }}
          >
            {t("Change display name")}
          </button>
        </div>

        <div className="flex p-4">
          <div className="flex-1 pr-4">
            <input
              className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
              type="email"
              placeholder={t("New email")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <button
            className="rounded-sm border bg-gray-100 p-2 px-4 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            onClick={() => {
              updateUser({ email });
            }}
          >
            {t("Change email")}
          </button>
        </div>

        <div className="flex p-4">
          <div className="flex-1 pr-4">
            <div className="pb-4">
              <input
                className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                type="password"
                placeholder={t("New password")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </div>
            <div>
              <input
                className="w-full rounded-sm border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                type="password"
                placeholder={t("Confirm new password")}
                value={confirmedPassword}
                onChange={(e) => {
                  setConfirmedPassword(e.target.value);
                }}
              />
            </div>
          </div>
          <div>
            <button
              className="rounded-sm border bg-gray-100 p-2 px-4 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
              disabled={!password || password !== confirmedPassword}
              onClick={() => {
                updateUser({ password });
              }}
            >
              {t("Update password")}
            </button>
          </div>
        </div>

        <div className="flex p-4">
          <button
            className="w-full rounded-sm border bg-gray-100 px-4 py-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            onClick={() => {
              signOut().then(() => {
                push("/login");
              });
            }}
          >
            {t("Log out")}
          </button>
        </div>

        <div className="flex p-4">
          <ConfirmDialog
            title="Delete Account"
            description="Are you sure you want to delete your account?"
            trueText="Delete"
            falseText="Cancel"
            handleSelect={(val) => {
              if (val) {
                Promise.all(
                  app.taskListIds.map((tlid) => {
                    deleteTaskList(tlid);
                  }),
                ).then(async () => {
                  const user = session?.user;
                  deleteUser(user.id).then(() => {
                    push("/login");
                  });
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
    </ParamsSheet>
  );
}
