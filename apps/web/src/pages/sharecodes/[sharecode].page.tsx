import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { AppState, Task, User } from "@lightlist/sdk/types";
import {
  fetchTaskListIdByShareCode,
  addTask,
  updateTask,
  deleteTask,
  updateTasksOrder,
  addSharedTaskListToOrder,
} from "@lightlist/sdk/mutations/app";
import { appStore } from "@lightlist/sdk/store";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type OptimisticOrder = {
  ids: string[];
  startedAt: number;
};

export default function ShareCodePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sharecode } = router.query;

  const [storeState, setStoreState] = useState<AppState>(() =>
    appStore.getState(),
  );
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [optimisticTaskOrder, setOptimisticTaskOrder] =
    useState<OptimisticOrder | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const sharedTaskListUnsubscribeRef = useRef<(() => void) | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = appStore.subscribe((newState) => {
      setStoreState(newState);
    });
    setStoreState(appStore.getState());
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sharecode || typeof sharecode !== "string") return;

    let cancelled = false;
    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        const taskListId = await fetchTaskListIdByShareCode(sharecode);
        if (cancelled) return;
        if (!taskListId) {
          setSharedTaskListId(null);
          setError(t("pages.sharecode.notFound"));
          sharedTaskListUnsubscribeRef.current?.();
          sharedTaskListUnsubscribeRef.current = null;
          return;
        }

        setSharedTaskListId(taskListId);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current =
          appStore.subscribeToSharedTaskList(taskListId);
      } catch (err) {
        setError(resolveErrorMessage(err, t, "pages.sharecode.error"));
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTaskList();
    return () => {
      cancelled = true;
    };
  }, [sharecode, t]);

  useEffect(
    () => () => {
      sharedTaskListUnsubscribeRef.current?.();
    },
    [],
  );

  const taskList =
    sharedTaskListId === null
      ? null
      : (storeState.taskLists.find((tl) => tl.id === sharedTaskListId) ??
        storeState.sharedTaskListsById[sharedTaskListId] ??
        null);

  useEffect(() => {
    if (!optimisticTaskOrder) return;
    if (!taskList || taskList.id !== sharedTaskListId) {
      setOptimisticTaskOrder(null);
      return;
    }
    if (taskList.updatedAt >= optimisticTaskOrder.startedAt) {
      setOptimisticTaskOrder(null);
    }
  }, [optimisticTaskOrder, sharedTaskListId, taskList]);

  const handleAddTask = async () => {
    if (!taskList) return;
    const trimmedText = newTaskText.trim();
    if (trimmedText === "") return;

    try {
      setIsAddingTask(true);
      setAddTaskError(null);
      await addTask(taskList.id, trimmedText);
      setNewTaskText("");
    } catch (err) {
      setAddTaskError(
        resolveErrorMessage(err, t, "pages.sharecode.addTaskError"),
      );
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const handleEditEnd = async (task: Task) => {
    if (!taskList) return;

    const trimmedText = editingText.trim();
    if (trimmedText === "") {
      setEditingTaskId(null);
      return;
    }

    if (trimmedText === task.text) {
      setEditingTaskId(null);
      return;
    }

    try {
      await updateTask(taskList.id, task.id, { text: trimmedText });
      setEditingTaskId(null);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.updateError"));
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!taskList) return;

    try {
      await updateTask(taskList.id, task.id, {
        completed: !task.completed,
      });
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.updateError"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskList) return;

    try {
      await deleteTask(taskList.id, taskId);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.deleteError"));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!taskList) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = getStringId(active.id);
    const overId = getStringId(over.id);
    if (!activeId || !overId) return;

    const baseTaskIds = optimisticTaskOrder
      ? optimisticTaskOrder.ids
      : taskList.tasks.map((task) => task.id);
    const oldIndex = baseTaskIds.indexOf(activeId);
    const newIndex = baseTaskIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    setOptimisticTaskOrder({
      ids: arrayMove(baseTaskIds, oldIndex, newIndex),
      startedAt: Date.now(),
    });

    try {
      await updateTasksOrder(taskList.id, activeId, overId);
    } catch (err) {
      setOptimisticTaskOrder(null);
      setError(resolveErrorMessage(err, t, "pages.sharecode.reorderError"));
    }
  };

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    try {
      setAddToOrderLoading(true);
      setAddToOrderError(null);
      await addSharedTaskListToOrder(taskList.id);
      router.push("/app");
    } catch (err) {
      setAddToOrderError(
        resolveErrorMessage(err, t, "pages.sharecode.addToOrderError"),
      );
    } finally {
      setAddToOrderLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div>
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList) return <Spinner />;

  if (!taskList) {
    return (
      <div>
        <div>
          <p>{t("pages.sharecode.notFound")}</p>
        </div>
      </div>
    );
  }

  const optimisticTasks = optimisticTaskOrder
    ? optimisticTaskOrder.ids
        .map((taskId) => taskList.tasks.find((task) => task.id === taskId))
        .filter((task): task is Task => Boolean(task))
    : null;
  const tasks = optimisticTasks ?? taskList.tasks;

  return (
    <div>
      <div>
        <button onClick={() => router.back()}>{t("common.back")}</button>
        {user && (
          <button onClick={handleAddToOrder} disabled={addToOrderLoading}>
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </div>

      {addToOrderError && <Alert variant="error">{addToOrderError}</Alert>}

      <h1>{taskList.name}</h1>

      <TaskListPanel
        tasks={tasks}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        editingTaskId={editingTaskId}
        editingText={editingText}
        onEditingTextChange={setEditingText}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
        onToggle={handleToggleTask}
        onDelete={handleDeleteTask}
        newTaskText={newTaskText}
        onNewTaskTextChange={setNewTaskText}
        onAddTask={handleAddTask}
        addButtonLabel={t("common.add")}
        addPlaceholder={t("pages.tasklist.addTaskPlaceholder")}
        deleteLabel={t("common.delete")}
        dragHintLabel={t("pages.tasklist.dragHint")}
        emptyLabel={t("pages.tasklist.noTasks")}
        addDisabled={isAddingTask}
        inputDisabled={isAddingTask}
        addError={addTaskError}
        variant="card"
      />
    </div>
  );
}
