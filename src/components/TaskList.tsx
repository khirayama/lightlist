import { useState, FormEvent, KeyboardEvent } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { TaskListItem } from "v2/components/TaskListItem";
import { kmh } from "v2/libs/keymap";

export function TaskList(props: {
  disabled?: boolean;
  app: AppV2;
  taskList: TaskListV2;
}) {
  const app = props.app;
  const taskList = props.taskList;

  const { t } = useCustomTranslation("components.TaskList");

  const [taskText, setTaskText] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isInsertTop = app.taskInsertPosition === "TOP";

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

  const onTaskFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (taskText === "") {
      return;
    }
    if (isInsertTop) {
      prependTask(props.taskList.id, { text: taskText });
    } else {
      appendTask(props.taskList.id, { text: taskText });
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
    const { active, over } = e;

    if (active && over && active.id !== over.id) {
      const oldIndex = taskList.tasks.findIndex((t) => t.id === active.id);
      const newIndex = taskList.tasks.findIndex((t) => t.id === over.id);
      moveTask(taskList.id, oldIndex, newIndex);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el: {
      target: HTMLElement;
      currentTarget: HTMLElement;
      taskListName: HTMLElement;
      newTaskText: HTMLElement;
      taskTexts: NodeListOf<HTMLElement>;
    } = {
      target: e.target as HTMLElement,
      currentTarget: e.currentTarget as HTMLElement,
      taskListName: document.querySelector(
        `[data-tasklistname="${taskList.id}"]`,
      ),
      newTaskText: document.querySelector(
        `[data-tasklist="${taskList.id}"] [data-tasktext="new"]`,
      ),
      taskTexts: document.querySelectorAll<HTMLElement>(
        `[data-tasklist="${taskList.id}"] [data-tasktext]:not([data-tasktext="new"])`,
      ),
    };
    const taskId = el.target.dataset.tasktext;
    const task = taskList.tasks.find((t) => t.id === taskId);
    const isTaskText = !!taskId;
    const isNewTaskText = taskId === "new";
    const focusOrder = [
      el.taskListName,
      el.newTaskText,
      ...Array.from(el.taskTexts),
    ];
    const idx = focusOrder.findIndex((x) => x === el.target);
    /* Keymap
     * On Task List Text
     * Escape: blur task text
     * Ctrl-Enter: sort tasks
     * Ctrl-Delete: clear completed tasks
     * ArrowDown: focus next
     * ArrowUp: focus prev
     *
     * On Task Item Text
     * Enter: blur task text
     * ?Mod-Enter: toggle task completed
     * ?Mod-Delete: delete task
     * ?Delete: delete task
     */
    kmh("Escape", e.nativeEvent, () => el.target.blur());
    kmh("Ctrl-Enter", e.nativeEvent, () => sortTasks(taskList.id));
    kmh("Ctrl-Delete", e.nativeEvent, () => clearCompletedTasks(taskList.id));
    kmh("ArrowDown", e.nativeEvent, () =>
      focusOrder[(idx + 1) % focusOrder.length].focus(),
    );
    kmh("ArrowUp", e.nativeEvent, () =>
      focusOrder[idx === 0 ? focusOrder.length - 1 : idx - 1].focus(),
    );

    kmh(
      "Enter",
      e.nativeEvent,
      () => {
        e.preventDefault();
        el.target.blur();
      },
      () => isTaskText && !isNewTaskText,
    );
  };

  return (
    <div
      data-tasklist={taskList.id}
      className="bg-primary h-full overflow-scroll"
      onKeyDown={onKeyDown}
    >
      <header className="bg-primary sticky top-0 z-20 m-auto w-full max-w-3xl border-b">
        <section className="px-1">
          <div className="flex pl-8">
            <h1 className="flex-1 font-bold">
              <input
                data-tasklistname={taskList.id}
                disabled={props.disabled}
                className="inline-block w-full rounded-sm py-1 text-center focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                placeholder={t("Task list name")}
                value={taskList.name}
                onChange={onTaskListNameChange}
              />
            </h1>
            <AppPageLink
              data-trigger={`sharing-${taskList.id}`}
              tabIndex={props.disabled ? -1 : 0}
              className="rounded-sm p-1 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
              className="flex rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
                data-tasktext="new"
                disabled={props.disabled}
                className="flex-1 rounded-full border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                value={taskText}
                placeholder={
                  isInsertTop ? t("Add task to top") : t("Add task to bottom")
                }
                onChange={onTaskTextChange}
              />
              <button
                disabled={props.disabled}
                className="flex rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
            className="flex rounded-sm p-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
            onClick={onSortTasksButtonClick}
          >
            <Icon text="sort" />
            <span className="pl-1">{t("Sort")}</span>
          </button>

          <div className="inline-block flex-1"></div>

          <button
            disabled={props.disabled}
            className="flex rounded-sm p-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
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
                  disabled={props.disable}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
