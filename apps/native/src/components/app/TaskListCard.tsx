import { useCallback, useEffect, useState, useMemo } from "react";
import type { TFunction } from "i18next";
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

import { styles } from "../../styles/appStyles";
import type { Theme } from "../../styles/theme";
import { Dialog } from "../ui/Dialog";
import { useTheme } from "../../styles/theme";

const formatDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const arrayMove = <T,>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};

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
  const [localTasks, setLocalTasks] = useState<Task[]>(taskList.tasks);
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [taskListError, setTaskListError] = useState<string | null>(null);

  // Sync local tasks with props
  useEffect(() => {
    setLocalTasks(taskList.tasks);
  }, [taskList.tasks]);

  // Reset editing state when not active
  useEffect(() => {
    if (!isActive) {
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      setNewTaskText("");
      setTaskListError(null);
    }
  }, [isActive]);

  const tasks = localTasks;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const canSortTasks = tasks.length > 1;
  const canDeleteCompletedTasks = completedTasksCount > 0;
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
    setTaskListError(null);
    try {
      await updateTask(taskList.id, taskId, updates);
    } catch (error) {
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
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

  const openDatePicker = (task: Task) => {
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
  };

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
    setTaskListError(null);
    try {
      await addTask(taskList.id, trimmedText);
    } catch (error) {
      setNewTaskText(trimmedText); // Restore input on error
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  };

  const handleEditEnd = async (task: Task) => {
    if (!editingTaskId || editingTaskId !== task.id) return;

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

    setTaskListError(null);
    try {
      await updateTask(taskList.id, task.id, {
        text: trimmedText,
        date: normalizedDate,
      });
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
    } catch (error) {
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

  const handleToggleTask = async (task: Task) => {
    setTaskListError(null);
    try {
      await updateTask(taskList.id, task.id, {
        completed: !task.completed,
      });
    } catch (error) {
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

  const handleSortTasks = async () => {
    setTaskListError(null);
    try {
      await sortTasks(taskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskListError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

  const confirmDeleteCompletedTasks = () => {
    if (completedTasksCount === 0) return;
    Alert.alert(
      t("pages.tasklist.deleteCompleted"),
      t("pages.tasklist.deleteCompletedConfirm", {
        count: completedTasksCount,
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

  const handleReorderTask = async (
    draggedTaskId: string,
    targetTaskId: string,
  ) => {
    if (!draggedTaskId || !targetTaskId) return;
    if (draggedTaskId === targetTaskId) return;

    // Optimistic update
    const oldIndex = localTasks.findIndex((t) => t.id === draggedTaskId);
    const newIndex = localTasks.findIndex((t) => t.id === targetTaskId);
    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalTasks((prev) => arrayMove(prev, oldIndex, newIndex));
    }

    setTaskListError(null);
    try {
      await updateTasksOrder(taskList.id, draggedTaskId, targetTaskId);
    } catch (error) {
      setLocalTasks(taskList.tasks); // Rollback
      if (error instanceof Error) {
        setTaskListError(error.message);
      } else {
        setTaskListError(t("app.error"));
      }
    }
  };

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
            <AppIcon name="edit" size={18} color={theme.text} />
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
            <AppIcon name="share" size={18} color={theme.text} />
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
            size={20}
            color={canAddTask ? theme.primaryText : theme.muted}
          />
        </Pressable>
      </View>
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
              size={18}
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
              size={18}
              color={canDeleteCompletedTasks ? theme.error : theme.muted}
            />
          </View>
        </Pressable>
      </View>
      {taskListError ? (
        <Text style={[styles.error, { color: theme.error }]}>
          {taskListError}
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
        renderItem={({
          item,
          drag,
          isActive: isDragActive,
          getIndex,
        }: RenderItemParams<Task>) => {
          const isEditing = editingTaskId === item.id;
          const rawDateValue = isEditing ? editingTaskDate : (item.date ?? "");
          const dateValue = rawDateValue.trim();
          const hasDate = dateValue.length > 0;
          const dateButtonLabel = hasDate
            ? `${dateLabel}: ${dateValue}`
            : dateLabel;
          const currentIndex =
            getIndex() ?? tasks.findIndex((task) => task.id === item.id);
          const canMoveTaskUp = canDragTask && currentIndex > 0;
          const canMoveTaskDown =
            canDragTask && currentIndex >= 0 && currentIndex < tasks.length - 1;
          const accessibilityActions: { name: string; label: string }[] = [];

          if (canMoveTaskUp) {
            accessibilityActions.push({
              name: "moveUp",
              label: t("app.moveUp"),
            });
          }
          if (canMoveTaskDown) {
            accessibilityActions.push({
              name: "moveDown",
              label: t("app.moveDown"),
            });
          }

          const handleMoveTaskByOffset = (offset: number) => {
            if (!canDragTask || currentIndex < 0) return;
            const targetTask = tasks[currentIndex + offset];
            if (!targetTask) return;
            void handleReorderTask(item.id, targetTask.id);
          };

          return (
            <View style={[styles.taskItem, isDragActive && { opacity: 0.7 }]}>
              <View style={styles.taskRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.reorder")}
                  accessibilityActions={accessibilityActions}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === "moveUp") {
                      handleMoveTaskByOffset(-1);
                      return;
                    }
                    if (event.nativeEvent.actionName === "moveDown") {
                      handleMoveTaskByOffset(1);
                    }
                  }}
                  onLongPress={canDragTask && !isEditing ? drag : undefined}
                  delayLongPress={150}
                  disabled={!canDragTask || isEditing}
                  style={({ pressed }) => [
                    styles.taskActionButton,
                    {
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <AppIcon
                    name="drag-indicator"
                    size={18}
                    color={canDragTask && !isEditing ? theme.text : theme.muted}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.toggleComplete")}
                  onPress={() => void handleToggleTask(item)}
                  disabled={isEditing}
                  style={[
                    styles.taskCheck,
                    {
                      borderColor: theme.border,
                      backgroundColor: item.completed
                        ? theme.primary
                        : "transparent",
                      opacity: isEditing ? 0.6 : 1,
                    },
                  ]}
                />
                <View style={styles.taskContent}>
                  {isEditing ? (
                    <TextInput
                      style={[
                        styles.input,
                        styles.taskEditInput,
                        {
                          color: theme.text,
                          borderColor: theme.border,
                          backgroundColor: theme.inputBackground,
                        },
                      ]}
                      autoFocus
                      value={editingTaskText}
                      onChangeText={setEditingTaskText}
                      placeholder={t("taskList.addTaskPlaceholder")}
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => handleEditEnd(item)}
                      onBlur={() => handleEditEnd(item)}
                      editable
                      accessibilityLabel={t("taskList.editTask")}
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("taskList.editTask")}
                      onPress={() => handleEditStart(item)}
                      style={({ pressed }) => [
                        styles.taskTextButton,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskText,
                          { color: theme.text },
                          item.completed && styles.taskTextCompleted,
                        ]}
                      >
                        {item.text}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={dateButtonLabel}
                  onPress={() => openDatePicker(item)}
                  style={({ pressed }) => [
                    styles.taskActionButton,
                    {
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {hasDate ? (
                    <Text
                      style={[styles.taskActionText, { color: theme.muted }]}
                    >
                      {dateValue}
                    </Text>
                  ) : (
                    <AppIcon
                      name="calendar-today"
                      size={18}
                      color={theme.muted}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </>
  );
};
