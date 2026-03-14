import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  type CalendarProps as ReactNativeCalendarProps,
  type DateData,
} from "react-native-calendars";
import { Carousel } from "../ui/Carousel";
import { AppIcon } from "../ui/AppIcon";
import type { TaskList } from "@lightlist/sdk/types";
import { formatDate, parseISODate } from "@lightlist/sdk/utils/dateParser";
import { themes } from "../../styles/theme";

type CalendarSheetProps = {
  isWideLayout: boolean;
  taskLists: TaskList[];
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
};

type DatedTask = {
  id: string;
  taskListId: string;
  taskListName: string;
  taskListBackground: string;
  task: TaskList["tasks"][number];
  dateValue: Date;
  dateKey: string;
  monthKey: string;
};

type CalendarMarkedDate = {
  today?: boolean;
  inactive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  marked?: boolean;
  dots?: { key: string; color: string }[];
};

type CalendarDayComponentProps = ComponentProps<
  NonNullable<ReactNativeCalendarProps["dayComponent"]>
>;

type VisibleCalendarTask = DatedTask & {
  dateLabel: string;
  taskListColor: string;
};

const resolveTaskListBackground = (
  background: string | null,
  isDark: boolean,
): string =>
  background ?? (isDark ? themes.dark.background : themes.light.background);

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const shiftMonth = (date: Date, offset: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const formatTaskDateLabel = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);

export function CalendarSheet({
  isWideLayout,
  taskLists,
  onSelectTaskList,
  onCloseDrawer,
}: CalendarSheetProps) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [selectedCalendarMonthKey, setSelectedCalendarMonthKey] = useState<
    string | null
  >(null);
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<
    string | null
  >(null);
  const lastCalendarIndexRef = useRef(0);
  const calendarListRefs = useRef<
    Record<string, FlatList<VisibleCalendarTask> | null>
  >({});

  const datedTasks = useMemo<DatedTask[]>(() => {
    const collected: DatedTask[] = [];
    for (const taskList of taskLists) {
      for (const task of taskList.tasks) {
        if (task.completed) continue;
        const parsedDate = parseISODate(task.date ?? "");
        if (!parsedDate) continue;
        const dateKey = formatDate(parsedDate);
        collected.push({
          id: `${taskList.id}:${task.id}`,
          taskListId: taskList.id,
          taskListName: taskList.name,
          taskListBackground: resolveTaskListBackground(
            taskList.background,
            isDark,
          ),
          task,
          dateValue: parsedDate,
          dateKey,
          monthKey: formatMonthKey(parsedDate),
        });
      }
    }

    collected.sort((left, right) => {
      const byDate = left.dateValue.getTime() - right.dateValue.getTime();
      if (byDate !== 0) return byDate;
      const byTaskText = left.task.text.localeCompare(right.task.text);
      if (byTaskText !== 0) return byTaskText;
      return left.taskListName.localeCompare(right.taskListName);
    });

    return collected;
  }, [taskLists, isDark]);

  const calendarMonths = useMemo<Date[]>(() => {
    const currentMonth = new Date();
    const currentMonthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );

    const firstTask = datedTasks[0];
    const lastTask = datedTasks[datedTasks.length - 1];

    if (!firstTask || !lastTask) {
      return [currentMonthStart];
    }

    const startMonth = shiftMonth(
      new Date(
        firstTask.dateValue.getFullYear(),
        firstTask.dateValue.getMonth(),
        1,
      ),
      -1,
    );
    const endMonth = shiftMonth(
      new Date(
        lastTask.dateValue.getFullYear(),
        lastTask.dateValue.getMonth(),
        1,
      ),
      1,
    );

    const months: Date[] = [];
    for (
      let monthCursor = startMonth;
      monthCursor <= endMonth;
      monthCursor = shiftMonth(monthCursor, 1)
    ) {
      months.push(monthCursor);
    }

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
      if (!map[task.monthKey]) {
        map[task.monthKey] = [];
      }
      map[task.monthKey].push(task);
    }
    return map;
  }, [datedTasks]);

  const monthDateDotColors = useMemo<
    Record<string, Record<string, string[]>>
  >(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const [monthKey, monthTasks] of Object.entries(datedTasksByMonth)) {
      const monthDots: Record<string, string[]> = {};
      for (const task of monthTasks) {
        if (!monthDots[task.dateKey]) {
          monthDots[task.dateKey] = [];
        }
        const color = task.taskListBackground;
        if (monthDots[task.dateKey].includes(color)) {
          continue;
        }
        if (monthDots[task.dateKey].length < 3) {
          monthDots[task.dateKey].push(color);
        }
      }
      map[monthKey] = monthDots;
    }
    return map;
  }, [datedTasksByMonth]);

  const calendarMonthKeys = useMemo(() => {
    return calendarMonths.map((month) => formatMonthKey(month));
  }, [calendarMonths]);

  const calendarIndex = useMemo(() => {
    if (calendarMonthKeys.length === 0) return 0;
    if (selectedCalendarMonthKey) {
      const matchedIndex = calendarMonthKeys.indexOf(selectedCalendarMonthKey);
      if (matchedIndex >= 0) {
        return matchedIndex;
      }
    }
    const currentMonthKey = formatMonthKey(new Date());
    const currentMonthIndex = calendarMonthKeys.indexOf(currentMonthKey);
    if (currentMonthIndex >= 0) {
      return currentMonthIndex;
    }
    return Math.min(lastCalendarIndexRef.current, calendarMonthKeys.length - 1);
  }, [calendarMonthKeys, selectedCalendarMonthKey]);

  useEffect(() => {
    if (calendarMonthKeys.length === 0) {
      setSelectedCalendarMonthKey(null);
      return;
    }
    if (
      selectedCalendarMonthKey &&
      calendarMonthKeys.includes(selectedCalendarMonthKey)
    ) {
      return;
    }
    const currentMonthKey = formatMonthKey(new Date());
    const fallbackIndex = Math.min(
      lastCalendarIndexRef.current,
      calendarMonthKeys.length - 1,
    );
    const fallbackMonthKey =
      calendarMonthKeys[Math.max(fallbackIndex, 0)] ??
      (calendarMonthKeys.includes(currentMonthKey)
        ? currentMonthKey
        : calendarMonthKeys[0]) ??
      null;
    setSelectedCalendarMonthKey(fallbackMonthKey);
  }, [calendarMonthKeys, selectedCalendarMonthKey]);

  useEffect(() => {
    lastCalendarIndexRef.current = calendarIndex;
  }, [calendarIndex]);

  const currentLanguage = i18n.language;
  const calendarTasksByMonth = useMemo<
    Record<string, VisibleCalendarTask[]>
  >(() => {
    const map: Record<string, VisibleCalendarTask[]> = {};
    for (const [monthKey, monthTasks] of Object.entries(datedTasksByMonth)) {
      map[monthKey] = monthTasks.map((task) => ({
        ...task,
        dateLabel: formatTaskDateLabel(task.dateValue, currentLanguage),
        taskListColor: task.taskListBackground,
      }));
    }
    return map;
  }, [datedTasksByMonth, currentLanguage]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: "transparent",
      calendarBackground: "transparent",
      textSectionTitleColor: isDark
        ? themes.dark.placeholder
        : themes.light.placeholder,
      monthTextColor: isDark ? themes.dark.text : themes.light.text,
      dayTextColor: isDark ? themes.dark.text : themes.light.text,
      textDisabledColor: isDark
        ? themes.dark.placeholder
        : themes.light.placeholder,
      selectedDayBackgroundColor: isDark
        ? themes.dark.primary
        : themes.light.primary,
      selectedDayTextColor: isDark
        ? themes.dark.primaryText
        : themes.light.primaryText,
      todayTextColor: isDark ? themes.dark.text : themes.light.text,
      dotColor: isDark ? themes.dark.primary : themes.light.primary,
      textDayFontFamily: "Inter_500Medium",
      textMonthFontFamily: "Inter_600SemiBold",
      textDayHeaderFontFamily: "Inter_500Medium",
      textDayFontSize: 14,
      textMonthFontSize: 14,
      textDayHeaderFontSize: 12,
    }),
    [isDark],
  );

  const getMarkedDatesForMonth = useCallback(
    (monthKey: string, dateDotColors: Record<string, string[]>) => {
      const marked: Record<string, CalendarMarkedDate> = {};
      for (const [dateKey, colors] of Object.entries(dateDotColors)) {
        marked[dateKey] = {
          marked: colors.length > 0,
          dots: colors.map((color, index) => ({
            key: `${dateKey}-${index}`,
            color,
          })),
        };
      }
      if (
        selectedCalendarDateKey &&
        selectedCalendarDateKey.startsWith(`${monthKey}-`)
      ) {
        marked[selectedCalendarDateKey] = {
          ...(marked[selectedCalendarDateKey] ?? {}),
          selected: true,
          selectedColor: isDark ? themes.dark.primary : themes.light.primary,
          selectedTextColor: isDark
            ? themes.dark.primaryText
            : themes.light.primaryText,
        };
      }
      return marked;
    },
    [isDark, selectedCalendarDateKey],
  );

  const renderCalendarDay = useCallback((props: CalendarDayComponentProps) => {
    const { date, marking, state, onPress } = props;
    if (!date) {
      return <View className="h-9 w-9" />;
    }

    const isSelected = Boolean(marking?.selected) || state === "selected";
    const isDisabled =
      typeof marking?.disabled === "boolean"
        ? marking.disabled
        : state === "disabled";
    const isInactive =
      typeof marking?.inactive === "boolean"
        ? marking.inactive
        : state === "inactive";
    const isToday =
      typeof marking?.today === "boolean" ? marking.today : state === "today";
    const dotItems = marking?.dots ?? [];
    const isMuted = isDisabled || isInactive;

    return (
      <Pressable
        accessibilityRole={isDisabled ? undefined : "button"}
        accessibilityState={{ disabled: isDisabled, selected: isSelected }}
        onPress={() => onPress?.(date)}
        disabled={isDisabled}
        className={`h-9 w-9 items-center justify-center rounded-[8px] ${
          isSelected
            ? "bg-primary dark:bg-primary-dark"
            : isToday
              ? "border border-border dark:border-border-dark"
              : ""
        }`}
      >
        <Text
          className={`text-[14px] font-inter-medium ${
            isSelected
              ? "text-primaryText dark:text-primaryText-dark"
              : isMuted
                ? "text-placeholder dark:text-placeholder-dark opacity-50"
                : "text-text dark:text-text-dark"
          } ${dotItems.length > 0 ? "pb-2" : ""}`}
        >
          {date.day}
        </Text>
        {dotItems.length > 0 ? (
          <View className="absolute bottom-1 w-full flex-row items-center justify-center gap-0.5">
            {dotItems.slice(0, 3).map((dot, index) => (
              <View
                key={`${date.dateString}-${dot.color}-${index}`}
                className="h-1.5 w-1.5 rounded-full border border-primary dark:border-primary-dark"
                style={{ backgroundColor: dot.color }}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    );
  }, []);

  const handleSelectCalendarDate = useCallback(
    (dateKey: string, monthTasks: VisibleCalendarTask[], monthKey: string) => {
      setSelectedCalendarDateKey(dateKey);
      const targetIndex = monthTasks.findIndex(
        (task) => task.dateKey === dateKey,
      );
      if (targetIndex < 0) return;

      requestAnimationFrame(() => {
        calendarListRefs.current[monthKey]?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.45,
        });
      });
    },
    [],
  );

  const handleOpenTaskListFromCalendar = useCallback(
    (taskListId: string) => {
      setCalendarSheetOpen(false);
      if (isWideLayout) {
        onSelectTaskList(taskListId);
        return;
      }
      onCloseDrawer();
      onSelectTaskList(taskListId);
    },
    [isWideLayout, onSelectTaskList, onCloseDrawer],
  );

  const handleOpenCalendarSheet = useCallback(() => {
    if (!selectedCalendarMonthKey) {
      const currentMonthKey = formatMonthKey(new Date());
      const currentMonthIndex = calendarMonthKeys.indexOf(currentMonthKey);
      const initialIndex =
        currentMonthIndex >= 0
          ? currentMonthIndex
          : Math.min(
              lastCalendarIndexRef.current,
              calendarMonthKeys.length - 1,
            );
      const initialMonthKey =
        calendarMonthKeys[Math.max(initialIndex, 0)] ?? null;
      if (initialMonthKey) {
        lastCalendarIndexRef.current = Math.max(initialIndex, 0);
        setSelectedCalendarMonthKey(initialMonthKey);
      }
    }
    setSelectedCalendarDateKey(null);
    setCalendarSheetOpen(true);
  }, [calendarMonthKeys, selectedCalendarMonthKey]);

  const handleCloseCalendarSheet = useCallback(() => {
    setCalendarSheetOpen(false);
  }, []);

  const handleCalendarIndexChange = useCallback(
    (nextIndex: number) => {
      const monthKey = calendarMonthKeys[nextIndex];
      if (!monthKey) return;
      if (monthKey === selectedCalendarMonthKey) return;
      lastCalendarIndexRef.current = nextIndex;
      setSelectedCalendarMonthKey(monthKey);
      setSelectedCalendarDateKey(null);
    },
    [calendarMonthKeys, selectedCalendarMonthKey],
  );

  const keyExtractorDatedTask = useCallback((item: VisibleCalendarTask) => {
    return item.id;
  }, []);

  const renderCalendarTask = useCallback(
    ({
      item,
      monthKey,
      monthTasks,
    }: {
      item: VisibleCalendarTask;
      monthKey: string;
      monthTasks: VisibleCalendarTask[];
    }) => {
      const isHighlighted = selectedCalendarDateKey === item.dateKey;
      return (
        <View
          className={`flex-row items-start gap-2 border-b border-border dark:border-border-dark px-3 py-2 ${
            isHighlighted ? "bg-background dark:bg-background-dark" : ""
          }`}
        >
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.dateLabel}
                onPress={() =>
                  handleSelectCalendarDate(item.dateKey, monthTasks, monthKey)
                }
              >
                <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
                  {item.dateLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.taskListName}
                onPress={() => handleOpenTaskListFromCalendar(item.taskListId)}
                className="min-w-0 flex-row items-center gap-2"
              >
                <View
                  style={{ backgroundColor: item.taskListColor }}
                  className="h-4 w-4 rounded-full border border-border dark:border-border-dark"
                />
                <Text
                  className="shrink text-[12px] font-inter-semibold text-text dark:text-text-dark"
                  numberOfLines={1}
                >
                  {item.taskListName}
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.task.text}
              onPress={() =>
                handleSelectCalendarDate(item.dateKey, monthTasks, monthKey)
              }
            >
              <Text
                className="text-[16px] leading-6 font-inter-medium text-text dark:text-text-dark"
                numberOfLines={2}
              >
                {item.task.text}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [
      handleOpenTaskListFromCalendar,
      handleSelectCalendarDate,
      selectedCalendarDateKey,
    ],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("app.calendarCheckButton")}
        onPress={handleOpenCalendarSheet}
        className="mb-4 flex-row items-center justify-center gap-2 rounded-[12px] border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-2 shadow-sm active:opacity-90"
      >
        <AppIcon
          name="calendar-today"
          size={20}
          className="fill-text dark:fill-text-dark"
        />
        <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
          {t("app.calendarCheckButton")}
        </Text>
      </Pressable>

      <Modal
        visible={calendarSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCalendarSheet}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={handleCloseCalendarSheet}
            className="absolute inset-0 bg-black/40"
          />
          <View className="h-[94%] rounded-t-[16px] bg-surface dark:bg-surface-dark overflow-hidden">
            <View className="flex-1 min-h-0 px-4 pt-4 pb-6">
              <View className="mb-2 flex-row justify-end">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  onPress={handleCloseCalendarSheet}
                  className="rounded-[12px] p-2 items-center justify-center active:opacity-90"
                >
                  <AppIcon
                    name="close"
                    className="fill-text dark:fill-text-dark"
                  />
                </Pressable>
              </View>

              {datedTasks.length > 0 ? (
                <Carousel
                  style={{ flex: 1 }}
                  index={calendarIndex}
                  onIndexChange={handleCalendarIndexChange}
                  showIndicators={calendarMonths.length > 1}
                  indicatorPosition="top"
                  indicatorInFlow
                >
                  {calendarMonths.map((calendarMonth) => {
                    const monthKey = formatMonthKey(calendarMonth);
                    const visibleCalendarTasks =
                      calendarTasksByMonth[monthKey] ?? [];
                    const dateDotColors = monthDateDotColors[monthKey] ?? {};
                    const markedDates = getMarkedDatesForMonth(
                      monthKey,
                      dateDotColors,
                    );

                    return (
                      <View
                        key={monthKey}
                        className={`h-full min-h-0 pb-12 ${
                          isWideLayout ? "flex-row gap-3" : "flex-col gap-3"
                        }`}
                      >
                        <View className={isWideLayout ? "w-[43%]" : "w-full"}>
                          <Calendar
                            style={{ paddingHorizontal: 8, paddingBottom: 8 }}
                            current={`${monthKey}-01`}
                            onDayPress={(day: DateData) =>
                              handleSelectCalendarDate(
                                day.dateString,
                                visibleCalendarTasks,
                                monthKey,
                              )
                            }
                            hideArrows
                            disableMonthChange
                            hideExtraDays
                            firstDay={1}
                            markingType="multi-dot"
                            markedDates={markedDates}
                            theme={calendarTheme}
                            dayComponent={renderCalendarDay}
                          />
                        </View>
                        <View className="min-h-0 flex-1 rounded-[12px] border border-border dark:border-border-dark overflow-hidden">
                          {visibleCalendarTasks.length > 0 ? (
                            <FlatList
                              ref={(instance) => {
                                calendarListRefs.current[monthKey] = instance;
                              }}
                              data={visibleCalendarTasks}
                              keyExtractor={keyExtractorDatedTask}
                              showsVerticalScrollIndicator={false}
                              onScrollToIndexFailed={(info) => {
                                calendarListRefs.current[
                                  monthKey
                                ]?.scrollToOffset({
                                  offset: info.averageItemLength * info.index,
                                  animated: true,
                                });
                              }}
                              renderItem={({ item }) =>
                                renderCalendarTask({
                                  item,
                                  monthKey,
                                  monthTasks: visibleCalendarTasks,
                                })
                              }
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center p-4">
                              <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
                                {t("app.calendarNoDatedTasks")}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </Carousel>
              ) : (
                <View className="flex-1 items-center justify-center p-4">
                  <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
                    {t("app.calendarNoDatedTasks")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
