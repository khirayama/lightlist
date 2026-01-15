import type { TFunction } from "i18next";
import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { TaskList } from "@lightlist/sdk/types";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  showCreateListDialog: boolean;
  onCreateListDialogChange: (open: boolean) => void;
  createListInput: string;
  onCreateListInputChange: (value: string) => void;
  createListBackground: string | null;
  onCreateListBackgroundChange: (color: string | null) => void;
  colors: ColorOption[];
  onCreateList: () => void | Promise<void>;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  sensorsList: SensorDescriptor<SensorOptions>[];
  onReorderTaskList: (
    draggedId: string,
    targetId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  showJoinListDialog: boolean;
  onJoinListDialogChange: (open: boolean) => void;
  joinListInput: string;
  onJoinListInputChange: (value: string) => void;
  onJoinList: () => void | Promise<void>;
  joinListError: string | null;
  joiningList: boolean;
  t: TFunction;
};

type SortableTaskListItemProps = {
  taskList: TaskList;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
  isActive: boolean;
};

function SortableTaskListItem({
  taskList,
  onSelect,
  dragHintLabel,
  taskCountLabel,
  isActive,
}: SortableTaskListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskList.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 rounded-[10px] p-2",
        isActive ? "bg-gray-100 dark:bg-gray-800" : "bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex touch-none items-center rounded-lg p-1 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-700"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="flex-1 flex flex-col items-start gap-0.5 text-left"
      >
        <span className={clsx(isActive ? "font-bold" : "font-medium")}>
          {taskList.name}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {taskCountLabel}
        </span>
      </button>
    </div>
  );
}

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
  onReorderTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  showJoinListDialog,
  onJoinListDialogChange,
  joinListInput,
  onJoinListInputChange,
  onJoinList,
  joinListError,
  joiningList,
  t,
}: DrawerPanelProps) {
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = getStringId(active.id);
    const targetId = getStringId(over.id);

    if (draggedId && targetId) {
      await onReorderTaskList(draggedId, targetId);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <DrawerHeader>
        {isWideLayout ? (
          <h2 id="drawer-task-lists-title" className="sr-only">
            {t("app.drawerTitle")}
          </h2>
        ) : (
          <DrawerTitle id="drawer-task-lists-title" className="sr-only">
            {t("app.drawerTitle")}
          </DrawerTitle>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isWideLayout ? (
              <p
                id="drawer-task-lists-description"
                className="m-0 min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-400"
              >
                {userEmail}
              </p>
            ) : (
              <DrawerDescription
                id="drawer-task-lists-description"
                className="min-w-0 flex-1 truncate"
              >
                {userEmail}
              </DrawerDescription>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              data-vaul-no-drag
              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
            >
              <AppIcon name="settings" aria-hidden="true" focusable="false" />
            </button>
          </div>
          {!isWideLayout && (
            <button
              type="button"
              onClick={onCloseDrawer}
              title={t("common.close")}
              aria-label={t("common.close")}
              data-vaul-no-drag
              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
            >
              <AppIcon name="close" aria-hidden="true" focusable="false" />
            </button>
          )}
        </div>
      </DrawerHeader>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
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
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("app.emptyState")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Dialog
            open={Boolean(showCreateListDialog)}
            onOpenChange={(open: boolean) => {
              onCreateListDialogChange(open);
              if (!open) {
                onCreateListInputChange("");
                onCreateListBackgroundChange(colors[0].value);
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
              >
                {t("app.createNew")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onCreateList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => onCreateListInputChange(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span>{t("taskList.selectColor")}</span>
                    <ColorPicker
                      colors={colors}
                      selectedColor={createListBackground}
                      onSelect={onCreateListBackgroundChange}
                      ariaLabelPrefix={t("taskList.selectColor")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!createListInput.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
                  >
                    {t("app.create")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(showJoinListDialog)}
            onOpenChange={(open: boolean) => {
              onJoinListDialogChange(open);
              if (!open) {
                onJoinListInputChange("");
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
              >
                {t("app.joinList")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onJoinList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  {joinListError && (
                    <Alert variant="error">{joinListError}</Alert>
                  )}
                  <label className="flex flex-col gap-1">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => onJoinListInputChange(e.target.value)}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
                    />
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      disabled={joiningList}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!joinListInput.trim() || joiningList}
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
                  >
                    {joiningList ? t("app.joining") : t("app.join")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default DrawerPanel;
