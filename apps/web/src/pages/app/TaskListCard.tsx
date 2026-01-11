import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task, TaskInsertPosition, TaskList } from "@lightlist/sdk/types";
import clsx from "clsx";

import {
  addTask,
  updateTask,
  updateTasksOrder,
  sortTasks,
  deleteCompletedTasks,
} from "@lightlist/sdk/mutations/app";
import { TaskListPanel } from "@/components/app/TaskListPanel";
import { Alert } from "@/components/ui/Alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveErrorMessage } from "@/utils/errors";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type TaskListCardProps = {
  taskList: TaskList;
  taskInsertPosition: TaskInsertPosition;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onSortingChange?: (sorting: boolean) => void;
  t: TFunction;
  enableEditDialog?: boolean;
  colors?: readonly ColorOption[];
  showEditListDialog?: boolean;
  onEditDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  editListName?: string;
  onEditListNameChange?: (value: string) => void;
  editListBackground?: string | null;
  onEditListBackgroundChange?: (color: string | null) => void;
  onSaveListDetails?: () => void;
  deletingList?: boolean;
  onDeleteList?: () => void;
  enableShareDialog?: boolean;
  showShareDialog?: boolean;
  onShareDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  shareCode?: string | null;
  shareCopySuccess?: boolean;
  generatingShareCode?: boolean;
  onGenerateShareCode?: () => void;
  removingShareCode?: boolean;
  onRemoveShareCode?: () => void;
  onCopyShareLink?: () => void;
};

export function TaskListCard({
  taskList,
  taskInsertPosition,
  isActive,
  onActivate,
  sensorsList,
  onSortingChange,
  t,
  enableEditDialog = false,
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
  enableShareDialog = false,
  showShareDialog,
  onShareDialogOpenChange,
  shareCode,
  shareCopySuccess,
  generatingShareCode,
  onGenerateShareCode,
  removingShareCode,
  onRemoveShareCode,
  onCopyShareLink,
}: TaskListCardProps) {
  const [taskError, setTaskError] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  useEffect(() => {
    setLocalTasks(taskList.tasks);
  }, [taskList.tasks]);

  const tasks = localTasks;

  const handleDragEndTask = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedTaskId = getStringId(active.id);
    const targetTaskId = getStringId(over.id);
    if (!draggedTaskId || !targetTaskId) return;

    const oldIndex = localTasks.findIndex((t) => t.id === draggedTaskId);
    const newIndex = localTasks.findIndex((t) => t.id === targetTaskId);

    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalTasks((prev) => arrayMove(prev, oldIndex, newIndex));
    }

    setTaskError(null);
    try {
      await updateTasksOrder(taskList.id, draggedTaskId, targetTaskId);
    } catch (err) {
      setLocalTasks(taskList.tasks); // Rollback
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleSortTasks = async () => {
    setTaskError(null);
    try {
      await sortTasks(taskList.id);
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleEditStartTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleEditEndTask = async (task: Task) => {
    const trimmedText = editingTaskText.trim();
    if (trimmedText === "" || trimmedText === task.text) {
      setEditingTaskId(null);
      return;
    }

    setTaskError(null);
    try {
      const startTime = performance.now();
      await updateTask(taskList.id, task.id, { text: trimmedText });
      console.log(
        `[Web TaskListCard] handleEditEndTask: ${(performance.now() - startTime).toFixed(2)}ms`,
      );
      setEditingTaskId(null);
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleToggleTask = async (task: Task) => {
    setTaskError(null);
    try {
      const startTime = performance.now();
      await updateTask(taskList.id, task.id, { completed: !task.completed });
      console.log(
        `[Web TaskListCard] handleToggleTask: ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleChangeTaskDate = async (taskId: string, date: string) => {
    setTaskError(null);
    try {
      await updateTask(taskList.id, taskId, { date });
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleAddTask = async () => {
    const trimmedText = newTaskText.trim();
    if (trimmedText === "") return;

    setTaskError(null);
    setAddTaskError(null);
    setNewTaskText("");

    try {
      await addTask(taskList.id, trimmedText);
    } catch (err) {
      setAddTaskError(resolveErrorMessage(err, t, "common.error"));
      setNewTaskText((current) =>
        current.trim() === "" ? trimmedText : current,
      );
    }
  };

  const inputClass =
    "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-50 dark:focus-visible:outline-gray-500";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:outline-red-700 dark:disabled:bg-red-800";
  const iconButtonClass = clsx(secondaryButtonClass, "px-2");

  return (
    <section
      className={clsx(
        "h-full overflow-y-auto",
        isActive ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div className="h-full p-2 pt-6">
        <div className="min-h-full p-4">
          <TaskListPanel
            tasks={tasks}
            sensors={sensorsList}
            onSortTasks={handleSortTasks}
            onDeleteCompletedTasks={handleDeleteCompletedTasks}
            onDragEnd={handleDragEndTask}
            editingTaskId={editingTaskId}
            editingText={editingTaskText}
            onEditingTextChange={setEditingTaskText}
            onEditStart={handleEditStartTask}
            onEditEnd={handleEditEndTask}
            onToggle={handleToggleTask}
            onDateChange={handleChangeTaskDate}
            newTaskText={newTaskText}
            onNewTaskTextChange={(value) => {
              setNewTaskText(value);
              setAddTaskError(null);
            }}
            onAddTask={handleAddTask}
            addButtonLabel={t("common.add")}
            addPlaceholder={t("pages.tasklist.addTaskPlaceholder")}
            setDateLabel={t("pages.tasklist.setDate")}
            dragHintLabel={t("pages.tasklist.dragHint")}
            emptyLabel={t("pages.tasklist.noTasks")}
            historySuggestions={taskList.history}
            onSortingChange={onSortingChange}
            addError={addTaskError}
            stickyHeader={true}
            headerStyle={{
              backgroundColor:
                taskList.background ?? "var(--tasklist-theme-bg)",
            }}
            headerClassName="backdrop-blur-sm"
            header={
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="m-0 text-xl font-semibold">
                      {taskList.name}
                    </h2>
                  </div>
                  {(enableEditDialog || enableShareDialog) && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {enableEditDialog &&
                        colors &&
                        onEditDialogOpenChange &&
                        onEditListNameChange &&
                        onEditListBackgroundChange &&
                        onSaveListDetails &&
                        onDeleteList && (
                          <Dialog
                            open={isActive && (showEditListDialog ?? false)}
                            onOpenChange={(open: boolean) => {
                              onEditDialogOpenChange(taskList, open);
                            }}
                          >
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onActivate?.(taskList.id)}
                                className={iconButtonClass}
                                aria-label={t("taskList.editDetails")}
                                title={t("taskList.editDetails")}
                              >
                                <AppIcon
                                  name="edit"
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                  focusable="false"
                                />
                                <span className="sr-only">
                                  {t("taskList.editDetails")}
                                </span>
                              </button>
                            </DialogTrigger>
                            <DialogContent
                              title={t("taskList.editDetails")}
                              description={t("app.taskListName")}
                            >
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!(editListName ?? "").trim()) return;
                                  void onSaveListDetails();
                                }}
                              >
                                <div className="mt-4 flex flex-col gap-3">
                                  <label className="flex flex-col gap-1">
                                    <span>{t("app.taskListName")}</span>
                                    <input
                                      type="text"
                                      value={editListName ?? ""}
                                      onChange={(e) =>
                                        onEditListNameChange(e.target.value)
                                      }
                                      placeholder={t(
                                        "app.taskListNamePlaceholder",
                                      )}
                                      className={inputClass}
                                    />
                                  </label>
                                  <div className="flex flex-col gap-2">
                                    <span>{t("taskList.selectColor")}</span>
                                    <ColorPicker
                                      colors={colors}
                                      selectedColor={editListBackground ?? null}
                                      onSelect={onEditListBackgroundChange}
                                      ariaLabelPrefix={t(
                                        "taskList.selectColor",
                                      )}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={onDeleteList}
                                    disabled={deletingList}
                                    className={clsx(
                                      destructiveButtonClass,
                                      "mt-6 w-full",
                                    )}
                                  >
                                    {deletingList
                                      ? t("common.deleting")
                                      : t("taskList.deleteList")}
                                  </button>
                                </div>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <button
                                      type="button"
                                      className={secondaryButtonClass}
                                    >
                                      {t("common.cancel")}
                                    </button>
                                  </DialogClose>
                                  <button
                                    type="submit"
                                    disabled={!(editListName ?? "").trim()}
                                    className={primaryButtonClass}
                                  >
                                    {t("taskList.editDetails")}
                                  </button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}

                      {enableShareDialog && onShareDialogOpenChange && (
                        <Dialog
                          open={isActive && (showShareDialog ?? false)}
                          onOpenChange={(open: boolean) => {
                            onShareDialogOpenChange(taskList, open);
                          }}
                        >
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onActivate?.(taskList.id)}
                              className={iconButtonClass}
                              aria-label={t("taskList.share")}
                              title={t("taskList.share")}
                            >
                              <AppIcon
                                name="share"
                                className="h-5 w-5"
                                aria-hidden="true"
                                focusable="false"
                              />
                              <span className="sr-only">
                                {t("taskList.share")}
                              </span>
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
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                >
                                  {t("common.close")}
                                </button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )}
                </div>
                {taskError ? <Alert variant="error">{taskError}</Alert> : null}
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

export default TaskListCard;
