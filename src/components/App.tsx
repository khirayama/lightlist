import { useEffect, useState } from "react";
import Head from "next/head";
import qs from "query-string";

import { useTheme } from "v2/libs/ui/theme";
import { useCustomTranslation } from "v2/libs/i18n";
import {
  DrawerLayout,
  Drawer,
  Main,
  useDrawerLayout,
} from "v2/libs/ui/components/DrawerLayout";
import {
  Carousel,
  CarouselList,
  CarouselItem,
  CarouselIndicator,
} from "v2/libs/ui/components/Carousel";
import { AppPageLink } from "v2/libs/ui/navigation";
import { Icon } from "v2/libs/ui/components/Icon";
import { TaskList } from "components/TaskList";
import { TaskListList } from "components/TaskListList";
import { UserSheet } from "components/UserSheet";
import { SharingSheet } from "components/SharingSheet";
import { DatePickerSheet } from "components/DatePickerSheet";
import { PreferencesSheet } from "components/PreferencesSheet";

function AppDrawer({ profile }) {
  const { isNarrowLayout } = useDrawerLayout();
  const { t } = useCustomTranslation("components.App");

  return (
    <Drawer>
      {isNarrowLayout && (
        <div className="flex">
          <div className="p-1">
            <button
              className="rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              onClick={() => pop()}
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
          className="flex w-full items-center justify-center rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
          className="flex w-full items-center justify-center rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
          params={{ sheet: "preferences", trigger: "preferences" }}
          mergeParams
        >
          <Icon text="settings" />
          <div className="flex-1 pl-2 text-left">{t("Preferences")}</div>
        </AppPageLink>
      </div>

      <TaskListList taskLists={[]} />
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

function AppMain({ app, taskLists }) {
  const { isNarrowLayout } = useDrawerLayout();
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
              className="flex items-center justify-center rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
            const taskList = taskLists[taskListId];
            return (
              <CarouselItem key={taskList.id}>
                <TaskList taskList={taskList} app={app} />
              </CarouselItem>
            );
          })}
        </CarouselList>
      </Carousel>
    </Main>
  );
}

export function App({ app, preferences, profile, taskLists, auth }) {
  const { isDarkTheme } = useTheme(preferences.theme);
  console.log(app, preferences, profile, taskLists, auth);

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

      <DrawerLayout>
        <AppDrawer profile={profile} />
        <AppMain app={app} taskLists={taskLists} />
      </DrawerLayout>

      <UserSheet app={app} profile={profile} auth={auth} />

      <PreferencesSheet preferences={preferences} />

      <SharingSheet taskLists={taskLists} />

      <DatePickerSheet
        taskLists={taskLists}
        handleChange={() => {}}
        handleCancel={() => {}}
      />
    </>
  );
}
