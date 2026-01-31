import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "i18next";
import i18n from "../../utils/i18n";
import {
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { Task, TaskList } from "@lightlist/sdk/types";
import {
  addTask,
  deleteCompletedTasks,
  sortTasks,
  updateTask,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";

import { styles } from "../../styles/appStyles";
import { Dialog } from "../ui/Dialog";
import { useTheme } from "../../styles/theme";
import { resolveErrorMessage } from "../../utils/errors";
import { formatDateValue, parseDateValue } from "../../utils/date";
import { TaskItem } from "./TaskItem";

type TaskListCardProps = {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  t: TFunction;
  // Dialog/Edit関連
  enableEditDialog?: boolean;
  colors?: readonly string[];
  showEditListDialog?: boolean;
  onEditDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  editListName?: string;
  onEditListNameChange?: (value: string) => void;
  editListBackground?: string | null;
  onEditListBackgroundChange?: (color: string | null) => void;
  onSaveListDetails?: () => void;
  deletingList?: boolean;
  onDeleteList?: () => void;
  // Share関連
  enableShareDialog?: boolean;
  showShareDialog?: boolean;
  onShareDialogOpenChange?: (taskList: TaskList, open: boolean) => void;
  shareCode?: string | null;
  generatingShareCode?: boolean;
  onGenerateShareCode?: () => void;
  removingShareCode?: boolean;
  onRemoveShareCode?: () => void;
  onCopyShareLink?: () => void;
};

export const TaskListCard = ({
  taskList,
  isActive,
  onActivate,
  t,
  enableEditDialog,
  showEditListDialog,
  onEditDialogOpenChange,
  enableShareDialog,
  showShareDialog,
  onShareDialogOpenChange,
}: TaskListCardProps) => {
  const theme = useTheme();
  // Local state for optimistic updates
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    taskList.tasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
  );
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);

  // Reset editing state when not active
  useEffect(() => {
    if (!isActive) {
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      setNewTaskText("");
      setTaskError(null);
      setAddTaskError(null);
    }
  }, [isActive]);

  const completedTaskCount = tasks.filter((task) => task.completed).length;
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
    ? (tasks.find((task) => task.id === datePickerTaskId) ?? null)
    : null;
  const datePickerOpen = isIos && Boolean(datePickerTask);
  const currentDateValue = datePickerTask
    ? editingTaskId === datePickerTask.id
      ? editingTaskDate
      : (datePickerTask.date ?? "")
    : "";
  const canClearDate = currentDateValue.trim().length > 0;

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    setTaskError(null);
    try {
      await updateTask(taskList.id, taskId, updates);
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "app.error"));
    }
  };

  const applyDateChange = useCallback(
    (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      void handleUpdateTask(task.id, { date: normalizedDate });
    },
    [editingTaskId, handleUpdateTask],
  );

  const closeDatePicker = () => {
    setDatePickerTaskId(null);
  };

  const openDatePicker = useCallback(
    (task: Task) => {
      const sourceDate =
        editingTaskId === task.id ? editingTaskDate : (task.date ?? "");
      const parsedDate = parseDateValue(sourceDate) ?? new Date();
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
            applyDateChange(task, formatDateValue(selectedDate));
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
    applyDateChange(datePickerTask, formatDateValue(selectedDate));
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
      setNewTaskText(trimmedText); // Restore input on error
      setAddTaskError(resolveErrorMessage(error, t, "app.error"));
    }
  };

  const handleEditStartTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  }, []);

  const handleEditEndTask = useCallback(async () => {
    // We need to capture current state.
    // Since this is used in renderItem, we need to be careful about closure staleness if we memoize strictly,
    // but here we are using it inside the component.
    // However, since we are passing it to TaskItem, we should probably pass the item to it so we can find it?
    // Actually TaskItem calls onEditEnd().
    // We need to know WHICH task is being edited. editingTaskId state holds that.
    if (!editingTaskId) return;

    const task = tasks.find((t) => t.id === editingTaskId);
    if (!task) {
      setEditingTaskId(null);
      return;
    }

    const trimmedText = editingTaskText.trim();
    if (!trimmedText) {
      // Revert if empty
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      return;
    }
    const normalizedDate = editingTaskDate.trim();
    if (trimmedText === task.text && normalizedDate === (task.date ?? "")) {
      // No change
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      return;
    }

    setTaskError(null);
    try {
      await updateTask(taskList.id, task.id, {
        text: trimmedText,
        date: normalizedDate,
      });
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "app.error"));
    }
  }, [editingTaskId, editingTaskText, editingTaskDate, taskList.id, tasks, t]);

  const handleToggleTask = useCallback(
    async (task: Task) => {
      setTaskError(null);
      try {
        await updateTask(taskList.id, task.id, {
          completed: !task.completed,
        });
      } catch (error) {
        setTaskError(resolveErrorMessage(error, t, "app.error"));
      }
    },
    [taskList.id, t],
  );

  const handleSortTasks = async () => {
    setTaskError(null);
    try {
      await sortTasks(taskList.id);
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "app.error"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "app.error"));
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
        { text: t("app.cancel"), style: "cancel" },
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
      } catch (error) {
        setTaskError(resolveErrorMessage(error, t, "app.error"));
      }
    },
    [reorderTask, t],
  );

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive: isDragActive,
      getIndex,
    }: RenderItemParams<Task>) => {
      const isEditing = editingTaskId === item.id;
      const currentIndex =
        getIndex() ?? tasks.findIndex((task) => task.id === item.id);
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
          item={item}
          isEditing={isEditing}
          editingText={isEditing ? editingTaskText : ""}
          editingDate={isEditing ? editingTaskDate : ""}
          onEditStart={handleEditStartTask}
          onEditEnd={handleEditEndTask}
          onEditChangeText={setEditingTaskText}
          onToggleComplete={handleToggleTask}
          onOpenDatePicker={openDatePicker}
          drag={drag}
          isDragActive={isDragActive}
          canDrag={canDragTask}
          canMoveUp={canMoveTaskUp}
          canMoveDown={canMoveTaskDown}
          onMoveUp={() => handleMoveTaskByOffset(-1)}
          onMoveDown={() => handleMoveTaskByOffset(1)}
          dateLabel={dateLabel}
          editPlaceholder={t("taskList.addTaskPlaceholder")}
          reorderLabel={t("taskList.reorder")}
          toggleCompleteLabel={t("taskList.toggleComplete")}
          editTaskLabel={t("taskList.editTask")}
          moveUpLabel={t("app.moveUp")}
          moveDownLabel={t("app.moveDown")}
        />
      );
    },
    [
      editingTaskId,
      tasks,
      canDragTask,
      editingTaskText,
      editingTaskDate,
      handleEditStartTask,
      handleEditEndTask,
      handleToggleTask,
      openDatePicker,
      dateLabel,
      t,
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
          style={[
            styles.secondaryButton,
            { flex: 1, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.muted }]}>
            {clearDateLabel}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={closeDatePicker}
        style={[styles.secondaryButton, { flex: 1, borderColor: theme.border }]}
      >
        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
          {closeLabel}
        </Text>
      </Pressable>
    </>
  );

  const header = (
    <View style={[styles.taskHeaderRow, { marginBottom: 16 }]}>
      <Text
        style={[styles.settingsTitle, { color: theme.text }]}
        numberOfLines={1}
      >
        {taskList.name}
      </Text>
      <View style={styles.headerActions}>
        {enableEditDialog && onEditDialogOpenChange && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.editDetails")}
            onPress={() => onEditDialogOpenChange(taskList, true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="edit" color={theme.text} />
          </Pressable>
        )}
        {enableShareDialog && onShareDialogOpenChange && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.shareTitle")}
            onPress={() => onShareDialogOpenChange(taskList, true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="share" color={theme.text} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const listHeader = (
    <View style={styles.section}>
      {header}
      <View style={[styles.taskInputRow, { marginBottom: 16 }]}>
        <TextInput
          style={[
            styles.input,
            styles.taskInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.inputBackground,
            },
          ]}
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder={t("taskList.addTaskPlaceholder")}
          placeholderTextColor={theme.placeholder}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={handleAddTask}
          editable={isActive}
          accessibilityLabel={t("taskList.addTaskPlaceholder")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("taskList.addTask")}
          onPress={handleAddTask}
          disabled={!canAddTask}
          style={({ pressed }) => [
            styles.button,
            styles.taskSendButton,
            {
              backgroundColor: canAddTask ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <AppIcon
            name="send"
            color={canAddTask ? theme.primaryText : theme.muted}
          />
        </Pressable>
      </View>
      {addTaskError ? (
        <Text style={[styles.error, { color: theme.error }]}>
          {addTaskError}
        </Text>
      ) : null}
      <View style={styles.taskActionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.sort")}
          onPress={handleSortTasks}
          disabled={!canSortTasks}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderWidth: 0,
              paddingHorizontal: 14,
              paddingVertical: 10,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.taskActionButtonContent}>
            <AppIcon
              name="sort"
              color={canSortTasks ? theme.text : theme.muted}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                { color: canSortTasks ? theme.text : theme.muted },
              ]}
            >
              {t("pages.tasklist.sort")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.deleteCompleted")}
          onPress={confirmDeleteCompletedTasks}
          disabled={!canDeleteCompletedTasks}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderWidth: 0,
              paddingHorizontal: 14,
              paddingVertical: 10,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.taskActionButtonContent}>
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: canDeleteCompletedTasks ? theme.error : theme.muted,
                },
              ]}
            >
              {t("pages.tasklist.deleteCompleted")}
            </Text>
            <AppIcon
              name="delete"
              color={canDeleteCompletedTasks ? theme.error : theme.muted}
            />
          </View>
        </Pressable>
      </View>
      {taskError ? (
        <Text style={[styles.error, { color: theme.error }]}>{taskError}</Text>
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
        theme={theme}
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
      <DraggableFlatList
        style={{ backgroundColor: taskList.background ?? undefined }}
        data={tasks}
        keyExtractor={(item) => item.id}
        animationConfig={{ duration: 0 }}
        activationDistance={8}
        onDragEnd={({ from, to }) => {
          const draggedTask = tasks[from];
          const targetTask = tasks[to];
          if (!draggedTask || !targetTask || from === to) return;
          void handleReorderTask(draggedTask.id, targetTask.id);
        }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.appContent}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.taskSeparator, { backgroundColor: theme.border }]}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("pages.tasklist.noTasks")}
          </Text>
        }
        renderItem={renderItem}
      />
    </>
  );
};
