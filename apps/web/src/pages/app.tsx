import {
  ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addMonths } from "date-fns";
import { DayButton as DayPickerDayButton } from "react-day-picker";
import type { Task, TaskList } from "@/lib/types";
import clsx from "clsx";

import { useSessionState, useUser } from "@/lib/session";
import { useTaskListIndexState } from "@/lib/taskLists";
import {
  addSharedTaskListToOrder,
  createTaskList,
  fetchTaskListIdByShareCode,
  updateTaskListOrder,
} from "@/lib/mutations/app";
import { resolveErrorMessage } from "@/lib/utils/errors";
import { getLanguageDirection } from "@/lib/utils/language";
import { useOptimisticReorder } from "@/lib/hooks/useOptimisticReorder";
import {
  logShareCodeJoin,
  logTaskListCreate,
  logTaskListReorder,
} from "@/lib/analytics";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/Drawer";
import { Spinner } from "@/components/ui/Spinner";
import { Carousel } from "@/components/ui/Carousel";
import { TaskListCard } from "@/components/app/TaskListCard";

const Calendar = dynamic(
  () => import("@/components/ui/Calendar").then((mod) => mod.Calendar),
  {
    loading: () => (
      <div className="h-72 w-72 animate-pulse rounded-lg bg-background dark:bg-surface-dark" />
    ),
    ssr: false,
  },
);

const AUTH_TIMEOUT_MS = 10_000;

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

const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

const parseTaskDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTaskDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const createDateFromKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return null;
  const y = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10) - 1;
  const d = Number.parseInt(parts[2], 10);
  return new Date(y, m, d);
};

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type DrawerPanelContent = ComponentPropsWithoutRef<
  typeof DrawerContent
>["children"];

type DatedTask = {
  taskListId: string;
  taskListName: string;
  taskListBackground: string;
  task: Task;
  dateValue: Date;
  dateKey: string;
};

const getDatedTaskId = (task: DatedTask): string =>
  `${task.taskListId}:${task.task.id}`;

type AppHeaderProps = {
  isWideLayout: boolean;
  isRtl: boolean;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: DrawerPanelContent;
  openMenuLabel: string;
};

function AppHeader({
  isWideLayout,
  isRtl,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerPanel,
  openMenuLabel,
}: AppHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-wrap items-center px-1 py-1.5",
        isWideLayout ? "justify-start" : "justify-between",
      )}
    >
      {!isWideLayout && (
        <Drawer
          direction={isRtl ? "right" : "left"}
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label={openMenuLabel}
              title={openMenuLabel}
              className="inline-flex items-center justify-center rounded p-3 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon
                className="h-6 w-6"
                name="menu"
                aria-hidden="true"
                focusable="false"
              />
              <span className="sr-only">{openMenuLabel}</span>
            </button>
          </DrawerTrigger>
          <DrawerContent
            aria-labelledby="drawer-task-lists-title"
            aria-describedby="drawer-task-lists-description"
          >
            {drawerPanel}
          </DrawerContent>
        </Drawer>
      )}
    </header>
  );
}

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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={clsx(
        "flex items-center gap-2 rounded-[10px] p-2",
        isActive ? "bg-background dark:bg-surface-dark" : "bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex touch-none items-center rounded-lg p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-border dark:border-border-dark"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="flex flex-1 flex-col items-start gap-0.5 text-start"
      >
        <span className={clsx(isActive ? "font-bold" : "font-medium")}>
          {taskList.name}
        </span>
        <span className="text-xs text-muted dark:text-muted-dark">
          {taskCountLabel}
        </span>
      </button>
    </div>
  );
}

type CalendarTaskItemProps = {
  task: DatedTask;
  onOpenTaskList: (taskListId: string) => void;
  onSelectDate: (date: Date) => void;
  itemRef: (element: HTMLDivElement | null) => void;
  isHighlighted: boolean;
};

function CalendarTaskItem({
  task,
  onOpenTaskList,
  onSelectDate,
  itemRef,
  isHighlighted,
}: CalendarTaskItemProps) {
  const dateDisplayValue = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(task.dateValue);

  return (
    <div
      ref={itemRef}
      className={clsx(
        "flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0 dark:border-border-dark",
        isHighlighted && "bg-background dark:bg-surface-dark",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(task.dateValue)}
            className="shrink-0 rounded-md text-xs text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:focus-visible:outline-muted-dark"
          >
            {dateDisplayValue}
          </button>
          <button
            type="button"
            onClick={() => onOpenTaskList(task.taskListId)}
            className="inline-flex min-w-0 items-center justify-end gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full border border-border dark:border-border-dark"
              style={{ backgroundColor: task.taskListBackground }}
            />
            <span className="truncate text-xs font-medium text-text dark:text-text-dark">
              {task.taskListName}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelectDate(task.dateValue)}
          className="truncate rounded-md text-start font-medium leading-6 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-text-dark dark:focus-visible:outline-muted-dark"
        >
          {task.task.text}
        </button>
      </div>
    </div>
  );
}

type CalendarSheetProps = {
  isWideLayout: boolean;
  taskLists: TaskList[];
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
};

function CalendarSheet({
  isWideLayout,
  taskLists,
  onSelectTaskList,
  onCloseDrawer,
}: CalendarSheetProps) {
  const { t, i18n } = useTranslation();
  const calendarSheetStateKey = "calendar-sheet-open";
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedCalendarMonthKey, setSelectedCalendarMonthKey] = useState<
    string | null
  >(null);
  const [calendarError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastCalendarIndexRef = useRef(0);

  const datedTasks = useMemo<DatedTask[]>(() => {
    const flattened: DatedTask[] = [];
    for (const taskList of taskLists) {
      for (const task of taskList.tasks) {
        if (task.completed) continue;
        const parsedDate = parseTaskDate(task.date);
        if (!parsedDate) continue;
        flattened.push({
          taskListId: taskList.id,
          taskListName: taskList.name,
          taskListBackground: resolveTaskListBackground(taskList.background),
          task,
          dateValue: parsedDate,
          dateKey: formatTaskDate(parsedDate),
        });
      }
    }
    flattened.sort((left, right) => {
      const byDate = left.dateValue.getTime() - right.dateValue.getTime();
      if (byDate !== 0) return byDate;
      const byTaskText = left.task.text.localeCompare(right.task.text);
      if (byTaskText !== 0) return byTaskText;
      return left.taskListName.localeCompare(right.taskListName);
    });
    return flattened;
  }, [taskLists]);

  const calendarMonths = useMemo<Date[]>(() => {
    const firstTask = datedTasks[0];
    const lastTask = datedTasks[datedTasks.length - 1];
    if (!firstTask || !lastTask) return [];
    const startMonth = addMonths(
      new Date(
        firstTask.dateValue.getFullYear(),
        firstTask.dateValue.getMonth(),
        1,
      ),
      -1,
    );
    const endMonth = addMonths(
      new Date(
        lastTask.dateValue.getFullYear(),
        lastTask.dateValue.getMonth(),
        1,
      ),
      1,
    );
    const months: Date[] = [];
    for (
      let currentMonth = startMonth;
      currentMonth <= endMonth;
      currentMonth = addMonths(currentMonth, 1)
    ) {
      months.push(currentMonth);
    }
    const currentMonth = new Date();
    const currentMonthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    if (
      !months.some(
        (month) => formatMonthKey(month) === formatMonthKey(currentMonthStart),
      )
    ) {
      months.push(currentMonthStart);
      months.sort((left, right) => left.getTime() - right.getTime());
    }
    return months;
  }, [datedTasks]);

  const datedTasksByMonth = useMemo<Record<string, DatedTask[]>>(() => {
    const map: Record<string, DatedTask[]> = {};
    for (const task of datedTasks) {
      const monthKey = formatMonthKey(task.dateValue);
      if (!map[monthKey]) {
        map[monthKey] = [];
      }
      map[monthKey].push(task);
    }
    return map;
  }, [datedTasks]);

  const monthTaskDates = useMemo<Record<string, Date[]>>(() => {
    const map: Record<string, Date[]> = {};
    for (const [monthKey, tasks] of Object.entries(datedTasksByMonth)) {
      const dateSet = new Set(tasks.map((task) => task.dateKey));
      map[monthKey] = Array.from(dateSet)
        .map((dateKey) => createDateFromKey(dateKey))
        .filter((date): date is Date => Boolean(date));
    }
    return map;
  }, [datedTasksByMonth]);

  const monthDateDotColors = useMemo<
    Record<string, Record<string, string[]>>
  >(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const [monthKey, tasks] of Object.entries(datedTasksByMonth)) {
      const monthDotColors: Record<string, string[]> = {};
      for (const task of tasks) {
        if (!monthDotColors[task.dateKey]) {
          monthDotColors[task.dateKey] = [];
        }
        if (!monthDotColors[task.dateKey].includes(task.taskListBackground)) {
          if (monthDotColors[task.dateKey].length < 3) {
            monthDotColors[task.dateKey].push(task.taskListBackground);
          }
        }
      }
      map[monthKey] = monthDotColors;
    }
    return map;
  }, [datedTasksByMonth]);

  const calendarMonthKeys = useMemo(
    () => calendarMonths.map((month) => formatMonthKey(month)),
    [calendarMonths],
  );

  const calendarIndex = useMemo(() => {
    if (calendarMonthKeys.length === 0) return 0;
    if (selectedCalendarMonthKey) {
      const matchedIndex = calendarMonthKeys.indexOf(selectedCalendarMonthKey);
      if (matchedIndex >= 0) return matchedIndex;
    }
    const currentMonthIndex = calendarMonthKeys.indexOf(
      formatMonthKey(new Date()),
    );
    if (currentMonthIndex >= 0) return currentMonthIndex;
    return Math.min(lastCalendarIndexRef.current, calendarMonthKeys.length - 1);
  }, [calendarMonthKeys, selectedCalendarMonthKey]);

  useEffect(() => {
    if (calendarMonthKeys.length === 0) {
      setSelectedCalendarMonthKey(null);
      lastCalendarIndexRef.current = 0;
      return;
    }
    if (
      selectedCalendarMonthKey &&
      calendarMonthKeys.includes(selectedCalendarMonthKey)
    ) {
      return;
    }

    const fallbackIndex = Math.min(
      lastCalendarIndexRef.current,
      calendarMonthKeys.length - 1,
    );
    const fallbackMonthKey =
      calendarMonthKeys[Math.max(fallbackIndex, 0)] ??
      calendarMonthKeys[0] ??
      null;
    const currentMonthKey = formatMonthKey(new Date());
    setSelectedCalendarMonthKey(
      selectedCalendarMonthKey === null &&
        calendarMonthKeys.includes(currentMonthKey)
        ? currentMonthKey
        : fallbackMonthKey,
    );
  }, [calendarMonthKeys, selectedCalendarMonthKey]);

  useEffect(() => {
    lastCalendarIndexRef.current = calendarIndex;
  }, [calendarIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || !calendarSheetOpen) return;

    const currentState = window.history.state;
    if (currentState?.calendarSheet !== calendarSheetStateKey) {
      window.history.pushState(
        { ...currentState, calendarSheet: calendarSheetStateKey },
        "",
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.calendarSheet === calendarSheetStateKey) return;
      setCalendarSheetOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [calendarSheetOpen, calendarSheetStateKey]);

  const selectedCalendarDateKey = useMemo(
    () => (selectedCalendarDate ? formatTaskDate(selectedCalendarDate) : null),
    [selectedCalendarDate],
  );

  const handleSelectCalendarDate = (
    next: Date | undefined,
    tasksInMonth: DatedTask[],
  ) => {
    setSelectedCalendarDate(next);
    if (!next) return;
    const dateKey = formatTaskDate(next);
    const targetTask = tasksInMonth.find((task) => task.dateKey === dateKey);
    if (!targetTask) return;
    const targetElement = datedTaskRefs.current[getDatedTaskId(targetTask)];
    if (!targetElement) return;

    requestAnimationFrame(() => {
      const container = targetElement.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const top =
        targetRect.top -
        containerRect.top -
        container.clientHeight / 2 +
        targetElement.clientHeight / 2;

      container.scrollTo({
        top: container.scrollTop + top,
        behavior: "smooth",
      });
    });
  };

  const handleCalendarSheetOpenChange = (open: boolean) => {
    if (open) {
      setCalendarSheetOpen(true);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.history.state?.calendarSheet === calendarSheetStateKey
    ) {
      window.history.back();
      return;
    }

    setCalendarSheetOpen(false);
  };

  const handleOpenTaskListFromCalendar = (taskListId: string) => {
    onSelectTaskList(taskListId);

    if (!isWideLayout) {
      if (
        typeof window !== "undefined" &&
        window.history.state?.calendarSheet === calendarSheetStateKey &&
        window.history.state?.drawer === "drawer-open"
      ) {
        window.history.go(-2);
        return;
      }

      handleCalendarSheetOpenChange(false);
      onCloseDrawer();
      return;
    }

    handleCalendarSheetOpenChange(false);
  };

  const carouselDirection = getLanguageDirection(
    i18n.resolvedLanguage ?? i18n.language,
  );

  return (
    <Drawer
      direction="bottom"
      open={calendarSheetOpen}
      onOpenChange={handleCalendarSheetOpenChange}
    >
      <DrawerTrigger asChild>
        <button
          type="button"
          data-vaul-no-drag
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
        >
          <AppIcon
            name="calendar-today"
            aria-hidden="true"
            focusable="false"
            className="h-5 w-5"
          />
          <span>{t("app.calendarCheckButton")}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent
        overlayClassName="z-1400"
        className="inset-x-0 bottom-0 left-0 right-0 top-auto z-1500 h-[min(94vh,920px)] max-w-none overflow-hidden rounded-t-2xl"
      >
        <div className="flex h-full min-h-0 flex-col">
          {calendarError ? (
            <Alert variant="error">{calendarError}</Alert>
          ) : null}
          {datedTasks.length > 0 ? (
            <Carousel
              className="min-h-0 flex-1"
              index={calendarIndex}
              direction={carouselDirection}
              onIndexChange={(nextIndex) => {
                const monthKey = calendarMonthKeys[nextIndex];
                if (!monthKey || monthKey === selectedCalendarMonthKey) return;
                lastCalendarIndexRef.current = nextIndex;
                setSelectedCalendarMonthKey(monthKey);
                setSelectedCalendarDate(undefined);
              }}
              showIndicators={calendarMonths.length > 1}
              indicatorPosition="top"
              indicatorInFlow
              ariaLabel={t("app.calendarCheckButton")}
            >
              {calendarMonths.map((calendarMonth) => {
                const monthKey = formatMonthKey(calendarMonth);
                const visibleDatedTasks = datedTasksByMonth[monthKey] ?? [];
                const calendarTaskDates = monthTaskDates[monthKey] ?? [];
                const dateDotColors = monthDateDotColors[monthKey] ?? {};

                return (
                  <div
                    key={monthKey}
                    className={clsx(
                      "h-full min-h-0 pb-12",
                      isWideLayout
                        ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
                        : "flex flex-col gap-3",
                    )}
                  >
                    <div
                      data-vaul-no-drag
                      className={clsx(
                        "w-full",
                        isWideLayout && "sticky top-0 self-start",
                      )}
                    >
                      <Calendar
                        className="w-full"
                        mode="single"
                        selected={selectedCalendarDate}
                        onSelect={(next) =>
                          handleSelectCalendarDate(next, visibleDatedTasks)
                        }
                        month={calendarMonth}
                        disableNavigation
                        classNames={{
                          nav: "hidden",
                          nav_button: "hidden",
                          nav_button_previous: "hidden",
                          nav_button_next: "hidden",
                        }}
                        modifiers={{ hasTask: calendarTaskDates }}
                        components={{
                          DayButton: (props) => {
                            const dateKey = formatTaskDate(props.day.date);
                            const colors = dateDotColors[dateKey] ?? [];
                            return (
                              <DayPickerDayButton {...props}>
                                <span className="relative flex h-full w-full items-center justify-center">
                                  <span
                                    className={clsx(
                                      colors.length > 0 && "pb-2",
                                    )}
                                  >
                                    {props.day.date.getDate()}
                                  </span>
                                  {colors.length > 0 ? (
                                    <span className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                                      {colors.map((color, index) => (
                                        <span
                                          key={`${dateKey}-${color}-${index}`}
                                          className="h-1.5 w-1.5 rounded-full border border-primary dark:border-primary-dark"
                                          style={{ backgroundColor: color }}
                                        />
                                      ))}
                                    </span>
                                  ) : null}
                                </span>
                              </DayPickerDayButton>
                            );
                          },
                        }}
                      />
                    </div>
                    <div
                      data-vaul-no-drag
                      className={clsx(
                        "min-h-0 overflow-y-auto rounded-xl border border-border dark:border-border-dark",
                        isWideLayout ? "h-full" : "flex-1",
                      )}
                    >
                      {visibleDatedTasks.length > 0 ? (
                        visibleDatedTasks.map((task) => {
                          const taskId = getDatedTaskId(task);
                          return (
                            <CalendarTaskItem
                              key={taskId}
                              task={task}
                              onOpenTaskList={handleOpenTaskListFromCalendar}
                              onSelectDate={(date) =>
                                handleSelectCalendarDate(
                                  date,
                                  visibleDatedTasks,
                                )
                              }
                              isHighlighted={
                                selectedCalendarDateKey === task.dateKey
                              }
                              itemRef={(element) => {
                                datedTaskRefs.current[taskId] = element;
                              }}
                            />
                          );
                        })
                      ) : (
                        <p className="p-4 text-sm text-muted dark:text-muted-dark">
                          {t("app.calendarNoDatedTasks")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </Carousel>
          ) : (
            <p className="text-sm text-muted dark:text-muted-dark">
              {t("app.calendarNoDatedTasks")}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
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
  onCreateList: (name: string, background: string | null) => Promise<string>;
  onJoinList: (code: string) => Promise<void>;
};

function DrawerPanel({
  isWideLayout,
  userEmail,
  hasTaskLists,
  taskLists,
  sensorsList,
  onReorderTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  onCreateList,
  onJoinList,
}: DrawerPanelProps) {
  const { t } = useTranslation();
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(COLORS[0].value);
  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedId = getStringId(active.id);
    const targetId = getStringId(over.id);
    if (draggedId && targetId) {
      await onReorderTaskList(draggedId, targetId);
    }
  };

  const handleCreateList = async () => {
    const name = createListInput.trim();
    if (!name) return;
    await onCreateList(name, createListBackground);
    setCreateListInput("");
    setCreateListBackground(COLORS[0].value);
    setShowCreateListDialog(false);
  };

  const handleJoinList = async () => {
    const code = joinListInput.trim();
    if (!code) return;
    setJoiningList(true);
    setJoinListError(null);
    try {
      await onJoinList(code);
      setJoinListInput("");
      setShowJoinListDialog(false);
    } catch (err) {
      setJoinListError(
        err instanceof Error ? err.message : t("pages.sharecode.error"),
      );
    } finally {
      setJoiningList(false);
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
                className="m-0 min-w-0 flex-1 truncate text-sm text-muted dark:text-muted-dark"
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
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:bg-surface-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
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
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:bg-surface-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon name="close" aria-hidden="true" focusable="false" />
            </button>
          )}
        </div>
      </DrawerHeader>

      <CalendarSheet
        isWideLayout={isWideLayout}
        taskLists={taskLists}
        onSelectTaskList={onSelectTaskList}
        onCloseDrawer={onCloseDrawer}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={taskLists.map((taskList) => taskList.id)}>
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
          <p className="text-sm text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Dialog
            open={showCreateListDialog}
            onOpenChange={(open: boolean) => {
              setShowCreateListDialog(open);
              if (!open) {
                setCreateListInput("");
                setCreateListBackground(COLORS[0].value);
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
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
                  void handleCreateList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span>{t("taskList.selectColor")}</span>
                    <ColorPicker
                      colors={COLORS}
                      selectedColor={createListBackground}
                      onSelect={setCreateListBackground}
                      ariaLabelPrefix={t("taskList.selectColor")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!createListInput.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
                  >
                    {t("app.create")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showJoinListDialog}
            onOpenChange={(open: boolean) => {
              setShowJoinListDialog(open);
              if (!open) {
                setJoinListInput("");
                setJoinListError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
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
                  void handleJoinList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  {joinListError ? (
                    <Alert variant="error">{joinListError}</Alert>
                  ) : null}
                  <label className="flex flex-col gap-1">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      disabled={joiningList}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!joinListInput.trim() || joiningList}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
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

export default function AppPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { authStatus } = useSessionState();
  const user = useUser();
  const {
    hasStartupError,
    taskListOrderStatus,
    taskLists: stateTaskLists,
  } = useTaskListIndexState();
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    stateTaskLists,
    updateTaskListOrder,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isTaskSorting, setIsTaskSorting] = useState(false);

  const sensorsList = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "loading") return;
    const timerId = window.setTimeout(() => {
      router.replace("/");
    }, AUTH_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [authStatus, router]);

  useEffect(() => {
    if (taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [selectedTaskListId, taskLists]);

  useEffect(() => {
    const updateLayout = () => {
      setIsWideLayout(window.innerWidth >= 1024);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (isWideLayout) {
      setIsDrawerOpen(false);
    }
  }, [isWideLayout]);

  useEffect(() => {
    if (typeof window === "undefined" || isWideLayout || !isDrawerOpen) return;

    const drawerStateKey = "drawer-open";
    const currentState = window.history.state;
    if (currentState?.drawer !== drawerStateKey) {
      window.history.pushState({ ...currentState, drawer: drawerStateKey }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.drawer === drawerStateKey) return;
      setIsDrawerOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDrawerOpen, isWideLayout]);

  const isAuthLoading = authStatus === "loading";
  const isTaskListsHydrating = taskListOrderStatus === "loading";
  const hasTaskLists = taskLists.length > 0;
  const userEmail = user?.email || t("app.drawerNoEmail");
  const selectedTaskListIndex = Math.max(
    0,
    taskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );
  const carouselDirection = getLanguageDirection(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const isRtl = carouselDirection === "rtl";

  const handleCloseDrawer = () => {
    const drawerStateKey = "drawer-open";
    const currentState = window.history.state;
    if (currentState?.drawer === drawerStateKey) {
      window.history.back();
    } else {
      setIsDrawerOpen(false);
    }
  };

  const drawerPanel: DrawerPanelContent = (
    <DrawerPanel
      isWideLayout={isWideLayout}
      userEmail={userEmail}
      hasTaskLists={!isTaskListsHydrating && hasTaskLists}
      taskLists={taskLists}
      sensorsList={sensorsList}
      onReorderTaskList={async (draggedTaskListId, targetTaskListId) => {
        setError(null);
        try {
          await reorderTaskList(draggedTaskListId, targetTaskListId);
          logTaskListReorder();
        } catch (err) {
          setError(resolveErrorMessage(err, t, "common.error"));
        }
      }}
      selectedTaskListId={selectedTaskListId}
      onSelectTaskList={(taskListId) => setSelectedTaskListId(taskListId)}
      onCloseDrawer={handleCloseDrawer}
      onOpenSettings={() => {
        setIsDrawerOpen(false);
        const currentState = window.history.state;
        if (currentState?.drawer === "drawer-open") {
          window.history.replaceState({ ...currentState, drawer: null }, "");
        }
        router.push("/settings");
      }}
      onCreateList={async (name, background) => {
        setError(null);
        const newTaskListId = await createTaskList(name, background);
        setSelectedTaskListId(newTaskListId);
        logTaskListCreate();
        return newTaskListId;
      }}
      onJoinList={async (code) => {
        setError(null);
        const normalizedCode = code.trim().toUpperCase();
        const taskListId = await fetchTaskListIdByShareCode(normalizedCode);
        if (!taskListId) {
          throw new Error(t("pages.sharecode.notFound"));
        }

        if (stateTaskLists.some((taskList) => taskList.id === taskListId)) {
          setSelectedTaskListId(taskListId);
          return;
        }

        await addSharedTaskListToOrder(taskListId);
        setSelectedTaskListId(taskListId);
        logShareCodeJoin();
      }}
    />
  );

  if (isAuthLoading || authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  return (
    <div className="h-full min-h-full w-full overflow-hidden text-text dark:text-text-dark">
      <div
        className={clsx(
          "flex h-full",
          isWideLayout
            ? isRtl
              ? "flex-row-reverse items-start"
              : "flex-row items-start"
            : "flex-col",
        )}
      >
        {isWideLayout ? (
          <aside
            className={clsx(
              "sticky top-0 w-[360px] max-w-[420px] shrink-0 self-stretch border-border",
              isRtl ? "border-l" : "border-r",
            )}
          >
            <div className="flex h-full flex-col overflow-y-auto bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
              {drawerPanel}
            </div>
          </aside>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
        >
          {!isWideLayout ? (
            <div className="absolute z-20 w-full">
              <AppHeader
                isWideLayout={isWideLayout}
                isRtl={isRtl}
                isDrawerOpen={isDrawerOpen}
                onDrawerOpenChange={(open) => {
                  if (open) {
                    setIsDrawerOpen(true);
                  } else if (isDrawerOpen) {
                    handleCloseDrawer();
                  }
                }}
                drawerPanel={drawerPanel}
                openMenuLabel={t("app.openMenu")}
              />
              {error ? (
                <div className="px-1">
                  <Alert variant="error">{error}</Alert>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="h-full overflow-hidden">
            {hasStartupError ? (
              <div className="flex h-full items-center justify-center p-4">
                <Alert variant="error">{t("app.error")}</Alert>
              </div>
            ) : isTaskListsHydrating ? (
              <div className="flex h-full items-center justify-center p-4">
                <Spinner />
              </div>
            ) : hasTaskLists ? (
              <Carousel
                className="h-full"
                index={selectedTaskListIndex}
                direction={carouselDirection}
                scrollEnabled={!isTaskSorting}
                onIndexChange={(index) => {
                  const taskList = taskLists[index];
                  if (taskList) {
                    setSelectedTaskListId(taskList.id);
                  }
                }}
                showIndicators={true}
                indicatorPosition="top"
                ariaLabel={t("app.taskListLocator.label")}
                getIndicatorLabel={(index, total) =>
                  t("app.taskListLocator.goTo", {
                    index: index + 1,
                    total,
                  })
                }
              >
                {taskLists.map((taskList) => (
                  <div
                    key={taskList.id}
                    className="flex h-full w-full flex-col"
                    style={{
                      backgroundColor: resolveTaskListBackground(
                        taskList.background,
                      ),
                    }}
                  >
                    <div className="h-[88px]" />
                    <div
                      className={clsx(
                        "h-full overflow-y-auto",
                        isWideLayout && "mx-auto max-w-3xl min-w-[480px]",
                      )}
                    >
                      <TaskListCard
                        taskList={taskList}
                        isActive={selectedTaskListId === taskList.id}
                        onActivate={(taskListId) =>
                          setSelectedTaskListId(taskListId)
                        }
                        sensorsList={sensorsList}
                        onSortingChange={setIsTaskSorting}
                        onDeleted={() => {
                          const remainingLists = stateTaskLists.filter(
                            (currentTaskList) =>
                              currentTaskList.id !== selectedTaskListId,
                          );
                          setSelectedTaskListId(
                            remainingLists.length > 0
                              ? remainingLists[0].id
                              : null,
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Carousel>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-muted dark:text-muted-dark">
                  {t("app.emptyState")}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
