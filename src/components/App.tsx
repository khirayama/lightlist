import Head from "next/head";

import { useTheme } from "ui/theme";
import { useCustomTranslation } from "ui/i18n";
import {
  DrawerLayout,
  Drawer,
  Main,
  useDrawerLayout,
} from "components/primitives/DrawerLayout";
import { Icon } from "components/primitives/Icon";
import { AppMain } from "components/AppMain";
import { Settings } from "components/Settings";
import { TaskListList } from "components/TaskListList";
import { SharingSheet } from "components/SharingSheet";
import { DatePickerSheet } from "components/DatePickerSheet";
import { useNavigation, NavigateLink } from "navigation/react";

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

function MainContent({ app, preferences, profile, taskLists }) {
  const { isNarrowLayout } = useDrawerLayout();
  const navigation = useNavigation();
  const attr = navigation.getAttr();

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
        <Settings preferences={preferences} profile={profile} app={app} />
      ) : (
        <AppMain app={app} taskLists={taskLists} />
      )}
    </Main>
  );
}

export function App({ app, preferences, profile, taskLists }) {
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
        <MainContent
          app={app}
          preferences={preferences}
          taskLists={taskLists}
          profile={profile}
        />
      </DrawerLayout>

      <SharingSheet open={isSharingSheetOpen} />
      <DatePickerSheet open={isDatePickerSheetOpen} />
    </>
  );
}
