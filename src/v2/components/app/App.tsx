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
import { useAppPageStack } from "v2/hooks/ui/useAppPageStack";
import { useTheme } from "v2/hooks/ui/useTheme";
import { useActiveStatus } from "v2/hooks/composites/useActiveStatus";

import { ParamsLink } from "components/ParamsLink";

export function App() {
  useAppPageStack();
  useActiveStatus();

  const da = useDrawerLayout();

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
        <Drawer {...da}>
          {da.isNarrowLayout && (
            <div>
              <button onClick={da.close}>Close</button>
            </div>
          )}
          <TaskListList />
        </Drawer>
        <Main {...da}>
          {da.isNarrowLayout && (
            <ParamsLink
              href={window.location.pathname}
              params={{ drawer: "opened" }}
            >
              Open
            </ParamsLink>
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
      </DrawerLayout>
    </>
  );
}
