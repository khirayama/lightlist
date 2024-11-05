import { useTaskLists } from "v2/hooks/app/useTaskLists";

export function TaskListItem(props: { taskListId: string; task: TaskV2 }) {
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
