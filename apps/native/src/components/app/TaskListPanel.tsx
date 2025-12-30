import { useState } from "react";
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
import type { Task } from "@lightlist/sdk/types";

import { styles } from "../../styles/appStyles";
import type { Theme } from "../../styles/theme";
import { Dialog } from "../ui/Dialog";

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

type TaskListPanelProps = {
  t: TFunction;
  theme: Theme;
  tasks: Task[];
  newTaskText: string;
  taskListError?: string | null;
  isAddingTask: boolean;
  isUpdatingTask: boolean;
  isReorderingTasks: boolean;
  isSortingTasks: boolean;
  isDeletingCompletedTasks: boolean;
  addDisabled?: boolean;
  emptyLabel: string;
  editingTaskId: string | null;
  editingTaskText: string;
  editingTaskDate: string;
  onEditingTaskTextChange: (value: string) => void;
  onEditingTaskDateChange: (value: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task) => void;
  onDateChange: (task: Task, nextDate: string) => void | Promise<void>;
  onChangeNewTaskText: (value: string) => void;
  onAddTask: () => void | Promise<void>;
  onToggleTask: (task: Task) => void | Promise<void>;
  onReorderTask: (
    draggedTaskId: string,
    targetTaskId: string,
  ) => void | Promise<void>;
  onReorderPreview?: (nextTasks: Task[]) => void;
  onSortTasks: () => void | Promise<void>;
  onDeleteCompletedTasks: () => void | Promise<void>;
  onReorderHandlePressIn?: () => void;
  onReorderHandlePressOut?: () => void;
};

export const TaskListPanel = ({
  t,
  theme,
  tasks,
  newTaskText,
  taskListError,
  isAddingTask,
  isUpdatingTask,
  isReorderingTasks,
  isSortingTasks,
  isDeletingCompletedTasks,
  addDisabled = false,
  emptyLabel,
  editingTaskId,
  editingTaskText,
  editingTaskDate,
  onEditingTaskTextChange,
  onEditingTaskDateChange,
  onEditStart,
  onEditEnd,
  onDateChange,
  onChangeNewTaskText,
  onAddTask,
  onToggleTask,
  onReorderTask,
  onReorderPreview,
  onSortTasks,
  onDeleteCompletedTasks,
  onReorderHandlePressIn,
  onReorderHandlePressOut,
}: TaskListPanelProps) => {
  const canAddTask =
    !addDisabled && !isAddingTask && newTaskText.trim().length > 0;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const canSortTasks = tasks.length > 1 && !isSortingTasks;
  const canDeleteCompletedTasks =
    completedTasksCount > 0 && !isDeletingCompletedTasks;
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

  const applyDateChange = (task: Task, nextDate: string) => {
    if (editingTaskId === task.id) {
      onEditingTaskDateChange(nextDate);
    }
    void onDateChange(task, nextDate);
  };

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

  const handleAddTask = () => {
    if (!canAddTask) return;
    void onAddTask();
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
            void onDeleteCompletedTasks();
          },
        },
      ],
    );
  };

  const listHeader = (
    <View style={styles.section}>
      <View style={styles.taskActionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.sort")}
          onPress={onSortTasks}
          disabled={!canSortTasks}
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
            style={[
              styles.secondaryButtonText,
              { color: canSortTasks ? theme.text : theme.muted },
            ]}
          >
            {isSortingTasks ? t("common.loading") : t("pages.tasklist.sort")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.deleteCompleted")}
          onPress={confirmDeleteCompletedTasks}
          disabled={!canDeleteCompletedTasks}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              flex: 1,
              borderColor: theme.error,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              {
                color: canDeleteCompletedTasks ? theme.error : theme.muted,
              },
            ]}
          >
            {isDeletingCompletedTasks
              ? t("common.loading")
              : t("pages.tasklist.deleteCompleted")}
          </Text>
        </Pressable>
      </View>
      <View style={styles.taskInputRow}>
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
          onChangeText={onChangeNewTaskText}
          placeholder={t("taskList.addTaskPlaceholder")}
          placeholderTextColor={theme.placeholder}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={handleAddTask}
          editable={!addDisabled}
          accessibilityLabel={t("taskList.addTaskPlaceholder")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("taskList.addTask")}
          onPress={handleAddTask}
          disabled={!canAddTask}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canAddTask ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: canAddTask ? theme.primaryText : theme.muted },
            ]}
          >
            {t("taskList.addTask")}
          </Text>
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
        activationDistance={8}
        onDragEnd={({ data, from, to }) => {
          onReorderPreview?.(data);
          if (isReorderingTasks) return;
          const draggedTask = tasks[from];
          const targetTask = tasks[to];
          if (!draggedTask || !targetTask || from === to) return;
          void onReorderTask(draggedTask.id, targetTask.id);
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
          emptyLabel ? (
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {emptyLabel}
            </Text>
          ) : null
        }
        renderItem={({
          item,
          drag,
          isActive,
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
          const canDragTask =
            !isEditing && !isReorderingTasks && tasks.length > 1;
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
            void onReorderTask(item.id, targetTask.id);
          };

          return (
            <View style={[styles.taskItem, isActive && { opacity: 0.7 }]}>
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
                  onLongPress={canDragTask ? drag : undefined}
                  onPressIn={onReorderHandlePressIn}
                  onPressOut={onReorderHandlePressOut}
                  delayLongPress={150}
                  disabled={!canDragTask}
                  style={({ pressed }) => [
                    styles.taskActionButton,
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <AppIcon
                    name="drag-indicator"
                    size={18}
                    color={canDragTask ? theme.text : theme.muted}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.toggleComplete")}
                  onPress={() => {
                    void onToggleTask(item);
                  }}
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
                      onChangeText={onEditingTaskTextChange}
                      placeholder={t("taskList.addTaskPlaceholder")}
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        void onEditEnd(item);
                      }}
                      onBlur={() => {
                        void onEditEnd(item);
                      }}
                      editable={!isUpdatingTask}
                      accessibilityLabel={t("taskList.editTask")}
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("taskList.editTask")}
                      onPress={() => onEditStart(item)}
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
                  disabled={isUpdatingTask}
                  style={({ pressed }) => [
                    styles.taskActionButton,
                    {
                      borderColor: theme.border,
                      opacity: isUpdatingTask ? 0.6 : pressed ? 0.8 : 1,
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
