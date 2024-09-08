import { useState } from "react";

import { useApp } from "v2/app/hooks/useApp";
import { useTaskLists } from "v2/app/hooks/useTaskLists";

export function TaskListList() {
  const [taskListName, setTaskListName] = useState("");
  const [{ data: app }] = useApp();
  const [{ data: taskLists }, { appendTaskList, deleteTaskList }] =
    useTaskLists(app?.taskListIds || []);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (taskListName) {
            appendTaskList({ name: taskListName });
            setTaskListName("");
          }
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
            <span>{taskList.name}</span>
            <button
              onClick={() => {
                deleteTaskList(taskList.id);
              }}
            >
              [x]
            </button>
          </div>
        );
      })}
    </div>
  );
}
