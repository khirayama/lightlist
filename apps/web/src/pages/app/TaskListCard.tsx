import type { TFunction } from "i18next";
import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import type { Task, TaskList } from "@lightlist/sdk/types";
import clsx from "clsx";

import { TaskListPanel } from "@/components/app/TaskListPanel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { ColorPicker } from "./ColorPicker";

type IconProps = {
  className?: string;
};

function EditIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

type TaskListCardProps = {
  taskList: TaskList;
  isActive: boolean;
  onActivate: (taskListId: string) => void;
  colors: readonly string[];
  showEditListDialog: boolean;
  onEditDialogOpenChange: (taskList: TaskList, open: boolean) => void;
  editListName: string;
  onEditListNameChange: (value: string) => void;
  editListBackground: string;
  onEditListBackgroundChange: (color: string) => void;
  onSaveListDetails: () => void;
  deletingList: boolean;
  onDeleteList: () => void;
  showShareDialog: boolean;
  onShareDialogOpenChange: (taskList: TaskList, open: boolean) => void;
  shareCode: string | null;
  shareCopySuccess: boolean;
  generatingShareCode: boolean;
  onGenerateShareCode: () => void;
  removingShareCode: boolean;
  onRemoveShareCode: () => void;
  onCopyShareLink: () => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onDragEndTask: (event: DragEndEvent) => void;
  editingTaskId: string | null;
  editingTaskText: string;
  onEditingTaskTextChange: (value: string) => void;
  onEditStartTask: (task: Task) => void;
  onEditEndTask: (task: Task) => void;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  newTaskText: string;
  onNewTaskTextChange: (value: string) => void;
  onAddTask: () => void;
  onSortingChange: (sorting: boolean) => void;
  t: TFunction;
};

export function TaskListCard({
  taskList,
  isActive,
  onActivate,
  colors,
  showEditListDialog,
  onEditDialogOpenChange,
  editListName,
  onEditListNameChange,
  editListBackground,
  onEditListBackgroundChange,
  onSaveListDetails,
  deletingList,
  onDeleteList,
  showShareDialog,
  onShareDialogOpenChange,
  shareCode,
  shareCopySuccess,
  generatingShareCode,
  onGenerateShareCode,
  removingShareCode,
  onRemoveShareCode,
  onCopyShareLink,
  sensorsList,
  onDragEndTask,
  editingTaskId,
  editingTaskText,
  onEditingTaskTextChange,
  onEditStartTask,
  onEditEndTask,
  onToggleTask,
  onDeleteTask,
  newTaskText,
  onNewTaskTextChange,
  onAddTask,
  onSortingChange,
  t,
}: TaskListCardProps) {
  const inputClass =
    "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:outline-red-700 dark:disabled:bg-red-800";
  const iconButtonClass = clsx(secondaryButtonClass, "px-2");

  return (
    <section
      className={clsx(
        "h-full",
        isActive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ backgroundColor: taskList.background }}
    >
      <div className="p-2 backdrop-blur dark:bg-gray-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-xl font-semibold">{taskList.name}</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog
              open={isActive && showEditListDialog}
              onOpenChange={(open: boolean) => {
                onEditDialogOpenChange(taskList, open);
              }}
            >
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => onActivate(taskList.id)}
                  className={iconButtonClass}
                  aria-label={t("taskList.editDetails")}
                  title={t("taskList.editDetails")}
                >
                  <EditIcon className="h-5 w-5" />
                  <span className="sr-only">{t("taskList.editDetails")}</span>
                </button>
              </DialogTrigger>
              <DialogContent
                title={t("taskList.editDetails")}
                description={t("app.taskListName")}
              >
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={editListName}
                      onChange={(e) => onEditListNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onSaveListDetails();
                        }
                      }}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span>{t("taskList.selectColor")}</span>
                    <ColorPicker
                      colors={colors}
                      selectedColor={editListBackground}
                      onSelect={onEditListBackgroundChange}
                      ariaLabelPrefix={t("taskList.selectColor")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    onClick={onDeleteList}
                    disabled={deletingList}
                    className={destructiveButtonClass}
                  >
                    {deletingList
                      ? t("common.deleting")
                      : t("taskList.deleteList")}
                  </button>
                  <DialogClose asChild>
                    <button type="button" className={secondaryButtonClass}>
                      {t("common.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="button"
                    onClick={onSaveListDetails}
                    disabled={!editListName.trim()}
                    className={primaryButtonClass}
                  >
                    {t("taskList.editDetails")}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isActive && showShareDialog}
              onOpenChange={(open: boolean) => {
                onShareDialogOpenChange(taskList, open);
              }}
            >
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => onActivate(taskList.id)}
                  className={iconButtonClass}
                  aria-label={t("taskList.share")}
                  title={t("taskList.share")}
                >
                  <ShareIcon className="h-5 w-5" />
                  <span className="sr-only">{t("taskList.share")}</span>
                </button>
              </DialogTrigger>
              <DialogContent
                title={t("taskList.shareTitle")}
                description={t("taskList.shareDescription")}
              >
                {shareCode ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span>{t("taskList.shareCode")}</span>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={shareCode}
                          readOnly
                          className={clsx(inputClass, "font-mono")}
                        />
                        <button
                          type="button"
                          onClick={onCopyShareLink}
                          className={secondaryButtonClass}
                        >
                          {shareCopySuccess
                            ? t("common.copied")
                            : t("common.copy")}
                        </button>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={onRemoveShareCode}
                      disabled={removingShareCode}
                      className={destructiveButtonClass}
                    >
                      {removingShareCode
                        ? t("common.deleting")
                        : t("taskList.removeShare")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={onGenerateShareCode}
                      disabled={generatingShareCode}
                      className={primaryButtonClass}
                    >
                      {generatingShareCode
                        ? t("common.loading")
                        : t("taskList.generateShare")}
                    </button>
                  </div>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <button type="button" className={secondaryButtonClass}>
                      {t("common.close")}
                    </button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mt-4 border-gray-200/70 pt-4 dark:border-gray-800">
          <TaskListPanel
            tasks={taskList.tasks}
            sensors={sensorsList}
            onDragEnd={onDragEndTask}
            editingTaskId={editingTaskId}
            editingText={editingTaskText}
            onEditingTextChange={onEditingTaskTextChange}
            onEditStart={onEditStartTask}
            onEditEnd={onEditEndTask}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            newTaskText={newTaskText}
            onNewTaskTextChange={onNewTaskTextChange}
            onAddTask={onAddTask}
            addButtonLabel={t("common.add")}
            addPlaceholder={t("pages.tasklist.addTaskPlaceholder")}
            deleteLabel={t("common.delete")}
            dragHintLabel={t("pages.tasklist.dragHint")}
            emptyLabel={t("pages.tasklist.noTasks")}
            historySuggestions={taskList.history}
            onSortingChange={onSortingChange}
            variant="card"
          />
        </div>
      </div>
    </section>
  );
}

export default TaskListCard;
