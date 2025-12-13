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
    "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:outline-red-700 dark:disabled:bg-red-800";

  return (
    <section
      className={clsx(
        "rounded-2xl p-2 sm:p-3",
          isActive ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={{ backgroundColor: taskList.background }}
      >
        <div className="rounded-xl bg-white/90 p-4 shadow-sm backdrop-blur dark:bg-gray-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-xl font-semibold">{taskList.name}</h2>
              <div className="flex items-center gap-2">
                <span
                  aria-label={t("taskList.selectColor")}
                  className="h-4 w-4 rounded border border-gray-300 dark:border-gray-700"
                  style={{ backgroundColor: taskList.background }}
                />
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {taskList.background}
                </span>
              </div>
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
                    className={secondaryButtonClass}
                  >
                    {t("taskList.editDetails")}
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
                    className={secondaryButtonClass}
                  >
                    {t("taskList.share")}
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

          <div className="mt-4 border-t border-gray-200/70 pt-4 dark:border-gray-800">
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
              addButtonLabel={t("taskList.addTask")}
              addPlaceholder={t("taskList.addTaskPlaceholder")}
              deleteLabel={t("common.delete")}
              dragHintLabel={t("taskList.dragHint")}
              emptyLabel={t("pages.tasklist.noTasks")}
              historySuggestions={taskList.history}
              onSortingChange={onSortingChange}
            />
          </div>
        </div>
      </section>
    );
  }

export default TaskListCard;
