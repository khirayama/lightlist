import { useRef, useEffect } from "react";
import qs from "query-string";
import Head from "next/head";

import { TaskList } from "v2/components/TaskList";
import { TaskListList } from "v2/components/TaskListList";
import { useApp } from "v2/hooks";

function useAppPageStack() {
  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (query.sheet) {
        const tmp = window.location.href;
        window.history.replaceState({}, "", window.location.pathname);
        window.history.pushState({}, "", tmp);
      }
    }
    isInitialRender.current = false;
  }, []);
}

export function App() {
  useAppPageStack();

  const [{ data: app }] = useApp();

  const isDarkTheme = false;
  // const isDarkTheme =
  //   preferences.theme === "DARK" ||
  //   (preferences.theme === "SYSTEM" &&
  //     window.matchMedia("(prefers-color-scheme: dark)").matches);

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
