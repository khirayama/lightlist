import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { AppIcon } from "../ui/AppIcon";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ReorderableList, {
  type ReorderableListDragEndEvent,
  type ReorderableListDragStartEvent,
  type ReorderableListRenderItem,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";
import { runOnJS } from "react-native-reanimated";
import type { Task, TaskList } from "@lightlist/sdk/types";
import {
  addTask,
  deleteCompletedTasks,
  sortTasks,
  updateTask,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";
import { formatDate, parseISODate } from "@lightlist/sdk/utils/dateParser";

import { Dialog } from "../ui/Dialog";
import { resolveErrorMessage } from "../../utils/errors";
import { TaskItem } from "./TaskItem";

type TaskListCardProps = {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  onSortingChange?: (sorting: boolean) => void;
  t: TFunction;
  enableEditDialog?: boolean;
  colors?: readonly ColorOption[];
  showEditListDialog?: boolean;
  onEditDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  editListName?: string;
  onEditListNameChange?: (value: string) => void;
  editListBackground?: string | null;
  onEditListBackgroundChange?: (color: string | null) => void;
  onSaveListDetails?: () => void;
  deletingList?: boolean;
  onDeleteList?: () => void;
  enableShareDialog?: boolean;
  showShareDialog?: boolean;
  onShareDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  shareCode?: string | null;
  shareCopySuccess?: boolean;
  generatingShareCode?: boolean;
  onGenerateShareCode?: () => void;
  removingShareCode?: boolean;
  onRemoveShareCode?: () => void;
  onCopyShareLink?: () => void;
};

type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

export const TaskListCard = ({
  taskList,
  isActive,
  onSortingChange,
  t,
  enableEditDialog = false,
  onEditDialogOpenChange,
  enableShareDialog = false,
  showShareDialog,
  onShareDialogOpenChange,
}: TaskListCardProps) => {
  const [isTaskDragActive, setIsTaskDragActive] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    taskList.tasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
    {
      suspendExternalSync: isTaskDragActive,
    },
  );
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const addButtonVisibility = useRef(new Animated.Value(0)).current;
  const panGesture = useMemo(
    () => Gesture.Pan().activeOffsetY([-12, 12]).failOffsetX([-24, 24]),
    [],
  );

  const { tasksById, completedTaskCount } = useMemo(() => {
    const nextTasksById: Record<string, Task> = {};
    let nextCompletedTaskCount = 0;
    tasks.forEach((task) => {
      nextTasksById[task.id] = task;
      if (task.completed) {
        nextCompletedTaskCount += 1;
      }
    });
    return {
      tasksById: nextTasksById,
      completedTaskCount: nextCompletedTaskCount,
    };
  }, [tasks]);

  useEffect(() => {
    if (!isActive) {
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      setNewTaskText("");
      setTaskError(null);
      setAddTaskError(null);
      setIsAddInputFocused(false);
      setIsTaskDragActive(false);
      setDraggingTaskId(null);
    }
  }, [isActive]);

  useEffect(() => {
    onSortingChange?.(isTaskDragActive);
  }, [isTaskDragActive, onSortingChange]);

  useEffect(() => {
    return () => {
      onSortingChange?.(false);
    };
  }, [onSortingChange]);

  useEffect(() => {
    Animated.timing(addButtonVisibility, {
      toValue: isAddInputFocused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [addButtonVisibility, isAddInputFocused]);

  const canSortTasks = tasks.length > 1;
  const canDeleteCompletedTasks = completedTaskCount > 0;
  const canDragTask = tasks.length > 1;
  const canAddTask = newTaskText.trim().length > 0;

  const dateLabel = t("pages.tasklist.setDate");
  const clearDateLabel = t("pages.tasklist.clearDate");
  const closeLabel = t("common.close");
  const isIos = Platform.OS === "ios";

  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());

  const datePickerTask = datePickerTaskId
    ? (tasksById[datePickerTaskId] ?? null)
    : null;
  const datePickerOpen = isIos && Boolean(datePickerTask);
  const currentDateValue = datePickerTask
    ? editingTaskId === datePickerTask.id
      ? editingTaskDate
      : (datePickerTask.date ?? "")
    : "";
  const canClearDate = currentDateValue.trim().length > 0;

  const runTaskMutation = useCallback(
    async ({
      task,
      updates,
    }: {
      task: Task;
      updates: Partial<Task>;
    }): Promise<boolean> => {
      setTaskError(null);
      try {
        await updateTask(taskList.id, task.id, updates);
        return true;
      } catch (error) {
        setTaskError(resolveErrorMessage(error, t, "common.error"));
        return false;
      }
    },
    [taskList.id, t],
  );

  const applyDateChange = useCallback(
    (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      void runTaskMutation({
        task,
        updates: { date: normalizedDate },
      });
    },
    [editingTaskId, runTaskMutation],
  );

  const closeDatePicker = () => {
    setDatePickerTaskId(null);
  };

  const openDatePicker = useCallback(
    (task: Task) => {
      const sourceDate =
        editingTaskId === task.id ? editingTaskDate : (task.date ?? "");
      const parsedDate = parseISODate(sourceDate) ?? new Date();
      if (!isIos) {
        const canClear = sourceDate.trim().length > 0;
        DateTimePickerAndroid.open({
          value: parsedDate,
          mode: "date",
          onChange: (event, selectedDate) => {
            if (event.type === "neutralButtonPressed") {
              applyDateChange(task, "");
              return;
            }
            if (event.type === "dismissed") return;
            if (!selectedDate) return;
            applyDateChange(task, formatDate(selectedDate));
          },
          ...(canClear ? { neutralButtonLabel: clearDateLabel } : {}),
        });
        return;
      }
      setDatePickerValue(parsedDate);
      setDatePickerTaskId(task.id);
    },
    [editingTaskId, editingTaskDate, isIos, applyDateChange, clearDateLabel],
  );

  const handleDatePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (!datePickerTask) return;
    if (event.type === "dismissed") {
      closeDatePicker();
      return;
    }
    if (event.type === "neutralButtonPressed") {
      applyDateChange(datePickerTask, "");
      closeDatePicker();
      return;
    }
    if (!selectedDate) return;
    setDatePickerValue(selectedDate);
    applyDateChange(datePickerTask, formatDate(selectedDate));
  };

  const handleClearDate = () => {
    if (!datePickerTask) {
      closeDatePicker();
      return;
    }
    applyDateChange(datePickerTask, "");
    closeDatePicker();
  };

  const handleAddTask = async () => {
    const trimmedText = newTaskText.trim();
    if (!trimmedText) return;

    setNewTaskText("");
    setAddTaskError(null);
    setTaskError(null);

    try {
      await addTask(taskList.id, trimmedText);
    } catch (error) {
      setNewTaskText(trimmedText);
      setAddTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const handleEditStartTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  }, []);

  const handleEditEndTask = useCallback(
    async (task: Task, text?: string) => {
      if (editingTaskId !== task.id) return;

      const currentTask = tasksById[task.id];
      if (!currentTask) {
        setEditingTaskId(null);
        return;
      }

      const trimmedText = (text ?? editingTaskText).trim();
      if (!trimmedText) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }

      const normalizedDate = editingTaskDate.trim();
      if (
        trimmedText === currentTask.text &&
        normalizedDate === (currentTask.date ?? "")
      ) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }

      const isUpdated = await runTaskMutation({
        task: currentTask,
        updates: {
          text: trimmedText,
          date: normalizedDate,
        },
      });
      if (isUpdated) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
      }
    },
    [
      editingTaskId,
      editingTaskText,
      editingTaskDate,
      tasksById,
      runTaskMutation,
    ],
  );

  const handleTaskDateChange = useCallback(
    (taskId: string, _date: string) => {
      const task = tasksById[taskId];
      if (!task) return;
      openDatePicker(task);
    },
    [openDatePicker, tasksById],
  );

  const handleToggleTask = useCallback(
    async (task: Task) => {
      await runTaskMutation({
        task,
        updates: {
          completed: !task.completed,
        },
      });
    },
    [runTaskMutation],
  );

  const handleSortTasks = async () => {
    setTaskError(null);
    try {
      await sortTasks(taskList.id);
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const confirmDeleteCompletedTasks = () => {
    if (completedTaskCount === 0) return;
    Alert.alert(
      t("pages.tasklist.deleteCompleted"),
      t("pages.tasklist.deleteCompletedConfirm", {
        count: completedTaskCount,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void handleDeleteCompletedTasks();
          },
        },
      ],
    );
  };

  const handleReorderTask = useCallback(
    async (draggedTaskId: string, targetTaskId: string) => {
      setTaskError(null);
      try {
        await reorderTask(draggedTaskId, targetTaskId);
        setIsTaskDragActive(false);
      } catch (error) {
        setIsTaskDragActive(false);
        setTaskError(resolveErrorMessage(error, t, "common.error"));
      }
    },
    [reorderTask, t],
  );

  const addTaskPlaceholderLabel = t("pages.tasklist.addTaskPlaceholder");
  const reorderLabel = t("taskList.reorder");
  const moveUpLabel = t("app.moveUp");
  const moveDownLabel = t("app.moveDown");

  const handleTaskDragStart = useCallback(
    (index: number) => {
      setIsTaskDragActive(true);
      const draggedTask = tasks[index];
      setDraggingTaskId(draggedTask?.id ?? null);
    },
    [tasks],
  );

  const handleTaskDragEnd = useCallback((from: number, to: number) => {
    setDraggingTaskId(null);
    if (from === to) {
      setIsTaskDragActive(false);
    }
  }, []);

  const onTaskDragStart = useCallback(
    (event: ReorderableListDragStartEvent) => {
      "worklet";
      runOnJS(handleTaskDragStart)(event.index);
    },
    [handleTaskDragStart],
  );

  const onTaskDragEnd = useCallback(
    (event: ReorderableListDragEndEvent) => {
      "worklet";
      runOnJS(handleTaskDragEnd)(event.from, event.to);
    },
    [handleTaskDragEnd],
  );

  const handleTaskReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (from === to) return;
      const draggedTask = tasks[from];
      const targetTask = tasks[to];
      if (!draggedTask || !targetTask) {
        setIsTaskDragActive(false);
        return;
      }
      void handleReorderTask(draggedTask.id, targetTask.id);
    },
    [handleReorderTask, tasks],
  );

  const renderItem = useCallback<ReorderableListRenderItem<Task>>(
    ({ item, index }) => {
      const isEditing = editingTaskId === item.id;
      const currentIndex = index;
      const canMoveTaskUp = canDragTask && currentIndex > 0;
      const canMoveTaskDown =
        canDragTask && currentIndex >= 0 && currentIndex < tasks.length - 1;

      const handleMoveTaskByOffset = (offset: number) => {
        if (!canDragTask || currentIndex < 0) return;
        const targetTask = tasks[currentIndex + offset];
        if (!targetTask) return;
        void handleReorderTask(item.id, targetTask.id);
      };

      return (
        <TaskItem
          task={item}
          isEditing={isEditing}
          editingText={isEditing ? editingTaskText : ""}
          onEditingTextChange={setEditingTaskText}
          onEditStart={handleEditStartTask}
          onEditEnd={handleEditEndTask}
          onToggle={handleToggleTask}
          onDateChange={handleTaskDateChange}
          setDateLabel={dateLabel}
          dragHintLabel={reorderLabel}
          editingDate={isEditing ? editingTaskDate : ""}
          isDragActive={draggingTaskId === item.id}
          canDrag={canDragTask}
          canMoveUp={canMoveTaskUp}
          canMoveDown={canMoveTaskDown}
          onMoveUp={() => handleMoveTaskByOffset(-1)}
          onMoveDown={() => handleMoveTaskByOffset(1)}
          moveUpLabel={moveUpLabel}
          moveDownLabel={moveDownLabel}
        />
      );
    },
    [
      editingTaskId,
      tasks,
      draggingTaskId,
      canDragTask,
      editingTaskText,
      editingTaskDate,
      handleEditStartTask,
      handleEditEndTask,
      handleToggleTask,
      handleTaskDateChange,
      dateLabel,
      reorderLabel,
      moveUpLabel,
      moveDownLabel,
      handleReorderTask,
    ],
  );

  const datePickerFooter = (
    <>
      {canClearDate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearDateLabel}
          onPress={handleClearDate}
          className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center"
        >
          <Text className="text-[15px] font-inter-semibold text-muted dark:text-muted-dark">
            {clearDateLabel}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={closeDatePicker}
        className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center"
      >
        <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
          {closeLabel}
        </Text>
      </Pressable>
    </>
  );

  const header = (
    <View className="flex-row items-center justify-between gap-3 mb-4">
      <Text
        className="text-xl font-inter-semibold text-text dark:text-text-dark flex-1"
        numberOfLines={1}
      >
        {taskList.name}
      </Text>
      <View className="flex-row items-center justify-end flex-wrap gap-2">
        {enableEditDialog && onEditDialogOpenChange && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.editDetails")}
            onPress={() => onEditDialogOpenChange(taskList, true)}
            className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
          >
            <AppIcon name="edit" className="fill-text dark:fill-text-dark" />
          </Pressable>
        )}
        {enableShareDialog && onShareDialogOpenChange && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.shareTitle")}
            onPress={() => onShareDialogOpenChange(taskList, true)}
            className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
          >
            <AppIcon name="share" className="fill-text dark:fill-text-dark" />
          </Pressable>
        )}
      </View>
    </View>
  );

  const addButtonAnimatedStyle = {
    opacity: addButtonVisibility,
    width: addButtonVisibility.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 48],
    }),
    marginLeft: addButtonVisibility.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
    transform: [
      {
        translateX: addButtonVisibility.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };

  const listHeader = (
    <View className="mb-6">
      {header}
      <View className="flex-row items-center mb-4">
        <TextInput
          className="flex-1 rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder={addTaskPlaceholderLabel}
          placeholderClassName="text-placeholder dark:text-placeholder-dark"
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={handleAddTask}
          onFocus={() => setIsAddInputFocused(true)}
          onBlur={() => setIsAddInputFocused(false)}
          editable={isActive}
          accessibilityLabel={addTaskPlaceholderLabel}
        />
        <Animated.View style={[addButtonAnimatedStyle, { overflow: "hidden" }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.addTask")}
            onPress={handleAddTask}
            disabled={!canAddTask || !isAddInputFocused}
            className={`rounded-[12px] py-3.5 px-3.5 items-center active:opacity-90 ${
              canAddTask
                ? "bg-primary dark:bg-primary-dark"
                : "bg-border dark:bg-border-dark"
            }`}
          >
            <AppIcon
              name="send"
              className={
                canAddTask
                  ? "fill-primary-text dark:fill-primary-text-dark"
                  : "fill-muted dark:fill-muted-dark"
              }
            />
          </Pressable>
        </Animated.View>
      </View>
      {addTaskError ? (
        <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
          {addTaskError}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.sort")}
          onPress={handleSortTasks}
          disabled={!canSortTasks}
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 active:opacity-90"
        >
          <AppIcon
            name="sort"
            className={
              canSortTasks
                ? "fill-text dark:fill-text-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
          <Text
            className={`text-[15px] font-inter-semibold ${
              canSortTasks
                ? "text-text dark:text-text-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {t("pages.tasklist.sort")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.deleteCompleted")}
          onPress={confirmDeleteCompletedTasks}
          disabled={!canDeleteCompletedTasks}
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 active:opacity-90"
        >
          <Text
            className={`text-[15px] font-inter-semibold ${
              canDeleteCompletedTasks
                ? "text-error dark:text-error-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {t("pages.tasklist.deleteCompleted")}
          </Text>
          <AppIcon
            name="delete"
            className={
              canDeleteCompletedTasks
                ? "fill-error dark:fill-error-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
        </Pressable>
      </View>
      {taskError ? (
        <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
          {taskError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      <Dialog
        open={datePickerOpen}
        onOpenChange={(open) => {
          if (!open) closeDatePicker();
        }}
        title={dateLabel}
        footer={datePickerFooter}
      >
        {datePickerOpen ? (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleDatePickerChange}
          />
        ) : null}
      </Dialog>
      <ReorderableList
        style={{ backgroundColor: taskList.background ?? undefined }}
        data={tasks}
        keyExtractor={(item) => item.id}
        onReorder={handleTaskReorder}
        onDragStart={onTaskDragStart}
        onDragEnd={onTaskDragEnd}
        panGesture={panGesture}
        dragEnabled={canDragTask}
        shouldUpdateActiveItem
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24,
          maxWidth: 768,
          width: "100%",
          alignSelf: "center",
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text className="text-[15px] font-inter text-muted dark:text-muted-dark">
            {t("pages.tasklist.noTasks")}
          </Text>
        }
        renderItem={renderItem}
      />
    </>
  );
};
