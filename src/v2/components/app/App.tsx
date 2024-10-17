import Head from "next/head";

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

function AppDrawer() {
  const { pop } = useAppPageStack();
  const { isNarrowLayout } = useDrawerLayout();

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
          <div className="flex-1 pl-2 text-left">Log in</div>
        </AppPageLink>

        <AppPageLink
          data-trigger="settings"
          className="flex w-full items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
          params={{ sheet: "settings", trigger: "settings" }}
          mergeParams
        >
          <Icon text="settings" />
          <div className="flex-1 pl-2 text-left">Preferences</div>
        </AppPageLink>
      </div>

      <TaskListList />
    </Drawer>
  );
}

function AppMain() {
  const [{ data: app }] = useApp();
  const { isNarrowLayout } = useDrawerLayout();

  return (
    <Main>
      {isNarrowLayout && (
        <AppPageLink params={{ drawer: "opened" }}>Open</AppPageLink>
      )}
      <div className="flex">
        {app.taskListIds.map((taskListId) => {
          return (
            <div key={taskListId} className="flex-1">
              <TaskList taskListId={taskListId} />
            </div>
          );
        })}
      </div>
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
      </Head>

      <DrawerLayout>
        <AppDrawer />
        <AppMain />
      </DrawerLayout>
    </>
  );
}
