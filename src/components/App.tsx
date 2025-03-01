import { useEffect, useState } from "react";
import Head from "next/head";
import qs from "query-string";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import { useTheme } from "v2/libs/ui/theme";
import { useCustomTranslation } from "v2/libs/i18n";
import {
  DrawerLayout,
  Drawer,
  Main,
  useDrawerLayout,
} from "components/primitives/DrawerLayout";
import {
  Carousel,
  CarouselList,
  CarouselItem,
  CarouselIndicator,
} from "components/primitives/Carousel";
import { Icon } from "components/primitives/Icon";
import { TaskList } from "components/TaskList";
import { TaskListList } from "components/TaskListList";
import { SharingSheet } from "components/SharingSheet";
import { DatePickerSheet } from "components/DatePickerSheet";
import { useNavigation, NavigateLink } from "navigation/react";
import { ConfirmDialog } from "components/primitives/ConfirmDialog";
import { useGlobalState } from "globalstate/react";
import { updateEmail, updatePassword, deleteTaskList } from "mutations";

function AppDrawer({ app, taskLists, profile }) {
  const { isNarrowLayout } = useDrawerLayout();
  const { t } = useCustomTranslation("components.App");
  const navigation = useNavigation();
  const tls = app.taskListIds.map((id) => taskLists[id]);

  return (
    <Drawer>
      {isNarrowLayout && (
        <div className="flex">
          <div className="p-1">
            <button
              className="rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              onClick={navigation.popToTop}
            >
              <Icon text="close" />
            </button>
          </div>
          <div className="flex-1" />
        </div>
      )}

      <div className="p-2">
        <NavigateLink
          to="/settings"
          className="flex w-full items-center justify-center rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
        >
          <Icon text="settings" />
          <div className="flex-1 pl-2 text-left">
            {profile?.displayName || profile?.email || t("Log in")}
          </div>
        </NavigateLink>
      </div>

      <TaskListList taskLists={tls} />
    </Drawer>
  );
}

function getTaskListIdIndex(taskListIds: string[]) {
  const taskListId = (qs.parse(window.location.search).taskListId ||
    "") as string;
  const taskListIndex = taskListIds.includes(taskListId)
    ? taskListIds.indexOf(taskListId)
    : 0;
  return taskListIndex;
}

function AppMain({ app, taskLists, preferences }) {
  const { isNarrowLayout } = useDrawerLayout();
  const [index, setIndex] = useState(getTaskListIdIndex(app.taskListIds));
  const navigation = useNavigation();
  const attr = navigation.getAttr();

  useEffect(() => {
    setIndex(getTaskListIdIndex(app.taskListIds));
  }, [window.location.search, app]);

  return (
    <Main>
      <header className="flex p-1">
        {isNarrowLayout ? (
          <>
            <NavigateLink
              to="/menu"
              className="flex items-center justify-center rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
            >
              <Icon text="menu" />
            </NavigateLink>

            <div className="flex-1" />
          </>
        ) : null}
      </header>
      {attr.path === "/settings" ||
      (attr.path === "/menu" && attr.referrer === "/settings") ? (
        <Settings preferences={preferences} />
      ) : (
        <Carousel
          index={index}
          onIndexChange={(idx) => {
            const taskListId = app.taskListIds[idx];
            console.log("TODO: move to task list and update URL");
          }}
        >
          <CarouselIndicator />
          <CarouselList>
            {app.taskListIds.map((taskListId) => {
              const taskList = taskLists[taskListId];
              return (
                <CarouselItem key={taskList.id}>
                  <TaskList taskList={taskList} app={app} />
                </CarouselItem>
              );
            })}
          </CarouselList>
        </Carousel>
      )}
    </Main>
  );
}

function Settings({ preferences, updatePreferences, auth, app }) {
  const [, , mutate] = useGlobalState();
  const { t, supportedLanguages } = useCustomTranslation("components.Settings");
  const [displayName, setDisplayName] = useState(preferences.displayName || "");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const themes = ["SYSTEM", "LIGHT", "DARK"];
  const lang = preferences.lang.toLowerCase();

  return (
    <div className="h-full w-full overflow-scroll p-4">
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t("Appearance & Language")}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block">{t("Theme")}</label>
            <Select.Root
              value={preferences.theme}
              onValueChange={(v: Preferences["theme"]) => {
                updatePreferences({
                  theme: v,
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
                updatePreferences({
                  lang: v,
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
                  updatePreferences({ displayName });
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
  );
}

export function App({ app, preferences, profile, taskLists, auth }) {
  const { isDarkTheme } = useTheme(preferences.theme);
  const navigation = useNavigation();
  const {
    props: { isDrawerOpen, isSharingSheetOpen, isDatePickerSheetOpen },
  } = navigation.getAttr();

  return (
    <>
      <Head>
        <meta
          name="theme-color"
          content={isDarkTheme ? "rgb(31, 41, 55)" : "rgb(255, 255, 255)"}
        />
        <link rel="manifest" href="/manifest.json" />
        <title>Lightlist</title>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="robots" content="notranslate" />
      </Head>

      <DrawerLayout isDrawerOpen={isDrawerOpen}>
        <AppDrawer app={app} taskLists={taskLists} profile={profile} />
        <AppMain app={app} taskLists={taskLists} preferences={preferences} />
      </DrawerLayout>

      <SharingSheet open={isSharingSheetOpen} />
      <DatePickerSheet open={isDatePickerSheetOpen} />
    </>
  );
}
