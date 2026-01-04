import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
  closestCenter,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  SortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { MouseEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { Calendar } from "@/components/ui/Calendar";
import { Command, CommandItem, CommandList } from "@/components/ui/Command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

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
    parseTaskDate(task.date)
  );

  useEffect(() => {
    setSelectedDate(parseTaskDate(task.date));
  }, [task.date]);

  const dateValue = selectedDate ? formatTaskDate(selectedDate) : null;
  const dateTitle = dateValue ? `${setDateLabel}: ${dateValue}` : setDateLabel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="mt-0.5 touch-none rounded-lg p-1 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
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
        className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
      />

      {isEditing ? (
        <input
          type="text"
          value={editingText}
          onChange={(e) => onEditingTextChange(e.target.value)}
          onBlur={() => onEditEnd(task)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditEnd(task);
            if (e.key === "Escape") {
              onEditingTextChange(task.text);
            }
          }}
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
        />
      ) : (
        <button
          type="button"
          onClick={() => onEditStart(task)}
          className={
            task.completed
              ? "min-w-0 flex-1 text-left text-sm font-medium text-gray-600 line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:focus-visible:outline-gray-500"
              : "min-w-0 flex-1 text-left text-sm font-medium text-gray-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-50 dark:focus-visible:outline-gray-500"
          }
        >
          {task.text}
        </button>
      )}

      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={setDateLabel}
            title={dateTitle}
            className={`mt-0.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500 ${
              dateValue ? "px-2 py-1 text-xs font-semibold tabular-nums" : "p-1"
            }`}
          >
            {dateValue ? (
              <span aria-hidden="true">{dateValue}</span>
            ) : (
              <AppIcon
                name="calendar-today"
                className="h-5 w-5"
                aria-hidden="true"
                focusable="false"
              />
            )}
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

export type SortableTask = TaskForSortable;

export interface TaskListPanelProps<T extends SortableTask = SortableTask> {
  tasks: T[];
  sensors: SensorDescriptor<SensorOptions>[];
  collisionDetection?: CollisionDetection;
  strategy?: SortingStrategy;
  editingTaskId: string | null;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T) => void;
  onToggle: (task: T) => void;
  onDateChange?: (taskId: string, date: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  newTaskText: string;
  onNewTaskTextChange: (text: string) => void;
  onAddTask: () => void;
  addButtonLabel: string;
  addPlaceholder: string;
  setDateLabel: string;
  dragHintLabel: string;
  emptyLabel: string;
  historySuggestions?: string[];
  onSortingChange?: (sorting: boolean) => void;
  onSortTasks?: () => Promise<void> | void;
  onDeleteCompletedTasks?: () => Promise<void> | void;
  addDisabled?: boolean;
  inputDisabled?: boolean;
  addError?: string | null;
  header?: React.ReactNode;
  headerClassName?: string;
  stickyHeader?: boolean;
  headerStyle?: React.CSSProperties;
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

export function TaskListPanel<T extends SortableTask = SortableTask>({
  tasks,
  sensors,
  collisionDetection,
  strategy,
  editingTaskId,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDateChange,
  onDragEnd,
  newTaskText,
  onNewTaskTextChange,
  onAddTask,
  addButtonLabel,
  addPlaceholder,
  setDateLabel,
  dragHintLabel,
  emptyLabel,
  historySuggestions,
  onSortingChange,
  onSortTasks,
  onDeleteCompletedTasks,
  addDisabled = false,
  inputDisabled = false,
  addError = null,
  header,
  headerClassName,
  stickyHeader = false,
  headerStyle,
}: TaskListPanelProps<T>) {
  const { t } = useTranslation();
  const reactId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sortPending, setSortPending] = useState(false);
  const [deleteCompletedPending, setDeleteCompletedPending] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const restoreNewTaskFocusRef = useRef(false);
  const collision = collisionDetection ?? closestCenter;
  const strategyValue = strategy ?? verticalListSortingStrategy;
  const isAddDisabled =
    addDisabled || inputDisabled || newTaskText.trim() === "";
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

  useEffect(() => {
    if (inputDisabled) return;
    if (!restoreNewTaskFocusRef.current) return;
    restoreNewTaskFocusRef.current = false;
    newTaskInputRef.current?.focus();
  }, [inputDisabled]);

  const listContent =
    tasks.length === 0 ? (
      <p className="text-sm text-gray-600 dark:text-gray-300">{emptyLabel}</p>
    ) : (
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isEditing={editingTaskId === task.id}
            editingText={editingText}
            onEditingTextChange={onEditingTextChange}
            onEditStart={onEditStart}
            onEditEnd={onEditEnd}
            onToggle={onToggle}
            onDateChange={onDateChange}
            setDateLabel={setDateLabel}
            dragHintLabel={dragHintLabel}
          />
        ))}
      </div>
    );

  const completedTaskCount = tasks.reduce(
    (count, task) => count + (task.completed ? 1 : 0),
    0
  );

  const handleSortingChange = (sorting: boolean) => {
    onSortingChange?.(sorting);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (hasSortableData(data)) {
      handleSortingChange(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    handleSortingChange(false);
    onDragEnd(event);
  };

  const handleDragCancel = () => {
    handleSortingChange(false);
  };

  const inputSection = (
    <>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddDisabled) return;
          restoreNewTaskFocusRef.current = true;
          newTaskInputRef.current?.focus();
          requestAnimationFrame(() => {
            const input = newTaskInputRef.current;
            if (!input) return;
            if (!input.disabled) {
              restoreNewTaskFocusRef.current = false;
            }
          });
          void onAddTask();
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
                onNewTaskTextChange(e.target.value);
                setHistoryOpen(true);
              }}
              onFocus={() => setHistoryOpen(true)}
              onBlur={() => setHistoryOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (isAddDisabled) return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
                if (e.key === "Escape") {
                  setHistoryOpen(false);
                }
              }}
              placeholder={addPlaceholder}
              disabled={inputDisabled}
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
                      onNewTaskTextChange(value);
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
          disabled={isAddDisabled}
          aria-label={addButtonLabel}
          title={addButtonLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
        >
          <span className="sr-only">{addButtonLabel}</span>
          <AppIcon
            name="send"
            className="h-5 w-5"
            aria-hidden="true"
            focusable="false"
          />
        </button>
      </form>
      {addError ? <Alert variant="error">{addError}</Alert> : null}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className={clsx(
          "flex flex-col gap-4",
          stickyHeader && "sticky top-0 z-30 -mx-2 -mt-6 px-2 pt-6 pb-4"
        )}
        style={stickyHeader ? headerStyle : undefined}
      >
        {header}
        {inputSection}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center">
            <button
              type="button"
              disabled={
                sortPending || inputDisabled || tasks.length < 2 || !onSortTasks
              }
              onClick={async () => {
                if (!onSortTasks) return;
                setSortPending(true);
                try {
                  await onSortTasks();
                } finally {
                  setSortPending(false);
                }
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
                deleteCompletedPending ||
                inputDisabled ||
                completedTaskCount === 0 ||
                !onDeleteCompletedTasks
              }
              onClick={async () => {
                if (!onDeleteCompletedTasks) return;
                if (completedTaskCount === 0) return;
                const confirmed = window.confirm(
                  t("pages.tasklist.deleteCompletedConfirm", {
                    count: completedTaskCount,
                  })
                );
                if (!confirmed) return;

                setDeleteCompletedPending(true);
                try {
                  await onDeleteCompletedTasks();
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
        sensors={sensors}
        collisionDetection={collision}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={strategyValue}
        >
          {listContent}
        </SortableContext>
      </DndContext>
    </div>
  );
}
