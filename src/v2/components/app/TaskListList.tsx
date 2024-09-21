import { useState } from "react";

import { useApp } from "v2/hooks/app/useApp";
import { useTaskLists } from "v2/hooks/app/useTaskLists";
import { useCustomTranslation } from "v2/common/i18n";
import { Icon } from "v2/components/primitives/Icon";

export function TaskListList(props: { disabled?: boolean }) {
  const { t } = useCustomTranslation("components.TaskListList");

  const [taskListName, setTaskListName] = useState("");
  const [{ data: app }] = useApp();
  const [{ data: taskLists }, { appendTaskList, deleteTaskList }] =
    useTaskLists(app?.taskListIds || []);

  const onTaskListFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (taskListName === "") {
      return;
    }
    appendTaskList({ name: taskListName });
    setTaskListName("");
    /* TODO: Close drawer and scroll to new task */
  };

  return (
    <div>
      <header className="sticky top-0 z-20 w-full">
        <section className="px-1">
          <form
            className="flex items-center py-2"
            onSubmit={onTaskListFormSubmit}
          >
            <div className="flex-1 pl-2">
              <input
                disabled={props.disabled}
                className="w-full rounded-full border px-4 py-2 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-800"
                type="text"
                value={taskListName}
                placeholder={t("Add task list to bottom")}
                onChange={(e) => setTaskListName(e.currentTarget.value)}
              />
            </div>
            <button
              disabled={props.disabled}
              className="flex rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              type="submit"
            >
              <Icon text="send" />
            </button>
          </form>
        </section>
      </header>

      {taskLists.map((taskList) => {
        return (
          <div className="w-full flex-1" key={taskList.id}>
            <span>{taskList.name}</span>
            <button
              onClick={() => {
                deleteTaskList(taskList.id);
              }}
            >
              [x]
            </button>
          </div>
        );
      })}
    </div>
  );
}
