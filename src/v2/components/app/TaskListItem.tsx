import { FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import {
  Root as Checkbox,
  Indicator as CheckboxIndicator,
} from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { AppPageLink } from "v2/hooks/ui/useAppNavigation";
import { useTaskLists } from "v2/hooks/app/useTaskLists";
import { Icon } from "v2/components/primitives/Icon";

function TaskTextArea(props: {
  task: Task;
  disabled?: boolean;
  onTaskTextChange: (event: FormEvent<HTMLTextAreaElement>) => void;
}) {
  const task = props.task;

  /* FYI: Autoresize textarea */
  return (
    <div
      className={clsx(
        "relative flex-1 py-3",
        task.completed ? "text-gray-400 line-through" : "",
      )}
    >
      <div className="invisible whitespace-break-spaces px-1">
        {task.text + "\u200b"}
      </div>
      <textarea
        disabled={props.disabled}
        className={clsx(
          "absolute left-0 top-0 inline-block h-full w-full flex-1 whitespace-break-spaces rounded px-1 py-3 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          task.completed ? "text-gray-400 line-through" : "",
        )}
        value={task.text}
        onChange={props.onTaskTextChange}
      />
    </div>
  );
}

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
