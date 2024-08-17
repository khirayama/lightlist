import { GlobalStateProvider } from "v2/globalState";
import { TaskListList } from "v2/components/TaskListList";
import { TaskList } from "v2/components/TaskList";

import { useApp } from "v2/hooks";

function AppV2Content() {
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
              <div className="flex-1" key={taskListId}>
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
