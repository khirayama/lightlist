import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
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
      <div className="h-72 w-72 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
    ssr: false, // Calendar in a popover doesn't need SSR
  },
);

export interface TaskForSortable {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  order?: number;
}

export interface TaskItemProps<T extends TaskForSortable = TaskForSortable> {
  task: T;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T, text?: string) => void;
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

function TaskItemComponent<T extends TaskForSortable = TaskForSortable>({
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
  const selectedDate = parseTaskDate(task.date);
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
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex items-center touch-none text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors peer-checked:border-transparent peer-checked:bg-gray-200 peer-focus-visible:ring-2 peer-focus-visible:ring-gray-400 dark:border-gray-300 dark:bg-gray-900 dark:peer-checked:bg-gray-800">
          <svg
            className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 dark:text-gray-900"
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
          <span className="absolute -top-2 left-0 text-xs leading-none text-gray-600 dark:text-gray-300">
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
                onEditEnd(task, task.text);
              }
            }}
            autoFocus
            className={clsx(
              "min-w-0 w-full bg-transparent p-0 font-medium leading-7 focus:outline-none",
              task.completed
                ? "text-gray-600 line-through dark:text-gray-400"
                : "text-gray-900 dark:text-gray-50",
            )}
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
                ? "min-w-0 cursor-pointer text-left font-medium leading-7 text-gray-600 line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:focus-visible:outline-gray-500"
                : "min-w-0 cursor-pointer text-left font-medium leading-7 text-gray-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-50 dark:focus-visible:outline-gray-500"
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
            className="flex items-center rounded-lg p-1 text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:focus-visible:outline-gray-500"
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
export const TaskItem = memo(TaskItemComponent) as typeof TaskItemComponent;
