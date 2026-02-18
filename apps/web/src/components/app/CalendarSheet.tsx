import type { TFunction } from "i18next";
import type { TaskList } from "@lightlist/sdk/types";
import { addMonths } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { DayButton as DayPickerDayButton } from "react-day-picker";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { Carousel } from "@/components/ui/Carousel";

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

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

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
  const [calendarIndex, setCalendarIndex] = useState(0);
  const [calendarError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasInitializedCalendarIndexRef = useRef(false);

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
    const hasCurrentMonth = months.some(
      (month) => formatMonthKey(month) === formatMonthKey(currentMonthStart),
    );
    if (!hasCurrentMonth) {
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
        if (monthDotColors[task.dateKey].includes(task.taskListBackground)) {
          continue;
        }
        if (monthDotColors[task.dateKey].length < 3) {
          monthDotColors[task.dateKey].push(task.taskListBackground);
        }
      }
      map[monthKey] = monthDotColors;
    }
    return map;
  }, [datedTasksByMonth]);

  useEffect(() => {
    if (calendarMonths.length === 0) {
      setCalendarIndex(0);
      hasInitializedCalendarIndexRef.current = false;
      return;
    }
    const currentMonthKey = formatMonthKey(new Date());
    setCalendarIndex((currentIndex) => {
      if (!hasInitializedCalendarIndexRef.current) {
        hasInitializedCalendarIndexRef.current = true;
        const currentMonthIndex = calendarMonths.findIndex(
          (month) => formatMonthKey(month) === currentMonthKey,
        );
        if (currentMonthIndex >= 0) {
          return currentMonthIndex;
        }
      }
      return Math.min(currentIndex, calendarMonths.length - 1);
    });
  }, [calendarMonths]);

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

  const handleCalendarIndexChange = (nextIndex: number) => {
    setCalendarIndex(nextIndex);
    setSelectedCalendarDate(undefined);
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
            <Carousel
              className="min-h-0 flex-1"
              index={calendarIndex}
              onIndexChange={handleCalendarIndexChange}
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
                      "min-h-0 h-full pb-12",
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
                    <div
                      data-vaul-no-drag
                      className={clsx(
                        "min-h-0 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800",
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
                        <p className="p-4 text-sm text-gray-600 dark:text-gray-300">
                          {t("app.calendarNoDatedTasks")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </Carousel>
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
