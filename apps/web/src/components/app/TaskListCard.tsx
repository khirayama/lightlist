import {
  useEffect,
  useState,
  useId,
  useRef,
  type MouseEvent,
  useMemo,
} from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { Task, TaskList } from "@lightlist/sdk/types";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";

import {
  addTask,
  updateTask,
  sortTasks,
  deleteCompletedTasks,
  updateTasksOrder,
  updateTaskList,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
} from "@lightlist/sdk/mutations/app";
import {
  logTaskAdd,
  logTaskUpdate,
  logTaskDelete,
  logTaskDeleteCompleted,
  logTaskReorder,
  logTaskSort,
  logTaskListDelete,
  logTaskListReorder,
  logShareCodeGenerate,
  logShareCodeRemove,
} from "@lightlist/sdk/analytics";
import { Alert } from "@/components/ui/Alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveErrorMessage } from "@lightlist/sdk/utils/errors";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";
import { Command, CommandItem, CommandList } from "@/components/ui/Command";
import { TaskItem } from "@/components/app/TaskItem";

const COLORS: readonly ColorOption[] = [
  {
    value: null,
    preview: "var(--tasklist-theme-bg)",
  },
  { value: "#F87171" },
  { value: "#FBBF24" },
  { value: "#34D399" },
  { value: "#38BDF8" },
  { value: "#818CF8" },
  { value: "#A78BFA" },
];

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type SortableData = {
  sortable: {
    containerId: UniqueIdentifier;
    items: UniqueIdentifier[];
    index: number;
  };
};

const hasSortableData = (data: unknown): data is SortableData => {
  if (!data || typeof data !== "object") return false;
  const sortable = (data as { sortable?: unknown }).sortable;
  return Boolean(sortable && typeof sortable === "object");
};

export type TaskListCardProps = {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onSortingChange?: (sorting: boolean) => void;
  onDeleted?: () => void;
};

export function TaskListCard({
  taskList,
  isActive,
  onActivate,
  sensorsList,
  onSortingChange,
  onDeleted,
}: TaskListCardProps) {
  const { t } = useTranslation();
  const reactId = useId();
  const [taskError, setTaskError] = useState<string | null>(null);
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    taskList.tasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const editingTaskIdRef = useRef<string | null>(null);
  editingTaskIdRef.current = editingTaskId;

  const [newTaskText, setNewTaskText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteCompletedPending, setDeleteCompletedPending] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);

  // Edit dialog state
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [editListName, setEditListName] = useState(taskList.name);
  const [editListBackground, setEditListBackground] = useState<string | null>(
    taskList.background,
  );
  const [deletingList, setDeletingList] = useState(false);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(
    taskList.shareCode ?? null,
  );
  const [generatingShareCode, setGeneratingShareCode] = useState(false);
  const [removingShareCode, setRemovingShareCode] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);

  const [editError, setEditError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!showShareDialog) return;
    setShareCode(taskList.shareCode ?? null);
  }, [taskList.shareCode, showShareDialog]);

  const handleSortingChange = (sorting: boolean) => {
    onSortingChange?.(sorting);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (hasSortableData(data)) {
      handleSortingChange(true);
    }
  };

  const handleDragEndTask = async (event: DragEndEvent) => {
    handleSortingChange(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedTaskId = getStringId(active.id);
    const targetTaskId = getStringId(over.id);
    if (!draggedTaskId || !targetTaskId) return;

    setTaskError(null);
    try {
      await reorderTask(draggedTaskId, targetTaskId);
      logTaskReorder();
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDragCancel = () => {
    handleSortingChange(false);
  };

  const handleSortTasks = async () => {
    setTaskError(null);
    try {
      await sortTasks(taskList.id);
      logTaskSort();
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskError(null);
    try {
      await deleteCompletedTasks(taskList.id);
      logTaskDeleteCompleted({ count: completedTaskCount });
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleEditStartTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleEditEndTask = async (task: Task, text?: string) => {
    if (editingTaskIdRef.current !== task.id) return;

    const currentText = text ?? editingTaskText;
    const trimmedText = currentText.trim();
    if (trimmedText === "" || trimmedText === task.text) {
      setEditingTaskId(null);
      return;
    }

    setTaskError(null);
    try {
      await updateTask(taskList.id, task.id, { text: trimmedText });
      setEditingTaskId(null);
      logTaskUpdate({ fields: "text" });
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleToggleTask = async (task: Task) => {
    setTaskError(null);
    try {
      await updateTask(taskList.id, task.id, { completed: !task.completed });
      logTaskUpdate({ fields: "completed" });
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleChangeTaskDate = async (taskId: string, date: string) => {
    setTaskError(null);
    try {
      await updateTask(taskList.id, taskId, { date });
      logTaskUpdate({ fields: "date" });
    } catch (err) {
      setTaskError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleAddTask = async (text?: string) => {
    const trimmedText = (text ?? newTaskText).trim();
    if (trimmedText === "") return;

    setTaskError(null);
    setAddTaskError(null);
    setNewTaskText("");

    try {
      await addTask(taskList.id, trimmedText);
      logTaskAdd({ has_date: false });
    } catch (err) {
      setAddTaskError(resolveErrorMessage(err, t, "common.error"));
      setNewTaskText((current) =>
        current.trim() === "" ? trimmedText : current,
      );
    }
  };

  const handleSaveListDetails = async () => {
    const trimmedName = editListName.trim();
    const updates: { name?: string; background?: string | null } = {};

    if (trimmedName && trimmedName !== taskList.name) {
      updates.name = trimmedName;
    }
    if (editListBackground !== taskList.background) {
      updates.background = editListBackground;
    }

    if (Object.keys(updates).length === 0) {
      setShowEditListDialog(false);
      return;
    }

    setEditError(null);
    try {
      await updateTaskList(taskList.id, updates);
      setShowEditListDialog(false);
    } catch (err) {
      setEditError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteList = async () => {
    setDeletingList(true);
    setEditError(null);
    try {
      await deleteTaskList(taskList.id);
      setShowEditListDialog(false);
      onDeleted?.();
      logTaskListDelete();
    } catch (err) {
      setEditError(resolveErrorMessage(err, t, "common.error"));
    } finally {
      setDeletingList(false);
    }
  };

  const handleGenerateShareCode = async () => {
    setGeneratingShareCode(true);
    setShareError(null);
    try {
      const code = await generateShareCode(taskList.id);
      setShareCode(code);
      logShareCodeGenerate();
    } catch (err) {
      setShareError(resolveErrorMessage(err, t, "common.error"));
    } finally {
      setGeneratingShareCode(false);
    }
  };

  const handleRemoveShareCode = async () => {
    setRemovingShareCode(true);
    setShareError(null);
    try {
      await removeShareCode(taskList.id);
      setShareCode(null);
      logShareCodeRemove();
    } catch (err) {
      setShareError(resolveErrorMessage(err, t, "common.error"));
    } finally {
      setRemovingShareCode(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareCode) return;
    const shareUrl = `${window.location.origin}/sharecodes/${shareCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopySuccess(true);
      setTimeout(() => setShareCopySuccess(false), 2000);
    } catch {
      setShareError(t("common.error"));
    }
  };

  const historySuggestions = taskList.history;
  const historyOptions = useMemo(() => {
    const input = newTaskText.trim();
    if (!historySuggestions || historySuggestions.length === 0) return [];
    if (input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const seen = new Set<string>();
    const options: string[] = [];

    for (const candidate of historySuggestions) {
      const option = candidate.trim();
      if (option === "") continue;

      const optionLower = option.toLowerCase();
      if (optionLower === inputLower) continue;
      if (!optionLower.includes(inputLower)) continue;
      if (seen.has(optionLower)) continue;

      seen.add(optionLower);
      options.push(option);
      if (options.length >= 20) break;
    }

    return options;
  }, [newTaskText, historySuggestions]);

  const historyListId = `task-history-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    if (historyOptions.length === 0) {
      setHistoryOpen(false);
    }
  }, [historyOptions.length]);

  const completedTaskCount = tasks.reduce(
    (count, task) => count + (task.completed ? 1 : 0),
    0,
  );

  const inputClass =
    "rounded-xl border border-border bg-inputBackground px-3 py-2 text-text focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 font-semibold text-primaryText hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border-border h-12 w-12 font-semibold text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-error px-4 py-2 font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-50 dark:bg-error-dark dark:focus-visible:outline-error-dark";
  const iconButtonClass = clsx(secondaryButtonClass, "px-2");

  const listContent =
    tasks.length === 0 ? (
      <p className="text-muted dark:text-muted-dark">
        {t("pages.tasklist.noTasks")}
      </p>
    ) : (
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isEditing={editingTaskId === task.id}
            editingText={editingTaskText}
            onEditingTextChange={setEditingTaskText}
            onEditStart={handleEditStartTask}
            onEditEnd={handleEditEndTask}
            onToggle={handleToggleTask}
            onDateChange={handleChangeTaskDate}
          />
        ))}
      </div>
    );

  const inputSection = (
    <>
      <form
        className="flex items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTaskText.trim() === "") return;
          setHistoryOpen(false);
          newTaskInputRef.current?.focus();
          void handleAddTask();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Command shouldFilter={false} className="bg-transparent">
            <input
              ref={newTaskInputRef}
              type="text"
              aria-label={t("pages.tasklist.addTaskPlaceholder")}
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls={
                historyOptions.length > 0 ? historyListId : undefined
              }
              aria-expanded={historyOpen && historyOptions.length > 0}
              value={newTaskText}
              onChange={(e) => {
                setNewTaskText(e.target.value);
                setAddTaskError(null);
                setHistoryOpen(true);
              }}
              onFocus={() => {
                setHistoryOpen(true);
                setIsInputFocused(true);
              }}
              onBlur={() => {
                setHistoryOpen(false);
                setIsInputFocused(false);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  if (newTaskText.trim() === "") return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
                if (e.key === "Escape") {
                  setHistoryOpen(false);
                }
              }}
              placeholder={t("pages.tasklist.addTaskPlaceholder")}
              className="w-full rounded-xl border border-border bg-inputBackground px-3 py-2 text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
            />
            {historyOpen && historyOptions.length > 0 ? (
              <CommandList
                id={historyListId}
                className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-surface p-1 shadow-lg dark:border-border-dark dark:bg-surface-dark"
              >
                {historyOptions.map((text) => (
                  <CommandItem
                    key={text}
                    value={text}
                    onMouseDown={(event: MouseEvent<HTMLDivElement>) =>
                      event.preventDefault()
                    }
                    onSelect={() => {
                      setAddTaskError(null);
                      setHistoryOpen(false);
                      newTaskInputRef.current?.focus();
                      void handleAddTask(text);
                    }}
                  >
                    {text}
                  </CommandItem>
                ))}
              </CommandList>
            ) : null}
          </Command>
        </div>
        <button
          type="submit"
          onMouseDown={(e) => e.preventDefault()}
          disabled={newTaskText.trim() === ""}
          aria-label={t("common.add")}
          title={t("common.add")}
          className={clsx(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-xl text-placeholder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed dark:text-text-dark dark:focus-visible:outline-muted-dark dark:disabled:opacity-50 transition-all duration-300 ease-in-out overflow-hidden",
            isInputFocused
              ? "w-8 opacity-100 ml-2 pointer-events-auto"
              : "w-0 opacity-0 ml-0 pointer-events-none",
          )}
        >
          <span className="sr-only">{t("common.add")}</span>
          <span className="relative left-[1px]">
            <AppIcon name="send" aria-hidden="true" focusable="false" />
          </span>
        </button>
      </form>
      {addTaskError ? <Alert variant="error">{addTaskError}</Alert> : null}
    </>
  );

  return (
    <section
      className={clsx(
        "h-full overflow-y-auto",
        isActive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ backgroundColor: taskList.background ?? undefined }}
    >
      <div className="min-h-full px-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-semibold">{taskList.name}</h2>
                </div>

                <div className="flex flex-wrap justify-end relative left-2">
                  <Dialog
                    open={isActive && showEditListDialog}
                    onOpenChange={(open: boolean) => {
                      onActivate?.(taskList.id);
                      setShowEditListDialog(open);
                      if (open) {
                        setEditListName(taskList.name);
                        setEditListBackground(taskList.background);
                        setEditError(null);
                      }
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
                          if (!editListName.trim()) return;
                          void handleSaveListDetails();
                        }}
                      >
                        <div className="mt-4 flex flex-col gap-3">
                          {editError ? (
                            <Alert variant="error">{editError}</Alert>
                          ) : null}
                          <label className="flex flex-col gap-1">
                            <span>{t("app.taskListName")}</span>
                            <input
                              type="text"
                              value={editListName}
                              onChange={(e) => setEditListName(e.target.value)}
                              placeholder={t("app.taskListNamePlaceholder")}
                              className={inputClass}
                            />
                          </label>
                          <div className="flex flex-col gap-2">
                            <span>{t("taskList.selectColor")}</span>
                            <ColorPicker
                              colors={COLORS}
                              selectedColor={editListBackground ?? null}
                              onSelect={setEditListBackground}
                              ariaLabelPrefix={t("taskList.selectColor")}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                t("taskList.deleteListConfirm.message"),
                              );
                              if (!confirmed) return;
                              void handleDeleteList();
                            }}
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
                            disabled={!editListName.trim()}
                            className={primaryButtonClass}
                          >
                            {t("taskList.editDetails")}
                          </button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isActive && showShareDialog}
                    onOpenChange={(open: boolean) => {
                      onActivate?.(taskList.id);
                      setShowShareDialog(open);
                      if (open) {
                        setShareCode(taskList.shareCode ?? null);
                        setShareCopySuccess(false);
                        setShareError(null);
                      }
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
                          aria-hidden="true"
                          focusable="false"
                        />
                        <span className="sr-only">{t("taskList.share")}</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      title={t("taskList.shareTitle")}
                      description={t("taskList.shareDescription")}
                    >
                      {shareError ? (
                        <Alert variant="error">{shareError}</Alert>
                      ) : null}
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
                                onClick={handleCopyShareLink}
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
                            onClick={handleRemoveShareCode}
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
                            onClick={handleGenerateShareCode}
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
                </div>
              </div>
              {taskError ? <Alert variant="error">{taskError}</Alert> : null}
            </div>
            {inputSection}
            <div className="flex items-center justify-between gap-2 pb-6">
              <div className="flex items-center">
                <button
                  type="button"
                  disabled={tasks.length < 2}
                  onClick={async () => {
                    void handleSortTasks();
                  }}
                  className="inline-flex items-center justify-center rounded-xl font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark"
                >
                  <AppIcon name="sort" aria-hidden="true" focusable="false" />
                  {t("pages.tasklist.sort")}
                </button>
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={deleteCompletedPending || completedTaskCount === 0}
                  onClick={async () => {
                    if (completedTaskCount === 0) return;
                    const confirmed = window.confirm(
                      t("pages.tasklist.deleteCompletedConfirm", {
                        count: completedTaskCount,
                      }),
                    );
                    if (!confirmed) return;

                    setDeleteCompletedPending(true);
                    try {
                      await handleDeleteCompletedTasks();
                    } finally {
                      setDeleteCompletedPending(false);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-error-dark dark:text-text-dark"
                >
                  {deleteCompletedPending
                    ? t("common.deleting")
                    : t("pages.tasklist.deleteCompleted")}
                  <span className="pr-1">
                    <AppIcon
                      name="delete"
                      aria-hidden="true"
                      focusable="false"
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEndTask}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {listContent}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </section>
  );
}
