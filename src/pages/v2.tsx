import { useRef, useEffect } from "react";
import qs from "query-string";

import { GlobalStateProvider } from "v2/globalState";
import { TaskListList } from "v2/components/TaskListList";
import { TaskList } from "v2/components/TaskList";
import { useApp } from "v2/hooks";

const appPath = "/v2";

function useAppPageStack() {
  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (query.sheet) {
        const tmp = window.location.href;
        window.history.replaceState({}, "", appPath);
        window.history.pushState({}, "", tmp);
      }
    }
    isInitialRender.current = false;
  }, []);
}

function AppV2Content() {
  useAppPageStack();

  const [{ data: app }] = useApp();

  return (
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
  );
}

export default function AppV2Page() {
  return (
    <GlobalStateProvider>
      <AppV2Content />
    </GlobalStateProvider>
  );
}
