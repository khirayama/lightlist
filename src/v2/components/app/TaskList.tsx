import { useState } from "react";

import { useTaskLists } from "v2/hooks/app/useTaskLists";

function TaskListItem(props: { taskListId: string; task: TaskV2 }) {
  const [, { updateTask, deleteTask }] = useTaskLists();

  return (
    <div className="">
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
      <button
        onClick={() => {
          deleteTask(props.taskListId, props.task.id);
        }}
      >
        [x]
      </button>
    </div>
  );
}

export function TaskList(props: { taskListId: string }) {
  const [taskText, setTaskText] = useState("");
  const [{ data: taskLists }, { appendTask, updateTaskList, sortTasks }] =
    useTaskLists([props.taskListId]);
  const taskList = taskLists.find((tl) => tl.id === props.taskListId);

  return (
    <div className="bg h-full overflow-scroll">
      <header className="bg sticky top-0 z-20 w-full border-b">
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
            if (taskText) {
              appendTask(props.taskListId, { text: taskText });
              setTaskText("");
            }
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
      </header>

      <div>
        <button
          onClick={() => {
            sortTasks(taskList.id);
          }}
        >
          並び替え
        </button>
      </div>
      <div>
        {taskList.tasks.map((task) => {
          return (
            <TaskListItem key={task.id} task={task} taskListId={taskList.id} />
          );
        })}
      </div>
    </div>
  );
}
