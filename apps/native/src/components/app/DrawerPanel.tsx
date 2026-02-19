import { useEffect, useMemo, useRef, useState } from "react";
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
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { Calendar, type DateData } from "react-native-calendars";
import { AppIcon } from "../ui/AppIcon";
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
  colors: readonly ColorOption[];
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
  creatingList: boolean;
};

type DatedTask = {
  id: string;
  taskListId: string;
  taskListName: string;
  taskListBackground: string | null;
  task: Task;
  dateValue: Date;
  dateKey: string;
  monthKey: string;
};

type CalendarMarkedDate = {
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  marked?: boolean;
  dots?: { key: string; color: string }[];
};

const FALLBACK_DOT_COLOR = "#9CA3AF";

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const shiftMonth = (date: Date, offset: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const formatMonthTitle = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "long",
  }).format(date);

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
    creatingList,
  } = props;

  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const canCreateList = !creatingList && createListInput.trim().length > 0;
  const canJoinList = !joiningList && joinListInput.trim().length > 0;
  const canDragList = hasTaskLists && taskLists.length > 1;

  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [calendarIndex, setCalendarIndex] = useState(0);
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<
    string | null
  >(null);
  const calendarListRef = useRef<FlatList<DatedTask> | null>(null);

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
          taskListBackground: taskList.background,
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
  }, [taskLists]);

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
        const color = task.taskListBackground ?? FALLBACK_DOT_COLOR;
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

  useEffect(() => {
    if (!calendarSheetOpen) return;

    const currentMonthKey = formatMonthKey(new Date());
    const currentMonthIndex = calendarMonths.findIndex(
      (month) => formatMonthKey(month) === currentMonthKey,
    );

    setCalendarIndex(currentMonthIndex >= 0 ? currentMonthIndex : 0);
    setSelectedCalendarDateKey(null);
  }, [calendarSheetOpen, calendarMonths]);

  const currentMonth =
    calendarMonths[calendarIndex] ?? calendarMonths[0] ?? new Date();
  const currentMonthKey = currentMonth
    ? formatMonthKey(currentMonth)
    : formatMonthKey(new Date());
  const visibleDatedTasks = datedTasksByMonth[currentMonthKey] ?? [];
  const visibleDateDotColors = monthDateDotColors[currentMonthKey] ?? {};

  const markedDates = useMemo<Record<string, CalendarMarkedDate>>(() => {
    const marked: Record<string, CalendarMarkedDate> = {};

    for (const [dateKey, colors] of Object.entries(visibleDateDotColors)) {
      marked[dateKey] = {
        marked: colors.length > 0,
        dots: colors.map((color, index) => ({
          key: `${dateKey}-${index}`,
          color,
        })),
      };
    }

    if (selectedCalendarDateKey) {
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
  }, [visibleDateDotColors, selectedCalendarDateKey, isDark]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: isDark ? themes.dark.surface : themes.light.surface,
      calendarBackground: isDark ? themes.dark.surface : themes.light.surface,
      textSectionTitleColor: isDark ? themes.dark.muted : themes.light.muted,
      monthTextColor: isDark ? themes.dark.text : themes.light.text,
      dayTextColor: isDark ? themes.dark.text : themes.light.text,
      textDisabledColor: isDark ? themes.dark.placeholder : themes.light.border,
      selectedDayBackgroundColor: isDark
        ? themes.dark.primary
        : themes.light.primary,
      selectedDayTextColor: isDark
        ? themes.dark.primaryText
        : themes.light.primaryText,
      todayTextColor: isDark ? themes.dark.primary : themes.light.primary,
      dotColor: isDark ? themes.dark.primary : themes.light.primary,
    }),
    [isDark],
  );

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    await onCreateList();
  };

  const handleJoinListSubmit = async () => {
    if (!canJoinList) return;
    await onJoinList();
  };

  const handleSelectTaskList = (taskListId: string) => {
    onSelectTaskList(taskListId);
    onCloseDrawer();
  };

  const handleOpenSettings = () => {
    onCloseDrawer();
    onOpenSettings();
  };

  const handleSelectCalendarDate = (dateKey: string) => {
    setSelectedCalendarDateKey(dateKey);
    const targetIndex = visibleDatedTasks.findIndex(
      (task) => task.dateKey === dateKey,
    );
    if (targetIndex < 0) return;

    requestAnimationFrame(() => {
      calendarListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0.45,
      });
    });
  };

  const handleOpenTaskListFromCalendar = (taskListId: string) => {
    onSelectTaskList(taskListId);
    setCalendarSheetOpen(false);
    if (!isWideLayout) {
      onCloseDrawer();
    }
  };

  const canMoveToPreviousMonth = calendarIndex > 0;
  const canMoveToNextMonth = calendarIndex < calendarMonths.length - 1;

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
        onPress={() => setCalendarSheetOpen(true)}
        className="mb-4 rounded-[12px] border border-border dark:border-border-dark px-4 py-3 flex-row items-center justify-center gap-2 bg-surface dark:bg-surface-dark active:opacity-90"
      >
        <AppIcon
          name="calendar-today"
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
        onRequestClose={() => setCalendarSheetOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={() => setCalendarSheetOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <View className="max-h-[92%] rounded-t-[20px] border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 pt-4 pb-6 gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[18px] font-inter-bold text-text dark:text-text-dark">
                  {t("app.calendarSheetTitle")}
                </Text>
                <Text className="mt-1 text-[13px] font-inter text-muted dark:text-muted-dark">
                  {t("app.calendarSheetDescription")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={() => setCalendarSheetOpen(false)}
                className="rounded-[12px] p-2 items-center justify-center active:opacity-90"
              >
                <AppIcon
                  name="close"
                  className="fill-text dark:fill-text-dark"
                />
              </Pressable>
            </View>

            {datedTasks.length > 0 ? (
              <>
                <View className="flex-row items-center justify-between">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.back")}
                    onPress={() => {
                      if (!canMoveToPreviousMonth) return;
                      setCalendarIndex((current) => current - 1);
                      setSelectedCalendarDateKey(null);
                    }}
                    disabled={!canMoveToPreviousMonth}
                    className={`rounded-[10px] p-2 items-center justify-center active:opacity-90 ${
                      canMoveToPreviousMonth ? "opacity-100" : "opacity-35"
                    }`}
                  >
                    <AppIcon
                      name="arrow-back"
                      className="fill-text dark:fill-text-dark"
                    />
                  </Pressable>
                  <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                    {formatMonthTitle(currentMonth, i18n.language)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.next")}
                    onPress={() => {
                      if (!canMoveToNextMonth) return;
                      setCalendarIndex((current) => current + 1);
                      setSelectedCalendarDateKey(null);
                    }}
                    disabled={!canMoveToNextMonth}
                    className={`rounded-[10px] p-2 items-center justify-center active:opacity-90 ${
                      canMoveToNextMonth ? "opacity-100" : "opacity-35"
                    }`}
                  >
                    <View className="rotate-180">
                      <AppIcon
                        name="arrow-back"
                        className="fill-text dark:fill-text-dark"
                      />
                    </View>
                  </Pressable>
                </View>

                <Calendar
                  current={`${currentMonthKey}-01`}
                  onDayPress={(day: DateData) =>
                    handleSelectCalendarDate(day.dateString)
                  }
                  hideArrows
                  disableMonthChange
                  hideExtraDays
                  firstDay={1}
                  markingType="multi-dot"
                  markedDates={markedDates}
                  theme={calendarTheme}
                />

                <View className="h-[320px] rounded-[12px] border border-border dark:border-border-dark overflow-hidden">
                  {visibleDatedTasks.length > 0 ? (
                    <FlatList
                      ref={calendarListRef}
                      data={visibleDatedTasks}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={false}
                      onScrollToIndexFailed={(info) => {
                        calendarListRef.current?.scrollToOffset({
                          offset: info.averageItemLength * info.index,
                          animated: true,
                        });
                      }}
                      renderItem={({ item }) => {
                        const isHighlighted =
                          selectedCalendarDateKey === item.dateKey;
                        const dateLabel = formatTaskDateLabel(
                          item.dateValue,
                          i18n.language,
                        );
                        const taskListColor =
                          item.taskListBackground ?? FALLBACK_DOT_COLOR;

                        return (
                          <View
                            className={`border-b border-border dark:border-border-dark px-3 py-2 ${
                              isHighlighted
                                ? "bg-input-background dark:bg-input-background-dark"
                                : "bg-surface dark:bg-surface-dark"
                            }`}
                          >
                            <View className="flex-row items-center justify-between gap-3">
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={dateLabel}
                                onPress={() =>
                                  handleSelectCalendarDate(item.dateKey)
                                }
                              >
                                <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
                                  {dateLabel}
                                </Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={item.taskListName}
                                onPress={() =>
                                  handleOpenTaskListFromCalendar(
                                    item.taskListId,
                                  )
                                }
                                className="flex-row items-center gap-2"
                              >
                                <View
                                  style={{ backgroundColor: taskListColor }}
                                  className="w-3 h-3 rounded-full border border-border dark:border-border-dark"
                                />
                                <Text
                                  className="text-[12px] font-inter-semibold text-muted dark:text-muted-dark"
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
                                handleSelectCalendarDate(item.dateKey)
                              }
                              className="mt-1"
                            >
                              <Text
                                className="text-[15px] font-inter-medium text-text dark:text-text-dark"
                                numberOfLines={2}
                              >
                                {item.task.text}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center p-4">
                      <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
                        {t("app.calendarNoDatedTasks")}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View className="py-6 items-center justify-center">
                <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
                  {t("app.calendarNoDatedTasks")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <DraggableFlatList
        data={taskLists}
        keyExtractor={(item) => item.id}
        animationConfig={{ duration: 0 }}
        onDragEnd={({ from, to }) => {
          const draggedList = taskLists[from];
          const targetList = taskLists[to];
          if (!draggedList || !targetList || from === to) return;
          void onReorderTaskList(draggedList.id, targetList.id);
        }}
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
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onJoinListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("app.cancel")}
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
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onCreateListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("app.cancel")}
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
                      {creatingList ? t("app.creating") : t("app.create")}
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
                    editable={!creatingList}
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
        renderItem={({
          item,
          drag,
          isActive,
          getIndex,
        }: RenderItemParams<TaskList>) => {
          const isSelected = item.id === selectedTaskListId;
          const currentIndex =
            getIndex() ?? taskLists.findIndex((list) => list.id === item.id);
          const canMoveListUp = canDragList && currentIndex > 0;
          const canMoveListDown =
            canDragList &&
            currentIndex >= 0 &&
            currentIndex < taskLists.length - 1;
          const accessibilityActions: { name: string; label: string }[] = [];

          if (canMoveListUp) {
            accessibilityActions.push({
              name: "moveUp",
              label: t("app.moveUp"),
            });
          }
          if (canMoveListDown) {
            accessibilityActions.push({
              name: "moveDown",
              label: t("app.moveDown"),
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
              accessibilityLabel={item.name || t("app.taskListName")}
              onPress={() => handleSelectTaskList(item.id)}
              className={`rounded-[10px] border border-transparent p-2 flex-row items-center gap-2 active:opacity-90 ${
                isSelected
                  ? "bg-input-background dark:bg-input-background-dark"
                  : "bg-transparent"
              } ${isActive ? "opacity-50" : ""}`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.reorder")}
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
                onLongPress={canDragList ? drag : undefined}
                delayLongPress={150}
                onPress={() => {}}
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
                  item.background
                    ? { backgroundColor: item.background }
                    : undefined
                }
                className={`w-3 h-3 rounded-full border border-border dark:border-border-dark ${
                  !item.background
                    ? "bg-background dark:bg-background-dark"
                    : ""
                }`}
              />
              <View className="flex-1 gap-0.5">
                <Text
                  className={`text-[14px] font-inter-semibold text-text dark:text-text-dark ${
                    isSelected ? "font-inter-bold" : ""
                  }`}
                  numberOfLines={1}
                >
                  {item.name || t("app.taskListName")}
                </Text>
                <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
                  {t("taskList.taskCount", {
                    count: item.tasks.length,
                  })}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
};
