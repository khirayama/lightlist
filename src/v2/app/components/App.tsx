import Head from "next/head";

import { TaskList } from "v2/app/components/TaskList";
import { TaskListList } from "v2/app/components/TaskListList";
import { useApp } from "v2/app/hooks/useApp";
import { usePreferences } from "v2/app/hooks/usePreferences";
import { useAppPageStack } from "v2/ui/hooks/useAppPageStack";
import { useTheme } from "v2/ui/hooks/useTheme";
import { useActiveStatus } from "v2/common/hooks/useActiveStatus";

export function App() {
  useAppPageStack();
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

      <div className="flex">
        <div className="border-r p-4">
          <TaskListList />
        </div>

        <div className="flex-1">
          <div className="flex">
            {app.taskListIds.map((taskListId) => {
              return (
                <div key={taskListId} className="flex-1">
                  <TaskList taskListId={taskListId} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
