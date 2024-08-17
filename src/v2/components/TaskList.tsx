import { useState } from "react";

import { useTaskLists } from "v2/hooks";

function TaskListItem(props: { taskListId: string; task: TaskV2 }) {
  const [, { updateTask }] = useTaskLists();

  return (
    <div>
      <input
        className="h-[20px] w-[20px] bg-gray-400 checked:bg-blue-400"
        type="checkbox"
        checked={props.task.completed}
        onChange={(e) => {
          updateTask(props.taskListId, {
            ...props.task,
            completed: e.currentTarget.checked,
          });
        }}
      />
      <input
        type="text"
        value={props.task.text}
        onChange={(e) => {
          updateTask(props.taskListId, {
            ...props.task,
            text: e.currentTarget.value,
          });
        }}
      />
      <input
        type="date"
        value={props.task.date || ""}
        onChange={(e) => {
          updateTask(props.taskListId, {
            ...props.task,
            date: e.currentTarget.value,
          });
        }}
      />
    </div>
  );
}

export function TaskList(props: { taskListId: string }) {
  const [taskText, setTaskText] = useState("");
  const [{ data: taskLists }, { appendTask, updateTaskList }] = useTaskLists([
    props.taskListId,
  ]);
  const taskList = taskLists.find((tl) => tl.id === props.taskListId);

  return (
    taskList && (
      <div>
        <div>
          <input
            type="text"
            value={taskList.name}
            onChange={(e) => {
              updateTaskList({ ...taskList, name: e.currentTarget.value });
            }}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              appendTask(props.taskListId, { text: taskText });
              setTaskText("");
            }}
          >
            <input
              className="border"
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.currentTarget.value)}
            />
            <button>タスクを作成</button>
          </form>
        </div>
        <div>並び替え</div>
        <div>
          {taskList.tasks.map((task) => {
            return (
              <TaskListItem
                key={task.id}
                task={task}
                taskListId={taskList.id}
              />
            );
          })}
        </div>
      </div>
    )
  );
}
