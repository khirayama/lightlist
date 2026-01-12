import type { TFunction } from "i18next";
import { useEffect, useState, useId, useRef, type MouseEvent } from "react";
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
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { Task, TaskInsertPosition, TaskList } from "@lightlist/sdk/types";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import {
  addTask,
  updateTask,
  updateTasksOrder,
  sortTasks,
  deleteCompletedTasks,
} from "@lightlist/sdk/mutations/app";
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
import { Calendar } from "@/components/ui/Calendar";
import { Command, CommandItem, CommandList } from "@/components/ui/Command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

export interface TaskForSortable {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  order?: number;
}

interface TaskItemProps<T extends TaskForSortable = TaskForSortable> {
  task: T;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T) => void;
  onToggle: (task: T) => void;
  onDateChange?: (taskId: string, date: string) => void;
  setDateLabel: string;
  dragHintLabel: string;
}

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
    )
      return undefined;
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

function TaskItem<T extends TaskForSortable = TaskForSortable>({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDateChange,
  setDateLabel,
  dragHintLabel,
}: TaskItemProps<T>) {
  const { i18n } = useTranslation();
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    parseTaskDate(task.date),
  );

  useEffect(() => {
    setSelectedDate(parseTaskDate(task.date));
  }, [task.date]);

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
    <div ref={setNodeRef} style={style} className="flex gap-2 rounded-xl py-3">
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex h-7 items-center touch-none rounded-lg p-1 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
      >
        <AppIcon
          name="drag-indicator"
          className="h-5 w-5"
          aria-hidden="true"
          focusable="false"
        />
      </button>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="mt-1.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {dateDisplayValue ? (
          <span className="absolute -top-2 left-0 text-xs leading-none text-gray-500 dark:text-gray-400">
            {dateDisplayValue}
          </span>
        ) : null}
        {isEditing ? (
          <input
            type="text"
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onBlur={() => onEditEnd(task)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") onEditEnd(task);
              if (e.key === "Escape") {
                onEditingTextChange(task.text);
              }
            }}
            autoFocus
            className="min-w-0 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
          />
        ) : (
          <span
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
                ? "min-w-0 cursor-pointer text-left text-sm font-medium leading-7 text-gray-600 line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:focus-visible:outline-gray-500"
                : "min-w-0 cursor-pointer text-left text-sm font-medium leading-7 text-gray-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-50 dark:focus-visible:outline-gray-500"
            }
          >
            {task.text}
          </span>
        )}
      </div>

      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={setDateLabel}
            title={dateTitle}
            className="flex h-7 items-center rounded-lg p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
          >
            <AppIcon
              name="calendar-today"
              className="h-5 w-5"
              aria-hidden="true"
              focusable="false"
            />
            <span className="sr-only">{setDateLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(next) => {
              setSelectedDate(next);
              onDateChange?.(task.id, next ? formatTaskDate(next) : "");
              setDatePickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
  const reactId = useId();
  const [taskError, setTaskError] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteCompletedPending, setDeleteCompletedPending] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const restoreNewTaskFocusRef = useRef(false);

  useEffect(() => {
    setLocalTasks(taskList.tasks);
  }, [taskList.tasks]);

  const tasks = localTasks;

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

  const handleDragCancel = () => {
    handleSortingChange(false);
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

  const historySuggestions = taskList.history;
  const historyOptions = (() => {
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
  })();
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
    "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-50 dark:focus-visible:outline-gray-500";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:outline-red-700 dark:disabled:bg-red-800";
  const iconButtonClass = clsx(secondaryButtonClass, "px-2");

  const listContent =
    tasks.length === 0 ? (
      <p className="text-sm text-gray-600 dark:text-gray-300">
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
            setDateLabel={t("pages.tasklist.setDate")}
            dragHintLabel={t("pages.tasklist.dragHint")}
          />
        ))}
      </div>
    );

  const inputSection = (
    <>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTaskText.trim() === "") return;
          restoreNewTaskFocusRef.current = true;
          newTaskInputRef.current?.focus();
          requestAnimationFrame(() => {
            const input = newTaskInputRef.current;
            if (!input) return;
            if (!input.disabled) {
              restoreNewTaskFocusRef.current = false;
            }
          });
          void handleAddTask();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Command shouldFilter={false} className="bg-transparent">
            <input
              ref={newTaskInputRef}
              type="text"
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
              onFocus={() => setHistoryOpen(true)}
              onBlur={() => setHistoryOpen(false)}
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
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
            />
            {historyOpen && historyOptions.length > 0 ? (
              <CommandList
                id={historyListId}
                className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                {historyOptions.map((text) => (
                  <CommandItem
                    key={text}
                    value={text}
                    onMouseDown={(event: MouseEvent<HTMLDivElement>) =>
                      event.preventDefault()
                    }
                    onSelect={(value: string) => {
                      setNewTaskText(value);
                      setAddTaskError(null);
                      setHistoryOpen(false);
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
          disabled={newTaskText.trim() === ""}
          aria-label={t("common.add")}
          title={t("common.add")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
        >
          <span className="sr-only">{t("common.add")}</span>
          <AppIcon
            name="send"
            className="h-5 w-5"
            aria-hidden="true"
            focusable="false"
          />
        </button>
      </form>
      {addTaskError ? <Alert variant="error">{addTaskError}</Alert> : null}
    </>
  );

  return (
    <section
      className={clsx(
        "h-full overflow-y-auto transition-colors duration-200",
        isActive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ backgroundColor: taskList.background ?? undefined }}
    >
      <div className="h-full p-2 pt-6">
        <div className="min-h-full p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
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
              {inputSection}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={tasks.length < 2}
                    onClick={async () => {
                      void handleSortTasks();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-50 dark:focus-visible:outline-gray-500"
                  >
                    <AppIcon
                      name="sort"
                      className="h-4 w-4"
                      aria-hidden="true"
                      focusable="false"
                    />
                    {t("pages.tasklist.sort")}
                  </button>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={
                      deleteCompletedPending || completedTaskCount === 0
                    }
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-red-400 dark:text-gray-50"
                  >
                    {deleteCompletedPending
                      ? t("common.deleting")
                      : t("pages.tasklist.deleteCompleted")}
                    <AppIcon
                      name="delete"
                      className="h-4 w-4"
                      aria-hidden="true"
                      focusable="false"
                    />
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
      </div>
    </section>
  );
}

export default TaskListCard;
