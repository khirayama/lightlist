import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { appStore } from "@lightlist/sdk/store";
import type { AppState, Task, TaskList } from "@lightlist/sdk/types";
import {
  addSharedTaskListToOrder,
  addTask,
  deleteCompletedTasks,
  deleteTask,
  fetchTaskListIdByShareCode,
  sortTasks,
  updateTask,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { styles } from "../appStyles";
import type { Theme } from "../theme";

type ShareCodeScreenProps = {
  t: TFunction;
  theme: Theme;
  initialShareCode: string | null;
  onBack: () => void;
  onOpenTaskList: () => void;
};

export const ShareCodeScreen = ({
  t,
  theme,
  initialShareCode,
  onBack,
  onOpenTaskList,
}: ShareCodeScreenProps) => {
  const [storeState, setStoreState] = useState<AppState>(() =>
    appStore.getState(),
  );
  const normalizedInitialShareCode =
    initialShareCode?.trim().toUpperCase() ?? "";
  const [shareCodeInput, setShareCodeInput] = useState(
    normalizedInitialShareCode,
  );
  const [activeShareCode, setActiveShareCode] = useState<string | null>(
    normalizedInitialShareCode ? normalizedInitialShareCode : null,
  );
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(normalizedInitialShareCode.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);
  const [isSortingTasks, setIsSortingTasks] = useState(false);
  const [isDeletingCompletedTasks, setIsDeletingCompletedTasks] =
    useState(false);
  const sharedTaskListUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = appStore.subscribe((nextState) => {
      setStoreState(nextState);
    });
    setStoreState(appStore.getState());
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const normalized = initialShareCode?.trim().toUpperCase() ?? "";
    setShareCodeInput(normalized);
    setActiveShareCode(normalized ? normalized : null);
  }, [initialShareCode]);

  useEffect(() => {
    if (!activeShareCode) return;

    let cancelled = false;
    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        setAddToOrderError(null);
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;

        const taskListId = await fetchTaskListIdByShareCode(activeShareCode);
        if (cancelled) return;
        if (!taskListId) {
          setError(t("pages.sharecode.notFound"));
          return;
        }

        setSharedTaskListId(taskListId);
        sharedTaskListUnsubscribeRef.current =
          appStore.subscribeToSharedTaskList(taskListId);
      } catch (err) {
        setError(t("pages.sharecode.error"));
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTaskList();

    return () => {
      cancelled = true;
    };
  }, [activeShareCode, t]);

  useEffect(
    () => () => {
      sharedTaskListUnsubscribeRef.current?.();
    },
    [],
  );

  const user = storeState.user;
  const taskList: TaskList | null =
    sharedTaskListId === null
      ? null
      : (storeState.taskLists.find((list) => list.id === sharedTaskListId) ??
        storeState.sharedTaskListsById[sharedTaskListId] ??
        null);
  const taskListTasks = taskList?.tasks ?? [];
  const completedTasksCount = taskListTasks.filter(
    (task) => task.completed,
  ).length;
  const canSortTasks = taskListTasks.length > 1 && !isSortingTasks;
  const canDeleteCompletedTasks =
    completedTasksCount > 0 && !isDeletingCompletedTasks;

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [taskList?.id]);

  const handleShareCodeSubmit = () => {
    const normalized = shareCodeInput.trim().toUpperCase();
    if (normalized.length === 0) {
      setError(t("pages.sharecode.enterCode"));
      return;
    }
    setShareCodeInput(normalized);
    setActiveShareCode(normalized);
  };

  const canLoadShareCode = !loading && shareCodeInput.trim().length > 0;
  const canAddTask =
    Boolean(taskList) && !isAddingTask && newTaskText.trim().length > 0;

  const handleAddTask = async () => {
    if (!taskList) return;
    const trimmedText = newTaskText.trim();
    if (trimmedText.length === 0) return;

    setIsAddingTask(true);
    setAddTaskError(null);
    try {
      await addTask(taskList.id, trimmedText);
      setNewTaskText("");
    } catch (err) {
      if (err instanceof Error && err.message) {
        setAddTaskError(err.message);
      } else {
        setAddTaskError(t("pages.sharecode.addTaskError"));
      }
    } finally {
      setIsAddingTask(false);
    }
  };

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
    if (!taskList || !editingTaskId) return;
    const trimmedText = editingTaskText.trim();
    if (!trimmedText) return;
    const normalizedDate = editingTaskDate.trim();
    setIsUpdatingTask(true);
    setError(null);
    try {
      await updateTask(taskList.id, editingTaskId, {
        text: trimmedText,
        date: normalizedDate,
      });
      cancelEditTask();
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleReorderTask = async (
    draggedTaskId: string,
    targetTaskId: string,
  ) => {
    if (!taskList) return;
    if (!draggedTaskId || !targetTaskId) return;
    if (draggedTaskId === targetTaskId) return;
    setIsReorderingTasks(true);
    setError(null);
    try {
      await updateTasksOrder(taskList.id, draggedTaskId, targetTaskId);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    } finally {
      setIsReorderingTasks(false);
    }
  };

  const handleSortTasks = async () => {
    if (!taskList) return;
    setIsSortingTasks(true);
    setError(null);
    try {
      await sortTasks(taskList.id);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    } finally {
      setIsSortingTasks(false);
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!taskList) return;
    setIsDeletingCompletedTasks(true);
    setError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    } finally {
      setIsDeletingCompletedTasks(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!taskList) return;
    try {
      await updateTask(taskList.id, task.id, { completed: !task.completed });
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    }
  };

  const confirmDeleteCompletedTasks = () => {
    if (!taskList || completedTasksCount === 0) return;
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

  const handleDeleteTask = async (task: Task) => {
    if (!taskList) return;
    try {
      await deleteTask(taskList.id, task.id);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    }
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert(t("taskList.deleteTask"), t("taskList.deleteTaskConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("taskList.deleteTask"),
        style: "destructive",
        onPress: () => {
          void handleDeleteTask(task);
        },
      },
    ]);
  };

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    setAddToOrderLoading(true);
    setAddToOrderError(null);
    try {
      await addSharedTaskListToOrder(taskList.id);
      onOpenTaskList();
    } catch (err) {
      if (err instanceof Error && err.message) {
        setAddToOrderError(err.message);
      } else {
        setAddToOrderError(t("pages.sharecode.addToOrderError"));
      }
    } finally {
      setAddToOrderLoading(false);
    }
  };

  return (
    <FlatList
      data={taskListTasks}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.appContent}
      ItemSeparatorComponent={() => (
        <View
          style={[styles.taskSeparator, { backgroundColor: theme.border }]}
        />
      )}
      ListHeaderComponent={
        <View>
          <View style={styles.settingsHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              onPress={onBack}
              style={({ pressed }) => [
                styles.headerButton,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[styles.headerButtonText, { color: theme.text }]}>
                {t("common.back")}
              </Text>
            </Pressable>
            <Text style={[styles.settingsTitle, { color: theme.text }]}>
              {t("pages.sharecode.title")}
            </Text>
            {user ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("pages.sharecode.addToOrder")}
                onPress={handleAddToOrder}
                disabled={!taskList || addToOrderLoading}
                style={({ pressed }) => [
                  styles.headerButton,
                  {
                    borderColor: theme.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={[styles.headerButtonText, { color: theme.text }]}>
                  {addToOrderLoading
                    ? t("pages.sharecode.addToOrderLoading")
                    : t("pages.sharecode.addToOrder")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.helpText, { color: theme.muted }]}>
              {t("pages.sharecode.description")}
            </Text>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("pages.sharecode.codeLabel")}
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
                value={shareCodeInput}
                onChangeText={(value) => {
                  setShareCodeInput(value);
                  setError(null);
                }}
                placeholder={t("pages.sharecode.codePlaceholder")}
                placeholderTextColor={theme.placeholder}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleShareCodeSubmit}
                editable={!loading}
                accessibilityLabel={t("pages.sharecode.codeLabel")}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("pages.sharecode.load")}
              onPress={handleShareCodeSubmit}
              disabled={!canLoadShareCode}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: canLoadShareCode
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
                    color: canLoadShareCode ? theme.primaryText : theme.muted,
                  },
                ]}
              >
                {loading ? t("common.loading") : t("pages.sharecode.load")}
              </Text>
            </Pressable>
            {loading ? <ActivityIndicator color={theme.primary} /> : null}
            {error ? (
              <Text style={[styles.error, { color: theme.error }]}>
                {error}
              </Text>
            ) : null}
            {addToOrderError ? (
              <Text style={[styles.error, { color: theme.error }]}>
                {addToOrderError}
              </Text>
            ) : null}
          </View>

          {taskList ? (
            <View style={styles.section}>
              <View style={styles.taskHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {taskList.name || t("app.taskListName")}
                </Text>
                <Text style={[styles.taskCount, { color: theme.muted }]}>
                  {t("taskList.taskCount", { count: taskList.tasks.length })}
                </Text>
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
                        color: canDeleteCompletedTasks
                          ? theme.error
                          : theme.muted,
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
                  onChangeText={(value) => {
                    setNewTaskText(value);
                    setAddTaskError(null);
                  }}
                  placeholder={t("taskList.addTaskPlaceholder")}
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={handleAddTask}
                  editable={!isAddingTask}
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
                      backgroundColor: canAddTask
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
                        color: canAddTask ? theme.primaryText : theme.muted,
                      },
                    ]}
                  >
                    {t("taskList.addTask")}
                  </Text>
                </Pressable>
              </View>
              {addTaskError ? (
                <Text style={[styles.error, { color: theme.error }]}>
                  {addTaskError}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        taskList && !loading ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("pages.tasklist.noTasks")}
          </Text>
        ) : null
      }
      renderItem={({ item, index }) => {
        const isEditing = editingTaskId === item.id;
        const canMoveTaskUp = !isEditing && !isReorderingTasks && index > 0;
        const canMoveTaskDown =
          !isEditing && !isReorderingTasks && index < taskListTasks.length - 1;
        const canSaveTask =
          !isUpdatingTask && editingTaskText.trim().length > 0;

        const handleMoveTaskUp = () => {
          if (!canMoveTaskUp) return;
          const targetTask = taskListTasks[index - 1];
          if (!targetTask) return;
          void handleReorderTask(item.id, targetTask.id);
        };

        const handleMoveTaskDown = () => {
          if (!canMoveTaskDown) return;
          const targetTask = taskListTasks[index + 1];
          if (!targetTask) return;
          void handleReorderTask(item.id, targetTask.id);
        };

        return (
          <View style={styles.taskItem}>
            <View style={styles.taskRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.toggleComplete")}
                onPress={() => {
                  void handleToggleTask(item);
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
                    accessibilityLabel={t("app.moveUp")}
                    onPress={handleMoveTaskUp}
                    disabled={!canMoveTaskUp}
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
                        { color: canMoveTaskUp ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.moveUp")}
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
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.moveDown")}
                    onPress={handleMoveTaskDown}
                    disabled={!canMoveTaskDown}
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
                        { color: canMoveTaskDown ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.moveDown")}
                    </Text>
                  </Pressable>
                )}
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
                confirmDeleteTask(item);
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
