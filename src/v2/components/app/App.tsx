import { useEffect, useState } from "react";
import Head from "next/head";
import qs from "query-string";

import {
  DrawerLayout,
  Drawer,
  Main,
  useDrawerLayout,
} from "v2/components/primitives/DrawerLayout";
import { TaskList } from "v2/components/app/TaskList";
import { TaskListList } from "v2/components/app/TaskListList";
import { useApp } from "v2/hooks/app/useApp";
import { usePreferences } from "v2/hooks/app/usePreferences";
import { useTheme } from "v2/hooks/ui/useTheme";
import { useActiveStatus } from "v2/hooks/composites/useActiveStatus";
import { Icon } from "v2/components/primitives/Icon";
import { useAppPageStack, AppPageLink } from "v2/hooks/ui/useAppNavigation";
import { UserSheet } from "v2/components/app/UserSheet";
import { DatePickerSheet } from "v2/components/app/DatePickerSheet";
import { PreferencesSheet } from "v2/components/app/PreferencesSheet";
import { useProfile } from "v2/hooks/app/useProfile";
import { useCustomTranslation } from "v2/common/i18n";
import {
  Carousel,
  CarouselList,
  CarouselItem,
  CarouselIndicator,
} from "v2/components/primitives/Carousel";

function AppDrawer() {
  const { pop } = useAppPageStack();
  const { isNarrowLayout } = useDrawerLayout();
  const { t } = useCustomTranslation("components.App");

  const [{ data: profile }] = useProfile();

  return (
    <Drawer>
      {isNarrowLayout && (
        <div className="flex">
          <div className="p-1">
            <button
              className="rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              onClick={pop}
            >
              <Icon text="close" />
            </button>
          </div>
          <div className="flex-1" />
        </div>
      )}

      <div className="p-2">
        <AppPageLink
          data-trigger="user"
          className="flex w-full items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
          params={{ sheet: "user", trigger: "user" }}
          mergeParams
        >
          <Icon text="person" />
          <div className="flex-1 pl-2 text-left">
            {profile?.displayName || profile?.email || t("Log in")}
          </div>
        </AppPageLink>

        <AppPageLink
          data-trigger="preferences"
          className="flex w-full items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
          params={{ sheet: "preferences", trigger: "preferences" }}
          mergeParams
        >
          <Icon text="settings" />
          <div className="flex-1 pl-2 text-left">{t("Preferences")}</div>
        </AppPageLink>
      </div>

      <TaskListList />
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

function AppMain() {
  const [{ data: app }] = useApp();
  const { isNarrowLayout } = useDrawerLayout();
  const { replaceWithParams } = useAppPageStack();
  const [index, setIndex] = useState(getTaskListIdIndex(app.taskListIds));

  useEffect(() => {
    setIndex(getTaskListIdIndex(app.taskListIds));
  }, [window.location.search, app]);

  return (
    <Main>
      <header className="flex p-1">
        {isNarrowLayout ? (
          <>
            <AppPageLink
              className="flex items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              params={{ drawer: "opened" }}
              mergeParams
            >
              <Icon text="menu" />
            </AppPageLink>

            <div className="flex-1" />
          </>
        ) : null}
      </header>

      <Carousel
        index={index}
        onIndexChange={(idx) => {
          const taskListId = app.taskListIds[idx];
          replaceWithParams(window.location.pathname, {
            params: { taskListId },
          });
        }}
      >
        <CarouselIndicator />
        <CarouselList>
          {app.taskListIds.map((taskListId) => {
            return (
              <CarouselItem key={taskListId}>
                <TaskList taskListId={taskListId} />
              </CarouselItem>
            );
          })}
        </CarouselList>
      </Carousel>
    </Main>
  );
}

export function App() {
  useActiveStatus();

  const [{ data: app }] = useApp();
  const [{ data: preferences }] = usePreferences();
  const { isDarkTheme } = useTheme(preferences.theme);

  return (
    <>
      <Head>
        <meta
          name="theme-color"
          content={isDarkTheme ? "rgb(31, 41, 55)" : "rgb(255, 255, 255)"}
        />
        <link rel="manifest" href="/manifest.json" />
        <title>{app.online ? "🔥" : "🤘"} Lightlist</title>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </Head>

      <DrawerLayout>
        <AppDrawer />
        <AppMain />
      </DrawerLayout>

      <UserSheet />

      <PreferencesSheet />

      <DatePickerSheet />
    </>
  );
}
