import { useState, FormEvent, KeyboardEvent } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { useCustomTranslation } from "v2/libs/i18n";
import { AppPageLink } from "v2/libs/ui/navigation";
import { Icon } from "v2/libs/ui/components/Icon";
import { useTaskLists } from "v2/hooks/useTaskLists";
import { useApp } from "v2/hooks/useApp";
import { TaskListItem } from "v2/components/TaskListItem";

export function TaskList(props: {
  disabled?: boolean;
  taskListId: string;
  handleDragStart?: (e: DragStartEvent) => void;
  handleDragCancel?: (e: DragCancelEvent) => void;
  handleDragEnd?: (e: DragEndEvent) => void;
}) {
  const { t } = useCustomTranslation("components.TaskList");

  const [taskText, setTaskText] = useState("");
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [
    { data: taskLists },
    {
      appendTask,
      prependTask,
      updateTaskList,
      sortTasks,
      clearCompletedTasks,
      moveTask,
    },
  ] = useTaskLists([props.taskListId]);
  const taskList = taskLists.find((tl) => tl.id === props.taskListId);
  const [{ data: app }, { updateApp }] = useApp();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isInsertTop =
    (app.taskInsertPosition === "TOP" && !isShiftPressed) ||
    (app.taskInsertPosition === "BOTTOM" && isShiftPressed);

  const onTaskListNameChange = (e: FormEvent<HTMLInputElement>) => {
    updateTaskList({ ...taskList, name: e.currentTarget.value });
  };

  const onInsertPositionIconClick = () => {
    updateApp({
      taskInsertPosition:
        app.taskInsertPosition === "BOTTOM" ? "TOP" : "BOTTOM",
    });
  };

  const onTaskTextChange = (e: FormEvent<HTMLInputElement>) => {
    setTaskText(e.currentTarget.value);
  };

  const onTaskTextKeyDownAndKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    setIsShiftPressed(e.shiftKey);
  };

  const onTaskTextBlur = () => {
    setIsShiftPressed(false);
  };

  const onTaskFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (taskText === "") {
      return;
    }
    if (isInsertTop) {
      prependTask(props.taskListId, { text: taskText });
    } else {
      appendTask(props.taskListId, { text: taskText });
    }
    setTaskText("");
  };

  const onSortTasksButtonClick = () => {
    sortTasks(taskList.id);
  };

  const onClearCompletedTasksButtonClick = () => {
    clearCompletedTasks(taskList.id);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (props.handleDragEnd) {
      props.handleDragEnd(e);
    }
    const { active, over } = e;

    if (active && over && active.id !== over.id) {
      const oldIndex = taskList.tasks.findIndex((t) => t.id === active.id);
      const newIndex = taskList.tasks.findIndex((t) => t.id === over.id);
      moveTask(taskList.id, oldIndex, newIndex);
    }
  };

  return (
    <div className="bg h-full overflow-scroll">
      <header className="bg sticky top-0 z-20 m-auto w-full max-w-3xl border-b">
        <section className="px-1">
          <div className="flex pl-8">
            <h1 className="flex-1 font-bold">
              <input
                disabled={props.disabled}
                className="inline-block w-full rounded py-1 text-center focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                placeholder={t("Task list name")}
                value={taskList.name}
                onChange={onTaskListNameChange}
              />
            </h1>
            <AppPageLink
              data-trigger={`sharing-${taskList.id}`}
              tabIndex={props.disabled ? -1 : 0}
              className="rounded p-1 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              params={{
                sheet: "sharing",
                tasklistid: taskList.id,
                trigger: `sharing-${taskList.id}`,
              }}
              mergeParams
            >
              <Icon text="share" />
            </AppPageLink>
          </div>

          <div className="flex items-center py-2">
            <button
              disabled={props.disabled}
              className="flex rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              onClick={onInsertPositionIconClick}
            >
              {isInsertTop ? (
                <Icon text="vertical_align_top" />
              ) : (
                <Icon text="vertical_align_bottom" />
              )}
            </button>

            <form
              className="flex flex-1 items-center py-2"
              onSubmit={onTaskFormSubmit}
            >
              <input
                data-tasktext
                disabled={props.disabled}
                className="flex-1 rounded-full border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                value={taskText}
                placeholder={
                  isInsertTop ? t("Add task to top") : t("Add task to bottom")
                }
                onChange={onTaskTextChange}
                onKeyDown={onTaskTextKeyDownAndKeyUp}
                onKeyUp={onTaskTextKeyDownAndKeyUp}
                onBlur={onTaskTextBlur}
              />
              <button
                disabled={props.disabled}
                className="flex rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
                type="submit"
              >
                <Icon text="send" />
              </button>
            </form>
          </div>
        </section>
        <section className="flex fill-gray-400 p-1 pl-2 text-gray-400">
          <button
            disabled={props.disabled}
            className="flex rounded p-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            onClick={onSortTasksButtonClick}
          >
            <Icon text="sort" />
            <span className="pl-1">{t("Sort")}</span>
          </button>

          <div className="inline-block flex-1"></div>

          <button
            disabled={props.disabled}
            className="flex rounded p-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            onClick={onClearCompletedTasksButtonClick}
          >
            <span className="pr-1">{t("Clear Completed")}</span>
            <Icon text="delete" />
          </button>
        </section>
      </header>

      <div className="m-auto max-w-3xl">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={props.handleDragStart}
          onDragCancel={props.handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={taskList.tasks}
            strategy={verticalListSortingStrategy}
          >
            {taskList.tasks.map((task) => {
              return (
                <TaskListItem
                  key={task.id}
                  task={task}
                  taskListId={taskList.id}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
