import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { MdArrowBack } from "react-icons/md";
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
  updateTasksOrder,
  sortTasks,
  deleteCompletedTasks,
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
  const [optimisticAddedTasks, setOptimisticAddedTasks] = useState<Task[]>([]);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
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
  const taskInsertPosition =
    storeState.settings?.taskInsertPosition === "top" ? "top" : "bottom";

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

  useEffect(() => {
    if (optimisticAddedTasks.length === 0) return;
    if (!taskList) return;
    const existingIds = new Set(taskList.tasks.map((task) => task.id));
    const next = optimisticAddedTasks.filter(
      (task) => !existingIds.has(task.id),
    );
    if (next.length === optimisticAddedTasks.length) return;
    setOptimisticAddedTasks(next);
  }, [optimisticAddedTasks, taskList]);

  const handleAddTask = () => {
    if (!taskList) return;
    const trimmedText = newTaskText.trim();
    if (trimmedText === "") return;

    const tempTaskId = `optimistic-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const optimisticTask: Task = {
      id: tempTaskId,
      text: trimmedText,
      completed: false,
      date: "",
    };

    setAddTaskError(null);
    setOptimisticAddedTasks((prev) =>
      taskInsertPosition === "top"
        ? [optimisticTask, ...prev]
        : [...prev, optimisticTask],
    );
    setNewTaskText("");

    void (async () => {
      try {
        const createdTaskId = await addTask(taskList.id, trimmedText);
        setOptimisticAddedTasks((prev) =>
          prev.map((task) =>
            task.id === tempTaskId ? { ...task, id: createdTaskId } : task,
          ),
        );
      } catch (err) {
        setOptimisticAddedTasks((prev) =>
          prev.filter((task) => task.id !== tempTaskId),
        );
        setAddTaskError(
          resolveErrorMessage(err, t, "pages.sharecode.addTaskError"),
        );
        setNewTaskText((current) =>
          current.trim() === "" ? trimmedText : current,
        );
      }
    })();
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

  const handleChangeTaskDate = async (taskId: string, date: string) => {
    if (!taskList) return;

    try {
      await updateTask(taskList.id, taskId, { date });
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.updateError"));
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

  const handleSortTasks = async () => {
    if (!taskList) return;

    setError(null);
    try {
      await sortTasks(taskList.id);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.reorderError"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!taskList) return;

    setError(null);
    try {
      await deleteCompletedTasks(taskList.id);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.deleteError"));
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

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );

  if (error) {
    return (
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white p-4 shadow-sm dark:bg-gray-800">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t("common.back")}
          >
            <MdArrowBack className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList)
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );

  if (!taskList) {
    return (
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white p-4 shadow-sm dark:bg-gray-800">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t("common.back")}
          >
            <MdArrowBack className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  const optimisticTasks = optimisticTaskOrder
    ? optimisticTaskOrder.ids
        .map((taskId) => taskList.tasks.find((task) => task.id === taskId))
        .filter((task): task is Task => Boolean(task))
    : null;
  const baseTasks = optimisticTasks ?? taskList.tasks;
  const baseTaskIds = new Set(baseTasks.map((task) => task.id));
  const pendingTasks = optimisticAddedTasks.filter(
    (task) => !baseTaskIds.has(task.id),
  );
  const tasks = [
    ...(taskInsertPosition === "top" ? pendingTasks : baseTasks),
    ...(taskInsertPosition === "top" ? baseTasks : pendingTasks),
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label={t("common.back")}
        >
          <MdArrowBack className="h-6 w-6" />
        </button>
        {user && (
          <button
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-3xl">
          {addToOrderError && (
            <div className="mb-4">
              <Alert variant="error">{addToOrderError}</Alert>
            </div>
          )}

          <h1 className="mb-6 truncate text-2xl font-bold text-gray-900 dark:text-white">
            {taskList.name}
          </h1>

          <TaskListPanel
            tasks={tasks}
            sensors={sensors}
            onSortTasks={handleSortTasks}
            onDeleteCompletedTasks={handleDeleteCompletedTasks}
            onDragEnd={handleDragEnd}
            editingTaskId={editingTaskId}
            editingText={editingText}
            onEditingTextChange={setEditingText}
            onEditStart={handleEditStart}
            onEditEnd={handleEditEnd}
            onToggle={handleToggleTask}
            onDateChange={handleChangeTaskDate}
            newTaskText={newTaskText}
            onNewTaskTextChange={setNewTaskText}
            onAddTask={handleAddTask}
            addButtonLabel={t("common.add")}
            addPlaceholder={t("pages.tasklist.addTaskPlaceholder")}
            setDateLabel={t("pages.tasklist.setDate")}
            dragHintLabel={t("pages.tasklist.dragHint")}
            emptyLabel={t("pages.tasklist.noTasks")}
            addError={addTaskError}
          />
        </div>
      </main>
    </div>
  );
}
