import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";

import { useTaskLists } from "v2/hooks/app/useTaskLists";

export function TaskListItem(props: {
  taskListId: string;
  task: TaskV2;
  disabled?: boolean;
}) {
  const task = props.task;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: task.id });
  attributes["tabIndex"] = props.disabled ? -1 : 0;
  attributes["aria-disabled"] = props.disabled;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "",
  };

  const [, { updateTask, deleteTask }] = useTaskLists();

  return (
    <div
      style={style}
      className={clsx(
        "border-b",
        isDragging && "z-10 shadow",
        task.completed && "opacity-55",
      )}
    >
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
