import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { Task, TaskList } from "@lightlist/sdk/types";

import { styles } from "../../styles/appStyles";
import type { Theme } from "../../styles/theme";

type TaskListPanelProps = {
  t: TFunction;
  theme: Theme;
  selectedTaskList: TaskList | null;
  selectedTaskListId: string | null;
  tasks: Task[];
  newTaskText: string;
  isAddingTask: boolean;
  isUpdatingTask: boolean;
  isReorderingTasks: boolean;
  isSortingTasks: boolean;
  isDeletingCompletedTasks: boolean;
  header: ReactNode;
  onChangeNewTaskText: (value: string) => void;
  onAddTask: () => void | Promise<void>;
  onToggleTask: (task: Task) => void | Promise<void>;
  onConfirmDeleteTask: (task: Task) => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => void | Promise<void>;
  onReorderTask: (
    draggedTaskId: string,
    targetTaskId: string,
  ) => void | Promise<void>;
  onSortTasks: () => void | Promise<void>;
  onDeleteCompletedTasks: () => void | Promise<void>;
};

export const TaskListPanel = ({
  t,
  theme,
  selectedTaskList,
  selectedTaskListId,
  tasks,
  newTaskText,
  isAddingTask,
  isUpdatingTask,
  isReorderingTasks,
  isSortingTasks,
  isDeletingCompletedTasks,
  header,
  onChangeNewTaskText,
  onAddTask,
  onToggleTask,
  onConfirmDeleteTask,
  onUpdateTask,
  onReorderTask,
  onSortTasks,
  onDeleteCompletedTasks,
}: TaskListPanelProps) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);
  const canAddTask =
    Boolean(selectedTaskList) && !isAddingTask && newTaskText.trim().length > 0;
  const completedTasksCount = orderedTasks.filter(
    (task) => task.completed,
  ).length;
  const canSortTasks = orderedTasks.length > 1 && !isSortingTasks;
  const canDeleteCompletedTasks =
    completedTasksCount > 0 && !isDeletingCompletedTasks;

  useEffect(() => {
    setOrderedTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [selectedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const exists = tasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, tasks]);

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  };

  const handleSaveTask = async () => {
    if (!editingTaskId) return;
    const trimmedText = editingTaskText.trim();
    if (!trimmedText) return;
    const normalizedDate = editingTaskDate.trim();
    await onUpdateTask(editingTaskId, {
      text: trimmedText,
      date: normalizedDate,
    });
    cancelEditTask();
  };

  const confirmDeleteCompletedTasks = () => {
    if (!selectedTaskList || completedTasksCount === 0) return;
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
    <View>
      {header}
      {selectedTaskList ? (
        <View style={styles.section}>
          <View style={styles.taskHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {selectedTaskList.name || t("app.taskListName")}
            </Text>
            <Text style={[styles.taskCount, { color: theme.muted }]}>
              {t("taskList.taskCount", {
                count: selectedTaskList.tasks.length,
              })}
            </Text>
          </View>
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
                {isSortingTasks
                  ? t("common.loading")
                  : t("pages.tasklist.sort")}
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
              onSubmitEditing={onAddTask}
              editable={!isAddingTask}
              accessibilityLabel={t("taskList.addTaskPlaceholder")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("taskList.addTask")}
              onPress={onAddTask}
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
        </View>
      ) : null}
    </View>
  );

  return (
    <DraggableFlatList
      data={orderedTasks}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data, from, to }) => {
        if (isReorderingTasks) {
          setOrderedTasks(data);
          return;
        }
        const draggedTask = orderedTasks[from];
        const targetTask = orderedTasks[to];
        setOrderedTasks(data);
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
        selectedTaskList ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("pages.tasklist.noTasks")}
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
        const currentIndex =
          getIndex() ?? orderedTasks.findIndex((task) => task.id === item.id);
        const canDragTask =
          !isEditing && !isReorderingTasks && orderedTasks.length > 1;
        const canMoveTaskUp = canDragTask && currentIndex > 0;
        const canMoveTaskDown =
          canDragTask &&
          currentIndex >= 0 &&
          currentIndex < orderedTasks.length - 1;
        const canSaveTask =
          !isUpdatingTask && editingTaskText.trim().length > 0;
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
          const targetTask = orderedTasks[currentIndex + offset];
          if (!targetTask) return;
          void onReorderTask(item.id, targetTask.id);
        };

        return (
          <View style={[styles.taskItem, isActive && { opacity: 0.7 }]}>
            <View style={styles.taskRow}>
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
                    value={editingTaskText}
                    onChangeText={setEditingTaskText}
                    placeholder={t("taskList.addTaskPlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveTask}
                    editable={!isUpdatingTask}
                    accessibilityLabel={t("taskList.editTask")}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.editTask")}
                    onPress={() => startEditTask(item)}
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
                {!isEditing && item.date ? (
                  <Text style={[styles.taskMetaText, { color: theme.muted }]}>
                    {item.date}
                  </Text>
                ) : null}
              </View>
              <View style={styles.taskActionColumn}>
                {isEditing ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.save")}
                    onPress={handleSaveTask}
                    disabled={!canSaveTask}
                    style={({ pressed }) => [
                      styles.taskActionButton,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskActionText,
                        { color: canSaveTask ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.save")}
                    </Text>
                  </Pressable>
                ) : (
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
                    <Text
                      style={[
                        styles.taskActionText,
                        { color: canDragTask ? theme.text : theme.muted },
                      ]}
                    >
                      {t("taskList.reorder")}
                    </Text>
                  </Pressable>
                )}
                {isEditing ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={cancelEditTask}
                    style={({ pressed }) => [
                      styles.taskActionButton,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.taskActionText, { color: theme.text }]}
                    >
                      {t("app.cancel")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {isEditing ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("pages.tasklist.setDate")}
                </Text>
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
                  value={editingTaskDate}
                  onChangeText={setEditingTaskDate}
                  placeholder={t("pages.tasklist.setDate")}
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  editable={!isUpdatingTask}
                  accessibilityLabel={t("pages.tasklist.setDate")}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("taskList.deleteTask")}
              onPress={() => {
                onConfirmDeleteTask(item);
              }}
              style={({ pressed }) => [
                styles.taskDeleteButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.taskDeleteText, { color: theme.error }]}>
                {t("taskList.deleteTask")}
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
};
