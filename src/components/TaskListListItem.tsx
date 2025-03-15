import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";

import { Icon } from "components/primitives/Icon";
import { ConfirmDialog } from "components/primitives/ConfirmDialog";
import { NavigateLink } from "navigation/react";
import { deleteTaskList } from "mutations";
import { useGlobalState } from "globalstate/react";

export function TaskListListItem(props: {
  disabled?: boolean;
  taskList: TaskList;
}) {
  const taskList = props.taskList;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskList.id });

  const [, , mutate] = useGlobalState();

  if (props.disabled) {
    attributes["tabIndex"] = -1;
    attributes["aria-disabled"] = true;
  } else {
    attributes["tabIndex"] = 0;
    attributes["aria-disabled"] = false;
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={clsx(isDragging && "z-10")}>
      <div className="bg-secondary relative flex h-full w-full px-1">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className={clsx(
            "flex touch-none items-center justify-center rounded-sm fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          )}
        >
          <Icon text="drag_indicator" />
        </button>

        <NavigateLink
          tabIndex={props.disabled ? -1 : 0}
          className={clsx(
            "flex-1 cursor-pointer rounded-sm px-1 py-3 text-left focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          )}
          to={`/home?taskListId=${taskList.id}`}
        >
          {taskList.name}
        </NavigateLink>

        {taskList.tasks.length !== 0 ? (
          <ConfirmDialog
            title="Delete Task List"
            description="This task list has tasks. Do you want to delete it?"
            trueText="Delete"
            falseText="Cancel"
            handleSelect={(val) => {
              if (val) {
                mutate(deleteTaskList, { taskListId: taskList.id });
              }
            }}
          >
            <button
              disabled={props.disabled}
              className="flex cursor-pointer items-center justify-center rounded-sm fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            >
              <Icon text="delete" />
            </button>
          </ConfirmDialog>
        ) : (
          <button
            disabled={props.disabled}
            onClick={() => {
              mutate(deleteTaskList, { taskListId: taskList.id });
            }}
            className="flex cursor-pointer items-center justify-center rounded-sm fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
          >
            <Icon text="delete" />
          </button>
        )}
      </div>
    </div>
  );
}
