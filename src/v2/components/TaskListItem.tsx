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

import { useCustomTranslation } from "v2/libs/i18n";
import { AppPageLink } from "v2/libs/ui/navigation";
import { Icon } from "v2/libs/ui/components/Icon";
import { useTaskLists } from "v2/hooks/useTaskLists";

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
        "bg relative flex-1 py-2",
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

  const { t } = useCustomTranslation("components.TaskItem");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  attributes["tabIndex"] = props.disabled ? -1 : 0;
  attributes["aria-disabled"] = props.disabled;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "",
  };

  const [, { updateTask }] = useTaskLists();

  return (
    <div
      style={style}
      ref={setNodeRef}
      className={clsx(
        "border-b",
        isDragging && "z-10 shadow",
        task.completed && "opacity-55",
      )}
    >
      <div className="bg relative flex h-full w-full py-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={clsx(
            "flex touch-none items-center justify-center rounded fill-gray-400 p-2 px-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          )}
        >
          <Icon text="drag_indicator" />
        </button>

        <span className="flex items-center p-1">
          <Checkbox
            disabled={props.disabled}
            className="group flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            checked={task.completed}
            onCheckedChange={(v: boolean) => {
              updateTask(props.taskListId, {
                ...props.task,
                completed: v,
              });
            }}
          >
            <CheckboxIndicator className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 group-focus-visible:bg-gray-200 dark:group-focus-visible:bg-gray-700">
              <CheckIcon />
            </CheckboxIndicator>
          </Checkbox>
        </span>

        <TaskTextArea
          disabled={props.disabled}
          task={task}
          onTaskTextChange={(e) => {
            updateTask(props.taskListId, {
              ...props.task,
              text: e.currentTarget.value,
            });
          }}
        />

        <AppPageLink
          data-trigger={`datepicker-${task.id}`}
          tabIndex={props.disabled ? -1 : 0}
          className="flex cursor-pointer items-center justify-center rounded px-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
          params={{
            sheet: "datepicker",
            taskid: task.id,
            trigger: `datepicker-${task.id}`,
          }}
          mergeParams
          onKeyDown={(e) => {
            const key = e.key;
            if (key === "Backspace" || key === "Delete") {
              e.preventDefault();
              updateTask(props.taskListId, {
                ...props.task,
                date: undefined,
              });
            }
          }}
        >
          {task.date ? (
            <div className="inline px-1 text-right text-gray-400">
              <div className="w-full font-bold leading-none">
                {format(task.date, "MM/dd")}
              </div>
              <div className="w-full text-xs leading-none">
                {t(format(task.date, "EEE"))}
              </div>
            </div>
          ) : (
            <span className="fill-gray-400 p-1">
              <Icon text="event" />
            </span>
          )}
        </AppPageLink>
      </div>
    </div>
  );
}
