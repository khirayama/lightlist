import { useState, FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import {
  Root as Checkbox,
  Indicator as CheckboxIndicator,
} from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { useCustomTranslation } from "ui/i18n";
import { Icon } from "components/primitives/Icon";
import { updateTask } from "mutations";
import { useGlobalState } from "globalstate/react";
import { NavigateLink } from "navigation/react";

function TaskTextArea(props: {
  task: Task;
  value: string;
  disabled?: boolean;
  onTaskTextChange: (event: FormEvent<HTMLTextAreaElement>) => void;
  onTaskTextBlur: (event: FormEvent<HTMLTextAreaElement>) => void;
}) {
  const task = props.task;

  /* FYI: Autoresize textarea */
  return (
    <div
      className={clsx(
        "bg-primary relative flex-1 overflow-hidden py-2",
        task.completed ? "text-gray-400 line-through" : "",
      )}
    >
      <div className="invisible px-1 whitespace-break-spaces">
        {props.value + "\u200b"}
      </div>
      <textarea
        data-tasktext={task.id}
        disabled={props.disabled}
        className={clsx(
          "absolute top-0 left-0 inline-block h-full w-full flex-1 overflow-hidden rounded-sm px-1 py-3 whitespace-break-spaces focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          task.completed ? "text-gray-400 line-through" : "",
        )}
        value={props.value}
        onChange={props.onTaskTextChange}
        onBlur={props.onTaskTextBlur}
      />
    </div>
  );
}

export function TaskListItem(props: {
  taskListId: string;
  task: Task;
  disabled?: boolean;
}) {
  const task = props.task;
  const [text, setText] = useState(task.text);

  const { t } = useCustomTranslation("components.TaskItem");
  const [, , mutate] = useGlobalState();
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

  return (
    <div
      data-task={task.id}
      style={style}
      ref={setNodeRef}
      className={clsx(
        "border-b",
        isDragging && "z-10 shadow-sm",
        task.completed && "opacity-55",
      )}
    >
      <div className="bg-primary relative flex h-full w-full py-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={clsx(
            "flex touch-none items-center justify-center rounded-sm fill-gray-400 p-2 px-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
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
              mutate(updateTask, {
                taskListId: props.taskListId,
                task: {
                  ...props.task,
                  completed: v,
                },
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
          value={text}
          onTaskTextChange={(e) => {
            setText(e.currentTarget.value);
          }}
          onTaskTextBlur={() => {
            mutate(updateTask, {
              taskListId: props.taskListId,
              task: {
                ...props.task,
                text: text,
              },
            });
          }}
        />

        <NavigateLink
          tabIndex={props.disabled ? -1 : 0}
          className="flex cursor-pointer items-center justify-center rounded-sm px-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
          to={`/task-lists/${props.taskListId}/tasks/${task.id}/date`}
          onKeyDown={(e) => {
            const key = e.key;
            if (key === "Backspace" || key === "Delete") {
              e.preventDefault();
              mutate(updateTask, {
                taskListId: props.taskListId,
                task: {
                  ...props.task,
                  date: undefined,
                },
              });
            }
          }}
        >
          {task.date ? (
            <div className="inline px-1 text-right text-gray-400">
              <div className="w-full leading-none font-bold">
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
        </NavigateLink>
      </div>
    </div>
  );
}
