import type { TFunction } from "i18next";
import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import type { TaskList } from "@lightlist/sdk/types";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext } from "@dnd-kit/sortable";
import clsx from "clsx";

import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/Drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { SortableTaskListItem } from "./_SortableTaskListItem";

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  showCreateListDialog: boolean;
  onCreateListDialogChange: (open: boolean) => void;
  createListInput: string;
  onCreateListInputChange: (value: string) => void;
  createListBackground: string;
  onCreateListBackgroundChange: (color: string) => void;
  colors: string[];
  onCreateList: () => void | Promise<void>;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  sensorsList: SensorDescriptor<SensorOptions>[];
  onDragEndTaskList: (event: DragEndEvent) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  t: TFunction;
};

export function DrawerPanel({
  isWideLayout,
  userEmail,
  showCreateListDialog,
  onCreateListDialogChange,
  createListInput,
  onCreateListInputChange,
  createListBackground,
  onCreateListBackgroundChange,
  colors,
  onCreateList,
  hasTaskLists,
  taskLists,
  sensorsList,
  onDragEndTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  t,
}: DrawerPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <DrawerHeader>
        {isWideLayout ? (
          <h2
            id="drawer-task-lists-title"
            className="m-0 text-xl font-semibold"
          >
            {t("app.drawerTitle")}
          </h2>
        ) : (
          <DrawerTitle id="drawer-task-lists-title">
            {t("app.drawerTitle")}
          </DrawerTitle>
        )}
        {isWideLayout ? (
          <p
            id="drawer-task-lists-description"
            className="m-0 text-sm text-gray-500"
          >
            {t("app.drawerSignedIn")} {userEmail}
          </p>
        ) : (
          <DrawerDescription id="drawer-task-lists-description">
            {t("app.drawerSignedIn")} {userEmail}
          </DrawerDescription>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onOpenSettings}>
            {t("settings.title")}
          </button>
        </div>
      </DrawerHeader>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <Dialog
          open={Boolean(showCreateListDialog)}
          onOpenChange={(open: boolean) => {
            onCreateListDialogChange(open);
            if (!open) {
              onCreateListInputChange("");
              onCreateListBackgroundChange(colors[0]);
            }
          }}
        >
          <DialogTrigger asChild>
            <button type="button">{t("app.createNew")}</button>
          </DialogTrigger>
          <DialogContent
            title={t("app.createTaskList")}
            description={t("app.taskListName")}
          >
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span>{t("app.taskListName")}</span>
                <input
                  type="text"
                  value={createListInput}
                  onChange={(e) => onCreateListInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onCreateList();
                    }
                  }}
                  placeholder={t("app.taskListNamePlaceholder")}
                />
              </label>
              <div className="flex flex-col gap-2">
                <span>{t("taskList.selectColor")}</span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={createListBackground === color}
                      aria-label={`${t("taskList.selectColor")} ${color}`}
                      onClick={() => onCreateListBackgroundChange(color)}
                      className={clsx(
                        "h-8 w-8 rounded-[10px]",
                        createListBackground === color
                          ? "border-2 border-[#111111]"
                          : "border border-[#cccccc]",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button">{t("app.cancel")}</button>
              </DialogClose>
              <button
                type="button"
                onClick={onCreateList}
                disabled={!createListInput.trim()}
              >
                {t("app.create")}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEndTaskList}
          >
            <SortableContext items={taskLists.map((t) => t.id)}>
              {taskLists.map((taskList) => (
                <SortableTaskListItem
                  key={taskList.id}
                  taskList={taskList}
                  onSelect={(taskListId) => {
                    onSelectTaskList(taskListId);
                    onCloseDrawer();
                  }}
                  dragHintLabel={t("app.dragHint")}
                  taskCountLabel={t("taskList.taskCount", {
                    count: taskList.tasks.length,
                  })}
                  isActive={selectedTaskListId === taskList.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p>{t("app.emptyState")}</p>
        )}
      </div>
    </div>
  );
}

export default DrawerPanel;
