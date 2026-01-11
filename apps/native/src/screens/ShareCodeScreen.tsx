import type { TFunction } from "i18next";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const arrayMove = <T,>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};
import {
  ActivityIndicator,
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
  fetchTaskListIdByShareCode,
  sortTasks,
  updateTask,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { TaskListPanel } from "../components/app/TaskListPanel";
import { styles } from "../styles/appStyles";
import type { Theme } from "../styles/theme";

type ShareCodeScreenProps = {
  t: TFunction;
  theme: Theme;
  initialShareCode: string | null;
  onBack: () => void;
  onOpenTaskList: () => void;
};

const EMPTY_TASKS: Task[] = [];

export const ShareCodeScreen = ({
  t,
  theme,
  initialShareCode,
  onBack,
  onOpenTaskList,
}: ShareCodeScreenProps) => {
  const storeState = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const sharedTaskListUnsubscribeRef = useRef<(() => void) | null>(null);

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
      } catch {
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
  const [localTasks, setLocalTasks] = useState<Task[]>(EMPTY_TASKS);

  useEffect(() => {
    setLocalTasks(taskList?.tasks ?? EMPTY_TASKS);
  }, [taskList?.tasks]);

  const taskListTasks = localTasks;

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [sharedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const exists = taskListTasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, taskListTasks]);

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

  const handleAddTask = useCallback(async () => {
    if (!taskList) return;
    const trimmedText = newTaskText.trim();
    if (trimmedText.length === 0) return;

    setAddTaskError(null);
    setNewTaskText("");
    try {
      await addTask(taskList.id, trimmedText);
    } catch (err) {
      setNewTaskText(trimmedText);
      if (err instanceof Error && err.message) {
        setAddTaskError(err.message);
      } else {
        setAddTaskError(t("pages.sharecode.addTaskError"));
      }
    }
  }, [taskList, newTaskText, t]);

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!taskList) return;
      setError(null);
      try {
        await updateTask(taskList.id, taskId, updates);
      } catch (err) {
        if (err instanceof Error && err.message) {
          setError(err.message);
        } else {
          setError(t("pages.sharecode.updateError"));
        }
      }
    },
    [taskList, t],
  );

  const handleReorderTask = useCallback(
    async (draggedTaskId: string, targetTaskId: string) => {
      if (!taskList) return;
      if (!draggedTaskId || !targetTaskId) return;
      if (draggedTaskId === targetTaskId) return;

      const oldIndex = localTasks.findIndex((t) => t.id === draggedTaskId);
      const newIndex = localTasks.findIndex((t) => t.id === targetTaskId);

      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalTasks((prev) => arrayMove(prev, oldIndex, newIndex));
      }

      setError(null);
      try {
        await updateTasksOrder(taskList.id, draggedTaskId, targetTaskId);
      } catch (err) {
        setLocalTasks(taskList.tasks);
        if (err instanceof Error && err.message) {
          setError(err.message);
        } else {
          setError(t("pages.sharecode.updateError"));
        }
      }
    },
    [taskList, localTasks, t],
  );

  const handleSortTasks = useCallback(async () => {
    if (!taskList) return;
    setError(null);
    try {
      await sortTasks(taskList.id);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    }
  }, [taskList, t]);

  const handleDeleteCompletedTasks = useCallback(async () => {
    if (!taskList) return;
    setError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("pages.sharecode.updateError"));
      }
    }
  }, [taskList, t]);

  const handleToggleTask = useCallback(
    async (task: Task) => {
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
    },
    [taskList, t],
  );

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
      await handleUpdateTask(task.id, {
        text: trimmedText,
        date: normalizedDate,
      });
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
    },
    [editingTaskId, editingTaskText, editingTaskDate, handleUpdateTask],
  );

  const handleDateChange = useCallback(
    async (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      await handleUpdateTask(task.id, { date: normalizedDate });
    },
    [editingTaskId, handleUpdateTask],
  );

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

  const taskListHeader = (
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
              backgroundColor: canLoadShareCode ? theme.primary : theme.border,
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
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
        {addToOrderError ? (
          <Text style={[styles.error, { color: theme.error }]}>
            {addToOrderError}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.appContent, { paddingBottom: 0 }]}>
        {taskListHeader}
      </View>
      <TaskListPanel
        t={t}
        theme={theme}
        tasks={taskListTasks}
        newTaskText={newTaskText}
        taskListError={addTaskError}
        addDisabled={!taskList}
        emptyLabel={taskList ? t("pages.tasklist.noTasks") : ""}
        editingTaskId={editingTaskId}
        editingTaskText={editingTaskText}
        editingTaskDate={editingTaskDate}
        onEditingTaskTextChange={setEditingTaskText}
        onEditingTaskDateChange={setEditingTaskDate}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
        onDateChange={handleDateChange}
        onChangeNewTaskText={(value) => {
          setNewTaskText(value);
          setAddTaskError(null);
        }}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onReorderTask={handleReorderTask}
        onSortTasks={handleSortTasks}
        onDeleteCompletedTasks={handleDeleteCompletedTasks}
      />
    </View>
  );
};
