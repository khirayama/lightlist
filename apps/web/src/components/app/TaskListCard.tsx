import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ElementRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  forwardRef,
  memo,
} from "react";
import dynamic from "next/dynamic";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command as CommandPrimitive } from "cmdk";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
  closestCenter,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, TaskList } from "@/lib/types";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { useOptimisticReorder } from "@/lib/hooks/useOptimisticReorder";
import {
  addTask,
  deleteCompletedTasks,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
  sortTasks,
  updateTask,
  updateTaskList,
  updateTasksOrder,
} from "@/lib/mutations/app";
import {
  logShareCodeGenerate,
  logShareCodeRemove,
  logTaskAdd,
  logTaskDeleteCompleted,
  logTaskListDelete,
  logTaskReorder,
  logTaskSort,
  logTaskUpdate,
} from "@/lib/analytics";
import { Alert } from "@/components/ui/Alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveErrorMessage } from "@/lib/translation";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";

const Calendar = dynamic(
  () => import("@/components/ui/Calendar").then((mod) => mod.Calendar),
  {
    loading: () => (
      <div className="h-72 w-72 animate-pulse rounded-lg bg-background dark:bg-surface-dark" />
    ),
    ssr: false,
  },
);

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

const parseTaskDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return undefined;
    }
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const formatTaskDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const PopoverContent = forwardRef(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      ...props
    }: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
    ref: ForwardedRef<ElementRef<typeof PopoverPrimitive.Content>>,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={clsx(
          "z-50 w-auto rounded-xl border border-border bg-surface p-2 text-text shadow-lg outline-none",
          "dark:border-border-dark dark:bg-surface-dark dark:text-text-dark",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";

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

type TaskItemProps = {
  task: Task;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task, text?: string) => void;
  onToggle: (task: Task) => void;
  onDateChange?: (taskId: string, date: string) => void;
};

function TaskItemComponent({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDateChange,
}: TaskItemProps) {
  const { t, i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const taskTextId = `task-item-text-${task.id}`;
  const selectedDate = parseTaskDate(task.date);
  const setDateLabel = t("pages.tasklist.setDate");
  const dateDisplayValue = selectedDate
    ? new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
        weekday: "short",
      }).format(selectedDate)
    : null;
  const dateTitle = dateDisplayValue
    ? `${setDateLabel}: ${dateDisplayValue}`
    : setDateLabel;

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 py-2">
      <button
        {...attributes}
        {...listeners}
        title={t("pages.tasklist.dragHint")}
        aria-label={t("pages.tasklist.dragHint")}
        type="button"
        className="flex items-center touch-none text-placeholder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="relative right-[5px]">
          <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
        </span>
      </button>

      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          aria-labelledby={taskTextId}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface transition-colors peer-checked:border-transparent peer-checked:bg-border peer-focus-visible:ring-2 peer-focus-visible:ring-muted dark:border-border-dark dark:bg-surface-dark dark:peer-checked:bg-surface">
          <svg
            className="h-3.5 w-3.5 text-surface opacity-0 transition-opacity peer-checked:opacity-100 dark:text-surface-dark"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {dateDisplayValue ? (
          <span
            className="absolute -top-2 text-xs leading-none text-muted dark:text-muted-dark"
            style={{ insetInlineStart: 0 }}
          >
            {dateDisplayValue}
          </span>
        ) : null}
        {isEditing ? (
          <input
            id={taskTextId}
            type="text"
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onBlur={() => onEditEnd(task)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") onEditEnd(task);
              if (e.key === "Escape") {
                onEditEnd(task, task.text);
              }
            }}
            autoFocus
            className={clsx(
              "min-w-0 w-full bg-transparent p-0 font-medium leading-7 focus:outline-none",
              task.completed
                ? "text-muted line-through dark:text-muted-dark"
                : "text-text dark:text-text-dark",
            )}
          />
        ) : (
          <span
            id={taskTextId}
            role="button"
            tabIndex={0}
            onClick={() => onEditStart(task)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEditStart(task);
              }
            }}
            className={
              task.completed
                ? "min-w-0 cursor-pointer text-start font-medium leading-7 text-muted line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:focus-visible:outline-muted-dark"
                : "min-w-0 cursor-pointer text-start font-medium leading-7 text-text underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-text-dark dark:focus-visible:outline-muted-dark"
            }
          >
            {task.text}
          </span>
        )}
      </div>

      <PopoverPrimitive.Root
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={setDateLabel}
            title={dateTitle}
            className="flex items-center rounded-lg p-1 text-placeholder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark"
          >
            <AppIcon
              name="calendar-today"
              aria-hidden="true"
              focusable="false"
            />
            <span className="sr-only">{setDateLabel}</span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverContent align="end" className="p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(next) => {
              onDateChange?.(task.id, next ? formatTaskDate(next) : "");
              setDatePickerOpen(false);
            }}
          />
        </PopoverContent>
      </PopoverPrimitive.Root>
    </div>
  );
}

const TaskItem = memo(TaskItemComponent);

type TaskListCardProps = {
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
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [editListName, setEditListName] = useState(taskList.name);
  const [editListBackground, setEditListBackground] = useState<string | null>(
    taskList.background,
  );
  const [deletingList, setDeletingList] = useState(false);
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
    if (hasSortableData(event.active.data.current)) {
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

  const historyOptions = useMemo(() => {
    const input = newTaskText.trim();
    if (
      !taskList.history ||
      taskList.history.length === 0 ||
      input.length < 2
    ) {
      return [];
    }

    const inputLower = input.toLowerCase();
    const seen = new Set<string>();
    const options: string[] = [];

    for (const candidate of taskList.history) {
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
  }, [newTaskText, taskList.history]);

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

                <div className="relative left-2 flex flex-wrap justify-end">
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
                              if (
                                !window.confirm(
                                  t("taskList.deleteListConfirm.message"),
                                )
                              ) {
                                return;
                              }
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
                <CommandPrimitive
                  shouldFilter={false}
                  className="bg-transparent"
                >
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
                    <CommandPrimitive.List
                      id={historyListId}
                      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-surface p-1 shadow-lg dark:border-border-dark dark:bg-surface-dark"
                    >
                      {historyOptions.map((text) => (
                        <CommandPrimitive.Item
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
                          className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[selected=true]:bg-background dark:data-[selected=true]:bg-background-dark"
                        >
                          {text}
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.List>
                  ) : null}
                </CommandPrimitive>
              </div>
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                disabled={newTaskText.trim() === ""}
                aria-label={t("common.add")}
                title={t("common.add")}
                className={clsx(
                  "inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-placeholder transition-all duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed dark:text-text-dark dark:focus-visible:outline-muted-dark dark:disabled:opacity-50",
                  isInputFocused
                    ? "ml-2 w-8 pointer-events-auto opacity-100"
                    : "ml-0 w-0 pointer-events-none opacity-0",
                )}
              >
                <span className="sr-only">{t("common.add")}</span>
                <span className="relative left-[1px]">
                  <AppIcon name="send" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </form>
            {addTaskError ? (
              <Alert variant="error">{addTaskError}</Alert>
            ) : null}

            <div className="flex items-center justify-between gap-2 pb-6">
              <div className="flex items-center">
                <button
                  type="button"
                  disabled={tasks.length < 2}
                  onClick={() => {
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
                    if (
                      !window.confirm(
                        t("pages.tasklist.deleteCompletedConfirm", {
                          count: completedTaskCount,
                        }),
                      )
                    ) {
                      return;
                    }
                    setDeleteCompletedPending(true);
                    try {
                      await handleDeleteCompletedTasks();
                    } finally {
                      setDeleteCompletedPending(false);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-60 dark:text-text-dark dark:focus-visible:outline-error-dark"
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
            onDragCancel={() => handleSortingChange(false)}
          >
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.length === 0 ? (
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
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </section>
  );
}
