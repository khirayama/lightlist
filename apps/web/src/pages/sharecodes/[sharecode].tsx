"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { User, TaskListStore, TaskListStoreTask } from "@lightlist/sdk/types";
import {
  fetchTaskListByShareCode,
  addTask,
  updateTask,
  deleteTask,
  updateTasksOrder,
  addSharedTaskListToOrder,
} from "@lightlist/sdk/mutations/app";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";

export default function ShareCodePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sharecode } = router.query;

  const [taskList, setTaskList] = useState<TaskListStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);

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

  const refreshTaskList = async () => {
    if (!sharecode || typeof sharecode !== "string") return null;
    const updatedTaskList = await fetchTaskListByShareCode(sharecode);
    if (updatedTaskList) {
      setTaskList(updatedTaskList);
    }
    return updatedTaskList;
  };

  useEffect(() => {
    if (!sharecode || typeof sharecode !== "string") return;

    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTaskListByShareCode(sharecode);
        if (!data) {
          setError(t("pages.sharecode.notFound"));
          setTaskList(null);
        } else {
          setTaskList(data);
        }
      } catch (err: unknown) {
        setError(resolveErrorMessage(err, t, "pages.sharecode.error"));
        setTaskList(null);
      } finally {
        setLoading(false);
      }
    };

    loadTaskList();
  }, [sharecode, t]);

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !taskList) return;

    try {
      setIsAddingTask(true);
      setAddTaskError(null);
      await addTask(taskList.id, newTaskText);
      setNewTaskText("");

      await refreshTaskList();
    } catch (err: unknown) {
      setAddTaskError(
        resolveErrorMessage(err, t, "pages.sharecode.addTaskError"),
      );
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleEditStart = (task: TaskListStoreTask) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const handleEditEnd = async (task: TaskListStoreTask) => {
    if (!taskList) return;

    if (editingText.trim() === "") {
      setEditingTaskId(null);
      return;
    }

    if (editingText === task.text) {
      setEditingTaskId(null);
      return;
    }

    try {
      await updateTask(taskList.id, task.id, { text: editingText });
      await refreshTaskList();
      setEditingTaskId(null);
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.updateError"));
    }
  };

  const handleToggleTask = async (task: TaskListStoreTask) => {
    if (!taskList) return;

    try {
      await updateTask(taskList.id, task.id, {
        completed: !task.completed,
      });
      await refreshTaskList();
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.updateError"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskList) return;

    try {
      await deleteTask(taskList.id, taskId);
      await refreshTaskList();
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "pages.sharecode.deleteError"));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!taskList) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      await updateTasksOrder(
        taskList.id,
        active.id as string,
        over.id as string,
      );
      await refreshTaskList();
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex items-center justify-center">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!taskList) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  const tasks = Object.values(taskList.tasks || {}).sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div
      className="min-h-screen p-4 md:p-8 bg-white dark:bg-gray-950"
      style={{ backgroundColor: taskList.background }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            ← {t("common.back")}
          </button>
          {user && (
            <button
              onClick={handleAddToOrder}
              disabled={addToOrderLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {addToOrderLoading
                ? t("common.loading")
                : t("pages.sharecode.addToOrder")}
            </button>
          )}
        </div>

        {addToOrderError && (
          <Alert variant="error" className="mb-4">
            {addToOrderError}
          </Alert>
        )}

        <h1 className="text-3xl font-bold mb-8">{taskList.name}</h1>

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
    </div>
  );
}
