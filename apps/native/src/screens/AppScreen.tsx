import type { TFunction } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";

const arrayMove = <T,>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};
import {
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { AppIcon } from "../components/ui/AppIcon";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { styles } from "../styles/appStyles";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../components/ui/Carousel";
import { Dialog } from "../components/ui/Dialog";
import { TaskListPanel } from "../components/app/TaskListPanel";
import { listColors } from "../styles/theme";
import type { AppScreenProps } from "../types/app";

const EMPTY_TASKS: Task[] = [];
const EMPTY_TASK_LISTS: TaskList[] = [];

export const AppScreen = ({
  t,
  theme,
  taskLists,
  selectedTaskList,
  selectedTaskListId,
  appErrorMessage,
  editListName,
  editListBackground,
  newTaskText,
  isSavingList,
  isDeletingList,
  shareCode,
  shareErrorMessage,
  isGeneratingShareCode,
  isRemovingShareCode,
  onSelectTaskList,
  onChangeEditListName,
  onChangeEditListBackground,
  onChangeNewTaskText,
  onSaveList,
  onConfirmDeleteList,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onReorderTask,
  onSortTasks,
  onDeleteCompletedTasks,
  onGenerateShareCode,
  onRemoveShareCode,
}: AppScreenProps) => {
  const navigation = useNavigation();
  const canSaveList =
    Boolean(selectedTaskList) &&
    !isSavingList &&
    editListName.trim().length > 0;
  const canDeleteList = Boolean(selectedTaskList) && !isDeletingList;
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;
  const [taskListCarouselApi, setTaskListCarouselApi] =
    useState<CarouselApi | null>(null);
  const isScrollingRef = useRef(false);
  const pendingIndexRef = useRef<number | null>(null);
  const [isReorderHandleActive, setIsReorderHandleActive] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [localTasksMap, setLocalTasksMap] = useState<Record<string, Task[]>>(
    {},
  );
  const stableTaskLists = taskLists.length > 0 ? taskLists : EMPTY_TASK_LISTS;

  useEffect(() => {
    const newMap: Record<string, Task[]> = {};
    for (const tl of taskLists) {
      newMap[tl.id] = tl.tasks;
    }
    setLocalTasksMap(newMap);
  }, [taskLists]);

  const handleReorderTaskWithOptimisticUpdate = useCallback(
    async (taskListId: string, draggedTaskId: string, targetTaskId: string) => {
      const currentTasks = localTasksMap[taskListId];
      if (!currentTasks) return;

      const oldIndex = currentTasks.findIndex((t) => t.id === draggedTaskId);
      const newIndex = currentTasks.findIndex((t) => t.id === targetTaskId);

      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalTasksMap((prev) => ({
          ...prev,
          [taskListId]: arrayMove(prev[taskListId] ?? [], oldIndex, newIndex),
        }));
      }

      try {
        await onReorderTask(draggedTaskId, targetTaskId);
      } catch {
        const originalList = taskLists.find((tl) => tl.id === taskListId);
        if (originalList) {
          setLocalTasksMap((prev) => ({
            ...prev,
            [taskListId]: originalList.tasks,
          }));
        }
      }
    },
    [localTasksMap, onReorderTask, taskLists],
  );

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
    setIsReorderHandleActive(false);
  }, [selectedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const currentTasks = selectedTaskList?.tasks ?? EMPTY_TASKS;
    const exists = currentTasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, selectedTaskList?.tasks]);

  const handleEditListDialogChange = useCallback(
    (open: boolean) => {
      setIsEditListDialogOpen(open);
      if (open) return;
      if (!selectedTaskList) {
        onChangeEditListName("");
        onChangeEditListBackground(listColors[0]);
        return;
      }
      onChangeEditListName(selectedTaskList.name);
      onChangeEditListBackground(selectedTaskList.background || listColors[0]);
    },
    [selectedTaskList, onChangeEditListName, onChangeEditListBackground],
  );

  const handleShareDialogChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open);
  }, []);

  const handleEditStart = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  }, []);

  const handleEditEnd = useCallback(
    async (task: Task) => {
      if (!editingTaskId || editingTaskId !== task.id) return;

      const trimmedText = editingTaskText.trim();
      if (!trimmedText) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }
      const normalizedDate = editingTaskDate.trim();
      if (trimmedText === task.text && normalizedDate === (task.date ?? "")) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }
      await onUpdateTask(task.id, {
        text: trimmedText,
        date: normalizedDate,
      });
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
    },
    [editingTaskId, editingTaskText, editingTaskDate, onUpdateTask],
  );

  const handleDateChange = useCallback(
    async (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      await onUpdateTask(task.id, { date: normalizedDate });
    },
    [editingTaskId, onUpdateTask],
  );

  useEffect(() => {
    if (!taskListCarouselApi || stableTaskLists.length === 0) return;
    const index = stableTaskLists.findIndex(
      (taskList) => taskList.id === selectedTaskListId,
    );
    if (index >= 0) {
      if (taskListCarouselApi.getCurrentIndex() === index) return;
      taskListCarouselApi.scrollTo(index);
    }
  }, [selectedTaskListId, taskListCarouselApi, stableTaskLists]);

  const handleCarouselSelect = useCallback(
    (api: CarouselApi) => {
      if (isScrollingRef.current) {
        pendingIndexRef.current = api.selectedIndex;
        return;
      }
      const taskList = stableTaskLists[api.selectedIndex];
      if (!taskList || taskList.id === selectedTaskListId) return;
      onSelectTaskList(taskList.id);
    },
    [stableTaskLists, selectedTaskListId, onSelectTaskList],
  );

  const taskListHeader = (
    <View>
      <View style={styles.appHeader}>
        <View style={styles.appTitleRow}>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("app.drawerTitle")}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={({ pressed }) => [
                styles.headerIconButton,
                {
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <AppIcon name="menu" size={20} color={theme.text} />
            </Pressable>
          ) : null}
          <View style={styles.headerActions} />
        </View>
      </View>
      {appErrorMessage ? (
        <Text
          accessibilityRole="alert"
          style={[styles.appError, { color: theme.error }]}
        >
          {appErrorMessage}
        </Text>
      ) : null}
      {selectedTaskList ? (
        <>
          <Dialog
            open={isEditListDialogOpen}
            onOpenChange={handleEditListDialogChange}
            title={t("taskList.editDetails")}
            theme={theme}
            footer={
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.cancel")}
                  onPress={() => handleEditListDialogChange(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      flex: 1,
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: theme.text }]}
                  >
                    {t("app.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.save")}
                  onPress={onSaveList}
                  disabled={!canSaveList}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      flex: 1,
                      backgroundColor: canSaveList
                        ? theme.primary
                        : theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: canSaveList ? theme.primaryText : theme.muted,
                      },
                    ]}
                  >
                    {t("app.save")}
                  </Text>
                </Pressable>
              </>
            }
          >
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("app.taskListName")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    },
                  ]}
                  value={editListName}
                  onChangeText={onChangeEditListName}
                  placeholder={t("app.taskListNamePlaceholder")}
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={onSaveList}
                  editable={!isSavingList}
                  accessibilityLabel={t("app.taskListName")}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("taskList.selectColor")}
                </Text>
                <View style={styles.colorRow}>
                  {([null, ...listColors] as (string | null)[]).map((color) => {
                    const isSelected = color === editListBackground;
                    return (
                      <Pressable
                        key={`edit-${color ?? "none"}`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          color
                            ? t("taskList.selectColor")
                            : t("taskList.backgroundNone")
                        }
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => onChangeEditListBackground(color)}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: color || theme.background,
                            borderColor: isSelected
                              ? theme.primary
                              : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        {!color && (
                          <AppIcon
                            name="close"
                            size={16}
                            color={isSelected ? theme.primary : theme.muted}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.deleteList")}
                onPress={onConfirmDeleteList}
                disabled={!canDeleteList}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: theme.error,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: theme.error }]}
                >
                  {t("taskList.deleteList")}
                </Text>
              </Pressable>
            </View>
          </Dialog>
          <Dialog
            open={isShareDialogOpen}
            onOpenChange={handleShareDialogChange}
            title={t("taskList.shareTitle")}
            description={t("taskList.shareDescription")}
            theme={theme}
          >
            <View style={styles.form}>
              {shareCode ? (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      {t("taskList.shareCode")}
                    </Text>
                    <View
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.inputBackground,
                        },
                      ]}
                    >
                      <Text selectable style={{ color: theme.text }}>
                        {shareCode}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.removeShare")}
                    onPress={onRemoveShareCode}
                    disabled={isRemovingShareCode}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        borderColor: theme.error,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.error },
                      ]}
                    >
                      {isRemovingShareCode
                        ? t("common.loading")
                        : t("taskList.removeShare")}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.generateShare")}
                  onPress={onGenerateShareCode}
                  disabled={isGeneratingShareCode}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: isGeneratingShareCode
                        ? theme.border
                        : theme.primary,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isGeneratingShareCode
                          ? theme.muted
                          : theme.primaryText,
                      },
                    ]}
                  >
                    {isGeneratingShareCode
                      ? t("common.loading")
                      : t("taskList.generateShare")}
                  </Text>
                </Pressable>
              )}
              {shareErrorMessage ? (
                <Text style={[styles.appError, { color: theme.error }]}>
                  {shareErrorMessage}
                </Text>
              ) : null}
            </View>
          </Dialog>
        </>
      ) : null}
    </View>
  );

  const showTaskListLocator = stableTaskLists.length > 1;
  const selectedTaskListIndex = Math.max(
    0,
    stableTaskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );

  const indicator = showTaskListLocator ? (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("app.taskListLocator.label")}
      style={styles.indicatorContainer}
    >
      {stableTaskLists.map((taskList, index) => {
        const isSelected = index === selectedTaskListIndex;
        return (
          <Pressable
            key={taskList.id}
            accessibilityRole="tab"
            accessibilityLabel={t("app.taskListLocator.goTo", {
              index: index + 1,
              total: stableTaskLists.length,
            })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => taskListCarouselApi?.scrollTo(index)}
            style={({ pressed }) => [
              styles.indicatorDot,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.indicatorDotInner,
                {
                  backgroundColor: theme.text,
                  opacity: isSelected ? 1 : 0.2,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const carouselItems = stableTaskLists.map((taskList) => {
    const isActive = taskList.id === selectedTaskListId;
    const listTasks = localTasksMap[taskList.id] ?? taskList.tasks;
    const activeEditingTaskId = isActive ? editingTaskId : null;
    const activeEditingTaskText = isActive ? editingTaskText : "";
    const activeEditingTaskDate = isActive ? editingTaskDate : "";
    const activeNewTaskText = isActive ? newTaskText : "";

    const header = (
      <View style={[styles.taskHeaderRow, { marginBottom: 16 }]}>
        <Text
          style={[styles.settingsTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {taskList.name}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.editDetails")}
            onPress={() => handleEditListDialogChange(true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <AppIcon name="edit" size={18} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.shareTitle")}
            onPress={() => handleShareDialogChange(true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <AppIcon name="share" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
    );

    return (
      <CarouselItem key={taskList.id}>
        <View
          style={{
            flex: 1,
            backgroundColor: taskList.background ?? theme.background,
          }}
        >
          <TaskListPanel
            header={header}
            t={t}
            theme={theme}
            tasks={listTasks}
            newTaskText={activeNewTaskText}
            addDisabled={!isActive}
            emptyLabel={t("pages.tasklist.noTasks")}
            editingTaskId={activeEditingTaskId}
            editingTaskText={activeEditingTaskText}
            editingTaskDate={activeEditingTaskDate}
            onEditingTaskTextChange={setEditingTaskText}
            onEditingTaskDateChange={setEditingTaskDate}
            onEditStart={handleEditStart}
            onEditEnd={handleEditEnd}
            onDateChange={handleDateChange}
            onChangeNewTaskText={onChangeNewTaskText}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onReorderTask={(draggedTaskId, targetTaskId) =>
              handleReorderTaskWithOptimisticUpdate(
                taskList.id,
                draggedTaskId,
                targetTaskId,
              )
            }
            onSortTasks={onSortTasks}
            onDeleteCompletedTasks={onDeleteCompletedTasks}
          />
        </View>
      </CarouselItem>
    );
  });

  const taskListContent =
    stableTaskLists.length > 0 ? (
      <Carousel
        style={{ flex: 1 }}
        setApi={setTaskListCarouselApi}
        onSelect={handleCarouselSelect}
        opts={{
          enabled: !isReorderHandleActive,
          loop: false,
          minScrollDistancePerSwipe: 10,
          onScrollStart: () => {
            isScrollingRef.current = true;
          },
          onScrollEnd: () => {
            isScrollingRef.current = false;
            if (pendingIndexRef.current !== null) {
              const taskList = stableTaskLists[pendingIndexRef.current];
              pendingIndexRef.current = null;
              if (taskList && taskList.id !== selectedTaskListId) {
                onSelectTaskList(taskList.id);
              }
            }
          },
          onConfigurePanGesture: (gesture) => {
            "worklet";
            gesture.activeOffsetX([-8, 8]).failOffsetY([-6, 6]);
          },
        }}
      >
        <CarouselContent style={{ flex: 1 }}>{carouselItems}</CarouselContent>
      </Carousel>
    ) : (
      <TaskListPanel
        t={t}
        theme={theme}
        tasks={EMPTY_TASKS}
        newTaskText=""
        addDisabled
        emptyLabel=""
        editingTaskId={null}
        editingTaskText=""
        editingTaskDate=""
        onEditingTaskTextChange={() => {}}
        onEditingTaskDateChange={() => {}}
        onEditStart={() => {}}
        onEditEnd={() => {}}
        onDateChange={() => {}}
        onChangeNewTaskText={() => {}}
        onAddTask={() => {}}
        onToggleTask={() => {}}
        onReorderTask={() => {}}
        onSortTasks={() => {}}
        onDeleteCompletedTasks={() => {}}
      />
    );

  const currentBackground = selectedTaskList?.background ?? theme.background;

  return (
    <View style={[styles.drawerRoot, { backgroundColor: currentBackground }]}>
      <View style={[styles.appContent, { paddingBottom: 0 }]}>
        {taskListHeader}
        {indicator}
      </View>
      {taskListContent}
    </View>
  );
};
