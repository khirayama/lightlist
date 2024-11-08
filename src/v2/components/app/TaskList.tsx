import { useState, FormEvent, KeyboardEvent } from "react";

import { useTaskLists } from "v2/hooks/app/useTaskLists";
import { useApp } from "v2/hooks/app/useApp";
import { TaskListItem } from "v2/components/app/TaskListItem";
import { Icon } from "v2/components/primitives/Icon";
import { AppPageLink } from "v2/hooks/ui/useAppNavigation";
import { useCustomTranslation } from "v2/common/i18n";

export function TaskList(props: { disabled?: boolean; taskListId: string }) {
  const { t } = useCustomTranslation("components.TaskList");

  const [taskText, setTaskText] = useState("");
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [
    { data: taskLists },
    { appendTask, prependTask, updateTaskList, sortTasks, clearCompletedTasks },
  ] = useTaskLists([props.taskListId]);
  const taskList = taskLists.find((tl) => tl.id === props.taskListId);
  const [{ data: app }, { updateApp }] = useApp();

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

  return (
    <div className="bg h-full overflow-scroll">
      <header className="bg sticky top-0 z-20 w-full border-b">
        <section className="px-1">
          <div className="flex pl-8">
            <h1 className="flex-1 text-center font-bold">
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
              href="/app"
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
