import { useState } from "react";
import { useRouter } from "next/router";
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
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { useDrawerLayout } from "v2/components/primitives/DrawerLayout";
import { useApp } from "v2/hooks/app/useApp";
import { useTaskLists } from "v2/hooks/app/useTaskLists";
import { useCustomTranslation } from "v2/common/i18n";
import { Icon } from "v2/components/primitives/Icon";
import { TaskListListItem } from "v2/components/app/TaskListListItem";

export function TaskListList(props: { disabled?: boolean }) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { t } = useCustomTranslation("components.TaskListList");
  const { close } = useDrawerLayout();

  const [taskListName, setTaskListName] = useState("");
  const [{ data: app }, { updateTaskListIds }] = useApp();
  const [{ data: taskLists }, { appendTaskList }] = useTaskLists(
    app?.taskListIds || [],
  );

  const onTaskListFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (taskListName === "") {
      return;
    }
    const [taskList] = appendTaskList({ name: taskListName });
    setTaskListName("");
    close();
    router.push(`${window.location.pathname}?taskListId=${taskList.id}`);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;

    if (active && over && active.id !== over.id) {
      const oldIndex = taskLists.findIndex((tl) => tl.id === active.id);
      const newIndex = taskLists.findIndex((tl) => tl.id === over.id);
      const newTaskLists = arrayMove(taskLists, oldIndex, newIndex);
      updateTaskListIds(newTaskLists.map((tl) => tl.id));
    }
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

      <section>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={taskLists}
            strategy={verticalListSortingStrategy}
          >
            {taskLists.map((taskList) => {
              return (
                <TaskListListItem
                  key={taskList.id}
                  disabled={props.disabled}
                  taskList={taskList}
                  handleTaskListLinkClick={props.handleTaskListLinkClick}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
