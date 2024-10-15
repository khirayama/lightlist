import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";

import { Icon } from "v2/components/primitives/Icon";
import { ConfirmDialog } from "components/ConfirmDialog";
import { useTaskLists } from "v2/hooks/app/useTaskLists";
import { AppPageLink } from "v2/hooks/ui/useAppNavigation";

export function TaskListListItem(props: {
  disabled?: boolean;
  taskList: TaskListV2;
}) {
  const taskList = props.taskList;
  const [, { deleteTaskList }] = useTaskLists();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskList.id });

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
      <div className="bg relative flex h-full w-full px-1">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className={clsx(
            "flex touch-none items-center justify-center rounded fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          )}
        >
          <Icon text="drag_indicator" />
        </button>

        <AppPageLink
          replace
          tabIndex={props.disabled ? -1 : 0}
          className={clsx(
            "flex-1 cursor-pointer rounded px-1 py-3 text-left focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700",
          )}
          href={window.location.pathname}
          params={{ taskListId: taskList.id }}
        >
          {taskList.name}
        </AppPageLink>

        {taskList.tasks.length !== 0 ? (
          <ConfirmDialog
            title="Delete Task List"
            description="This task list has tasks. Do you want to delete it?"
            trueText="Delete"
            falseText="Cancel"
            handleSelect={(val) => {
              if (val) {
                deleteTaskList(taskList.id);
              }
            }}
          >
            <button
              disabled={props.disabled}
              className="flex cursor-pointer items-center justify-center rounded fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            >
              <Icon text="delete" />
            </button>
          </ConfirmDialog>
        ) : (
          <button
            disabled={props.disabled}
            onClick={() => {
              deleteTaskList(taskList.id);
            }}
            className="flex cursor-pointer items-center justify-center rounded fill-gray-400 p-1 text-gray-400 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
          >
            <Icon text="delete" />
          </button>
        )}
      </div>
    </div>
  );
}
