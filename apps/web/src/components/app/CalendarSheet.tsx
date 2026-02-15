import type { TFunction } from "i18next";
import type { TaskList } from "@lightlist/sdk/types";
import { addMonths } from "date-fns";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
  type WheelEvent,
} from "react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { DayButton as DayPickerDayButton } from "react-day-picker";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";

const Calendar = dynamic(
  () => import("@/components/ui/Calendar").then((mod) => mod.Calendar),
  {
    loading: () => (
      <div className="h-72 w-72 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
    ssr: false,
  },
);

import {
  CalendarTaskItem,
  DatedTask,
  resolveTaskListBackground,
  getDatedTaskId,
  parseTaskDate,
  formatTaskDate,
  createDateFromKey,
} from "./DrawerPanel";

type CalendarSheetProps = {
  isWideLayout: boolean;
  taskLists: TaskList[];
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  t: TFunction;
};

export function CalendarSheet({
  isWideLayout,
  taskLists,
  onSelectTaskList,
  onCloseDrawer,
  t,
}: CalendarSheetProps) {
  const calendarSheetStateKey = "calendar-sheet-open";
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(
    undefined,
  );
  const [calendarError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const calendarTouchStartXRef = useRef<number | null>(null);
  const calendarWheelDeltaRef = useRef(0);

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

  useEffect(() => {
    if (datedTasks.length > 0 && !calendarMonth) {
      setCalendarMonth(datedTasks[0].dateValue);
    }
  }, [datedTasks, calendarMonth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!calendarSheetOpen) return;

    const currentState = window.history.state;
    const hasCalendarSheetState =
      currentState?.calendarSheet === calendarSheetStateKey;

    if (!hasCalendarSheetState) {
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

  const visibleDatedTasks = useMemo(() => {
    if (!calendarMonth) return datedTasks;
    return datedTasks.filter(
      (task) =>
        task.dateValue.getFullYear() === calendarMonth.getFullYear() &&
        task.dateValue.getMonth() === calendarMonth.getMonth(),
    );
  }, [datedTasks, calendarMonth]);

  const calendarTaskDates = useMemo(() => {
    const dateSet = new Set(visibleDatedTasks.map((task) => task.dateKey));
    return Array.from(dateSet)
      .map((dateKey) => createDateFromKey(dateKey))
      .filter((date): date is Date => Boolean(date));
  }, [visibleDatedTasks]);
  const selectedCalendarDateKey = useMemo(
    () => (selectedCalendarDate ? formatTaskDate(selectedCalendarDate) : null),
    [selectedCalendarDate],
  );

  const dateDotColors = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const task of visibleDatedTasks) {
      if (!map[task.dateKey]) {
        map[task.dateKey] = [];
      }
      if (map[task.dateKey].includes(task.taskListBackground)) {
        continue;
      }
      if (map[task.dateKey].length < 3) {
        map[task.dateKey].push(task.taskListBackground);
      }
    }
    return map;
  }, [visibleDatedTasks]);

  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth((currentMonth) => {
      const baseMonth =
        currentMonth ?? selectedCalendarDate ?? datedTasks[0]?.dateValue;
      if (!baseMonth) return currentMonth;
      return addMonths(baseMonth, offset);
    });
  };

  const handleCalendarTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    calendarTouchStartXRef.current = touch ? touch.clientX : null;
  };

  const handleCalendarTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = calendarTouchStartXRef.current;
    calendarTouchStartXRef.current = null;
    if (startX === null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    if (Math.abs(deltaX) < 40) return;
    moveCalendarMonth(deltaX < 0 ? 1 : -1);
  };

  const handleCalendarWheel = (event: WheelEvent<HTMLDivElement>) => {
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    calendarWheelDeltaRef.current += dominantDelta;
    if (Math.abs(calendarWheelDeltaRef.current) < 120) return;
    event.preventDefault();
    moveCalendarMonth(calendarWheelDeltaRef.current > 0 ? 1 : -1);
    calendarWheelDeltaRef.current = 0;
  };

  const handleSelectCalendarDate = (next: Date | undefined) => {
    setSelectedCalendarDate(next);
    if (!next) return;
    const dateKey = formatTaskDate(next);
    const targetTask = visibleDatedTasks.find(
      (task) => task.dateKey === dateKey,
    );
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

    if (typeof window !== "undefined") {
      const hasCalendarSheetState =
        window.history.state?.calendarSheet === calendarSheetStateKey;
      if (hasCalendarSheetState) {
        window.history.back();
        return;
      }
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
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
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
        className="inset-x-0 bottom-0 top-auto left-0 right-0 z-1500 h-[min(94vh,920px)] max-w-none rounded-t-2xl overflow-hidden"
      >
        <div className="flex h-full min-h-0 flex-col">
          {calendarError ? (
            <Alert variant="error">{calendarError}</Alert>
          ) : null}
          {datedTasks.length > 0 ? (
            <div
              className={clsx(
                "min-h-0 flex-1",
                isWideLayout
                  ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
                  : "flex flex-col gap-3",
              )}
            >
              <div
                data-vaul-no-drag
                onTouchStart={handleCalendarTouchStart}
                onTouchEnd={handleCalendarTouchEnd}
                onWheel={handleCalendarWheel}
                className={clsx(
                  "w-full",
                  isWideLayout && "sticky top-0 self-start",
                )}
              >
                <Calendar
                  className="w-full"
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={handleSelectCalendarDate}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={{ hasTask: calendarTaskDates }}
                  components={{
                    DayButton: (props) => {
                      const dateKey = formatTaskDate(props.day.date);
                      const colors = dateDotColors[dateKey] ?? [];
                      return (
                        <DayPickerDayButton {...props}>
                          <span className="relative flex h-full w-full items-center justify-center">
                            <span className={clsx(colors.length > 0 && "pb-2")}>
                              {props.day.date.getDate()}
                            </span>
                            {colors.length > 0 ? (
                              <span className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                                {colors.map((color, index) => (
                                  <span
                                    key={`${dateKey}-${color}-${index}`}
                                    className="h-1.5 w-1.5 rounded-full border border-gray-900 dark:border-gray-50"
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
              <div className="min-h-0 h-full overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
                {visibleDatedTasks.length > 0 ? (
                  visibleDatedTasks.map((task) => {
                    const taskId = getDatedTaskId(task);
                    return (
                      <CalendarTaskItem
                        key={taskId}
                        task={task}
                        onOpenTaskList={handleOpenTaskListFromCalendar}
                        isHighlighted={selectedCalendarDateKey === task.dateKey}
                        itemRef={(element) => {
                          datedTaskRefs.current[taskId] = element;
                        }}
                      />
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-gray-600 dark:text-gray-300">
                    {t("app.calendarNoDatedTasks")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("app.calendarNoDatedTasks")}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
