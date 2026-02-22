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
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useTranslation } from "react-i18next";
import ReorderableList, {
  type ReorderableListRenderItem,
  type ReorderableListReorderEvent,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import {
  Calendar,
  type CalendarProps as ReactNativeCalendarProps,
  type DateData,
} from "react-native-calendars";
import { Gesture } from "react-native-gesture-handler";
import { AppIcon } from "../ui/AppIcon";
import { Carousel } from "../ui/Carousel";
import { Dialog } from "../ui/Dialog";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { formatDate, parseISODate } from "@lightlist/sdk/utils/dateParser";
import { themes } from "../../styles/theme";

export type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  showCreateListDialog: boolean;
  onCreateListDialogChange: (open: boolean) => void;
  createListInput: string;
  onCreateListInputChange: (value: string) => void;
  createListBackground: string | null;
  onCreateListBackgroundChange: (color: string | null) => void;
  colors: ColorOption[];
  onCreateList: () => void | Promise<void>;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  onReorderTaskList: (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  showJoinListDialog: boolean;
  onJoinListDialogChange: (open: boolean) => void;
  joinListInput: string;
  onJoinListInputChange: (value: string) => void;
  onJoinList: () => void | Promise<void>;
  joinListError: string | null;
  joiningList: boolean;
};

type DatedTask = {
  id: string;
  taskListId: string;
  taskListName: string;
  taskListBackground: string;
  task: Task;
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

const noop = () => {};
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

export const DrawerPanel = (props: DrawerPanelProps) => {
  const {
    isWideLayout,
    userEmail,
    showCreateListDialog,
    onCreateListDialogChange,
    createListInput,
    onCreateListInputChange,
    createListBackground,
    onCreateListBackgroundChange,
    colors,
    onCreateList,
    hasTaskLists,
    taskLists,
    onReorderTaskList,
    selectedTaskListId,
    onSelectTaskList,
    onCloseDrawer,
    onOpenSettings,
    showJoinListDialog,
    onJoinListDialogChange,
    joinListInput,
    onJoinListInputChange,
    onJoinList,
    joinListError,
    joiningList,
  } = props;

  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const canCreateList = createListInput.trim().length > 0;
  const canJoinList = !joiningList && joinListInput.trim().length > 0;
  const canDragList = hasTaskLists && taskLists.length > 1;
  const listPanGesture = useMemo(
    () => Gesture.Pan().activeOffsetY([-12, 12]).failOffsetX([-24, 24]),
    [],
  );

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
  const moveUpLabel = t("app.moveUp");
  const moveDownLabel = t("app.moveDown");
  const taskListNameLabel = t("app.taskListName");
  const reorderLabel = t("taskList.reorder");

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: "transparent",
      calendarBackground: "transparent",
      textSectionTitleColor: isDark ? "#9CA3AF" : "#6B7280",
      monthTextColor: isDark ? "#F9FAFB" : "#111827",
      dayTextColor: isDark ? "#F9FAFB" : "#111827",
      textDisabledColor: isDark ? "#6B7280" : "#9CA3AF",
      selectedDayBackgroundColor: isDark ? "#F9FAFB" : "#111827",
      selectedDayTextColor: isDark ? "#111827" : "#F9FAFB",
      todayTextColor: isDark ? "#F9FAFB" : "#111827",
      dotColor: isDark ? "#F9FAFB" : "#111827",
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
            ? "bg-[#111827] dark:bg-[#F9FAFB]"
            : isToday
              ? "border border-[#D1D5DB] dark:border-[#374151]"
              : ""
        }`}
      >
        <Text
          className={`text-[14px] font-inter-medium ${
            isSelected
              ? "text-[#F9FAFB] dark:text-[#111827]"
              : isMuted
                ? "text-[#9CA3AF] dark:text-[#6B7280] opacity-50"
                : "text-[#111827] dark:text-[#F9FAFB]"
          } ${dotItems.length > 0 ? "pb-2" : ""}`}
        >
          {date.day}
        </Text>
        {dotItems.length > 0 ? (
          <View className="absolute bottom-1 w-full flex-row items-center justify-center gap-0.5">
            {dotItems.slice(0, 3).map((dot, index) => (
              <View
                key={`${date.dateString}-${dot.color}-${index}`}
                className="h-1.5 w-1.5 rounded-full border border-[#111827] dark:border-[#F9FAFB]"
                style={{ backgroundColor: dot.color }}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    );
  }, []);

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    await onCreateList();
  };

  const handleJoinListSubmit = async () => {
    if (!canJoinList) return;
    await onJoinList();
  };

  const handleSelectTaskList = useCallback(
    (taskListId: string) => {
      onSelectTaskList(taskListId);
      onCloseDrawer();
    },
    [onCloseDrawer, onSelectTaskList],
  );

  const handleOpenSettings = useCallback(() => {
    onCloseDrawer();
    onOpenSettings();
  }, [onCloseDrawer, onOpenSettings]);

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
      onSelectTaskList(taskListId);
      setCalendarSheetOpen(false);
      if (!isWideLayout) {
        onCloseDrawer();
      }
    },
    [isWideLayout, onCloseDrawer, onSelectTaskList],
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
  const keyExtractorTaskList = useCallback((item: TaskList) => {
    return item.id;
  }, []);
  const handleTaskListReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const draggedList = taskLists[from];
      const targetList = taskLists[to];
      if (!draggedList || !targetList || from === to) return;
      void onReorderTaskList(draggedList.id, targetList.id);
    },
    [onReorderTaskList, taskLists],
  );
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
          className={`flex-row items-start gap-2 border-b border-[#E5E7EB] px-3 py-2 dark:border-[#1F2937] ${
            isHighlighted ? "bg-[#F3F4F6] dark:bg-[#1F2937]" : ""
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
                <Text className="text-[12px] font-inter text-[#4B5563] dark:text-[#D1D5DB]">
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
                  className="h-4 w-4 rounded-full border border-[#D1D5DB] dark:border-[#374151]"
                />
                <Text
                  className="shrink text-[12px] font-inter-semibold text-[#374151] dark:text-[#E5E7EB]"
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
                className="text-[16px] leading-6 font-inter-medium text-[#111827] dark:text-[#F9FAFB]"
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
  const TaskListRow = ({ item, index }: { item: TaskList; index: number }) => {
    const drag = useReorderableDrag();
    const isDragActive = useIsActive();
    const isSelected = item.id === selectedTaskListId;
    const currentIndex = index;
    const canMoveListUp = canDragList && currentIndex > 0;
    const canMoveListDown =
      canDragList && currentIndex >= 0 && currentIndex < taskLists.length - 1;
    const accessibilityActions: { name: string; label: string }[] = [];

    if (canMoveListUp) {
      accessibilityActions.push({
        name: "moveUp",
        label: moveUpLabel,
      });
    }
    if (canMoveListDown) {
      accessibilityActions.push({
        name: "moveDown",
        label: moveDownLabel,
      });
    }

    const handleMoveListByOffset = (offset: number) => {
      if (!canDragList || currentIndex < 0) return;
      const targetList = taskLists[currentIndex + offset];
      if (!targetList) return;
      void onReorderTaskList(item.id, targetList.id);
    };

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={item.name || taskListNameLabel}
        onPress={() => handleSelectTaskList(item.id)}
        className={`rounded-[10px] border border-transparent p-2 flex-row items-center gap-2 active:opacity-90 ${
          isSelected
            ? "bg-input-background dark:bg-input-background-dark"
            : "bg-transparent"
        } ${isDragActive ? "opacity-50" : ""}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reorderLabel}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "moveUp") {
              handleMoveListByOffset(-1);
              return;
            }
            if (event.nativeEvent.actionName === "moveDown") {
              handleMoveListByOffset(1);
            }
          }}
          onPressIn={canDragList ? drag : undefined}
          onPress={noop}
          disabled={!canDragList}
          className="rounded-[10px] p-1 items-center justify-center active:opacity-80"
        >
          <AppIcon
            name="drag-indicator"
            className={
              canDragList
                ? "fill-text dark:fill-text-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
        </Pressable>
        <View
          style={
            item.background ? { backgroundColor: item.background } : undefined
          }
          className={`w-3 h-3 rounded-full border border-border dark:border-border-dark ${
            !item.background ? "bg-background dark:bg-background-dark" : ""
          }`}
        />
        <View className="flex-1 gap-0.5">
          <Text
            className={`text-[14px] font-inter-semibold text-text dark:text-text-dark ${
              isSelected ? "font-inter-bold" : ""
            }`}
            numberOfLines={1}
          >
            {item.name || taskListNameLabel}
          </Text>
          <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
            {t("taskList.taskCount", {
              count: item.tasks.length,
            })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderTaskListItem: ReorderableListRenderItem<TaskList> = ({
    item,
    index,
  }) => {
    return <TaskListRow item={item} index={index} />;
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark p-4">
      <View className="flex-row items-center justify-between gap-2 mb-4">
        <View className="flex-1 min-w-0">
          <Text
            className="text-[18px] font-inter-bold text-text dark:text-text-dark"
            numberOfLines={1}
          >
            {userEmail}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
            onPress={handleOpenSettings}
            className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
          >
            <AppIcon
              name="settings"
              className="fill-text dark:fill-text-dark"
            />
          </Pressable>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={onCloseDrawer}
              className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
            >
              <AppIcon name="close" className="fill-text dark:fill-text-dark" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("app.calendarCheckButton")}
        onPress={handleOpenCalendarSheet}
        className="mb-4 flex-row items-center justify-center gap-2 rounded-[12px] border border-[#D1D5DB] bg-[#FFFFFF] px-4 py-2 shadow-sm active:opacity-90 dark:border-[#374151] dark:bg-[#111827]"
      >
        <AppIcon
          name="calendar-today"
          size={20}
          className="fill-text dark:fill-text-dark"
        />
        <Text className="text-[14px] font-inter-semibold text-[#111827] dark:text-[#F9FAFB]">
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
            className="absolute inset-0 bg-black/45"
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
                        <View className="min-h-0 flex-1 rounded-[12px] border border-[#E5E7EB] dark:border-[#1F2937] overflow-hidden">
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

      <ReorderableList
        data={taskLists}
        keyExtractor={keyExtractorTaskList}
        onReorder={handleTaskListReorder}
        panGesture={listPanGesture}
        dragEnabled={canDragList}
        shouldUpdateActiveItem
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
        ListFooterComponent={
          <View className="mb-6">
            <View className="flex-row gap-2 mt-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.createNew")}
                onPress={() => onCreateListDialogChange(true)}
                className="flex-1 rounded-[12px] py-3.5 items-center bg-primary dark:bg-primary-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-primary-text dark:text-primary-text-dark">
                  {t("app.createNew")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.joinList")}
                onPress={() => onJoinListDialogChange(true)}
                className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3.5 items-center bg-surface dark:bg-surface-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                  {t("app.joinList")}
                </Text>
              </Pressable>
            </View>
            <Dialog
              open={showJoinListDialog}
              onOpenChange={onJoinListDialogChange}
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.cancel")}
                    onPress={() => onJoinListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.join")}
                    onPress={handleJoinListSubmit}
                    disabled={!canJoinList}
                    className={`flex-1 rounded-[12px] py-3.5 items-center active:opacity-90 ${
                      canJoinList
                        ? "bg-primary dark:bg-primary-dark"
                        : "bg-border dark:bg-border-dark"
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-inter-semibold ${
                        canJoinList
                          ? "text-primary-text dark:text-primary-text-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {joiningList ? t("app.joining") : t("app.join")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("pages.sharecode.codeLabel")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={joinListInput}
                    onChangeText={onJoinListInputChange}
                    placeholder={t("pages.sharecode.codePlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleJoinListSubmit}
                    editable={!joiningList}
                    accessibilityLabel={t("pages.sharecode.codeLabel")}
                    autoFocus
                  />
                  {joinListError ? (
                    <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
                      {joinListError}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Dialog>
            <Dialog
              open={showCreateListDialog}
              onOpenChange={onCreateListDialogChange}
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.cancel")}
                    onPress={() => onCreateListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.create")}
                    onPress={handleCreateListSubmit}
                    disabled={!canCreateList}
                    className={`flex-1 rounded-[12px] py-3.5 items-center active:opacity-90 ${
                      canCreateList
                        ? "bg-primary dark:bg-primary-dark"
                        : "bg-border dark:bg-border-dark"
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-inter-semibold ${
                        canCreateList
                          ? "text-primary-text dark:text-primary-text-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {t("app.create")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("app.taskListName")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={createListInput}
                    onChangeText={onCreateListInputChange}
                    placeholder={t("app.taskListNamePlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateListSubmit}
                    editable
                    accessibilityLabel={t("app.taskListName")}
                    autoFocus
                  />
                </View>
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("taskList.selectColor")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {colors.map((option) => {
                      const isSelected = option.value === createListBackground;
                      const previewColor = option.preview ?? option.value;
                      const label =
                        option.label ??
                        option.shortLabel ??
                        (option.value
                          ? t("taskList.selectColor")
                          : t("taskList.backgroundNone"));

                      return (
                        <Pressable
                          key={`create-${option.value ?? "none"}`}
                          accessibilityRole="button"
                          accessibilityLabel={label}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() =>
                            onCreateListBackgroundChange(option.value)
                          }
                          style={
                            previewColor
                              ? { backgroundColor: previewColor }
                              : undefined
                          }
                          className={`w-[30px] h-[30px] rounded-full justify-center items-center border ${
                            isSelected
                              ? "border-primary dark:border-primary-dark border-2"
                              : "border-border dark:border-border-dark"
                          } ${!previewColor ? "bg-background dark:bg-background-dark" : ""}`}
                        >
                          {option.shortLabel ? (
                            <Text className="text-[10px] font-inter-semibold text-text dark:text-text-dark">
                              {option.shortLabel}
                            </Text>
                          ) : null}
                          {!option.value && !option.shortLabel && (
                            <AppIcon
                              name="close"
                              className={
                                isSelected
                                  ? "fill-primary dark:fill-primary-dark"
                                  : "fill-muted dark:fill-muted-dark"
                              }
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Dialog>
          </View>
        }
        ListEmptyComponent={
          <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </Text>
        }
        renderItem={renderTaskListItem}
      />
    </View>
  );
};
