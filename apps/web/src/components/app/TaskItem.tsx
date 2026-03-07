import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Task } from "@lightlist/sdk/types";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

// Dynamic import to reduce initial bundle size
// Loading state provides visual feedback while the heavy calendar component loads
const Calendar = dynamic(
  () => import("@/components/ui/Calendar").then((mod) => mod.Calendar),
  {
    loading: () => (
      <div className="h-72 w-72 animate-pulse rounded-lg bg-background dark:bg-surface-dark" />
    ),
    ssr: false, // Calendar in a popover doesn't need SSR
  },
);

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task, text?: string) => void;
  onToggle: (task: Task) => void;
  onDateChange?: (taskId: string, date: string) => void;
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

      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
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
      </Popover>
    </div>
  );
}

// Memoize TaskItem to prevent unnecessary re-renders when parent state changes
export const TaskItem = memo(TaskItemComponent);
