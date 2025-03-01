import { useState } from "react";
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

import { useCustomTranslation } from "v2/libs/i18n";
import { Icon } from "components/primitives/Icon";
import { useDrawerLayout } from "v2/libs/ui/components/DrawerLayout";
import { TaskListListItem } from "components/TaskListListItem";
import { useGlobalState } from "globalstate/react";
import { moveTaskList, appendTaskList } from "mutations";

export function TaskListList(props: {
  disabled?: boolean;
  taskLists: TaskListV2[];
}) {
  const taskLists = props.taskLists;
  const [, , mutate] = useGlobalState();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { t } = useCustomTranslation("components.TaskListList");
  const { isDrawerOpen, isNarrowLayout } = useDrawerLayout();

  const [taskListName, setTaskListName] = useState("");

  const onTaskListFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (taskListName === "") {
      return;
    }
    mutate(appendTaskList, { name: taskListName });
    setTaskListName("");
    if (isDrawerOpen && isNarrowLayout) {
      pop();
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;

    if (active && over && active.id !== over.id) {
      const oldIndex = taskLists.findIndex((tl) => tl.id === active.id);
      const newIndex = taskLists.findIndex((tl) => tl.id === over.id);
      const newTaskLists = arrayMove(taskLists, oldIndex, newIndex);
      mutate(moveTaskList, {
        taskListIds: newTaskLists.map((tl) => tl.id),
      });
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
              className="flex rounded-sm p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
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
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
