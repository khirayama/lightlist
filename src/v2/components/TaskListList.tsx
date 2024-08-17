import { useState } from "react";

import { useApp, useTaskLists } from "v2/hooks";

export function TaskListList() {
  const [taskListName, setTaskListName] = useState("");
  const [{ data: app }, { updateApp }] = useApp();
  const [{ data: taskLists }, { createTaskList }] = useTaskLists(
    app?.taskListIds || [],
  );

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const [newTaskList] = createTaskList({ name: taskListName });
          updateApp({
            taskListIds: [...app.taskListIds, newTaskList.id],
          });
          setTaskListName("");
        }}
      >
        <input
          className="border"
          type="text"
          value={taskListName}
          onChange={(e) => setTaskListName(e.currentTarget.value)}
        />
        <button>リストを作成</button>
      </form>

      {taskLists.map((taskList) => {
        return (
          <div className="w-full flex-1" key={taskList.id}>
            <p>{taskList.name}</p>
          </div>
        );
      })}
    </div>
  );
}
