import {
  doc,
  updateDoc,
  setDoc,
  deleteField,
  collection,
  writeBatch,
  runTransaction,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import {
  Settings,
  Task,
  TaskListOrderStore,
  TaskListStore,
  TaskListStoreTask,
} from "../types";
import { appStore } from "../store";

function getAutoSortedTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  const getDateValue = (task: TaskListStoreTask): number => {
    if (!task.date) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(task.date);
    if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
    return parsed;
  };

  return [...tasks]
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      const aDate = getDateValue(a);
      const bDate = getDateValue(b);
      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return a.order - b.order;
    })
    .map((task, index) => ({
      ...task,
      order: (index + 1) * 1.0,
    }));
}

async function getTaskListData(taskListId: string): Promise<TaskListStore> {
  const cached = appStore.getData().taskLists[taskListId];
  if (cached) return cached;

  const snapshot = await getDoc(doc(db, "taskLists", taskListId));
  if (!snapshot.exists()) throw new Error("Task list not found");
  return snapshot.data() as TaskListStore;
}

export async function updateSettings(settings: Partial<Settings>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const now = Date.now();
  await setDoc(
    doc(db, "settings", uid),
    {
      ...settings,
      updatedAt: now,
    },
    { merge: true },
  );
}

/**
 * TaskList 並び順更新（ドラッグ&ドロップ時）
 * 浮動小数 order を使用し、ドラッグされた TaskList のみの order 更新で完結
 *
 * @param draggedTaskListId ドラッグされた TaskList ID
 * @param targetTaskListId ドロップ先 TaskList ID（この前に挿入）
 */
export async function updateTaskListOrder(
  draggedTaskListId: string,
  targetTaskListId: string,
) {
  const data = appStore.getData();

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");
  if (draggedTaskListId === targetTaskListId) return;

  if (!data.taskListOrder) throw new Error("TaskListOrder not found");

  const taskListOrders = Object.entries(data.taskListOrder)
    .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
    .map(([id, value]) => ({
      id,
      order: (value as { order: number }).order,
    }))
    .sort((a, b) => a.order - b.order);

  const draggedIndex = taskListOrders.findIndex(
    (item) => item.id === draggedTaskListId,
  );
  if (draggedIndex === -1) throw new Error("Task list not found");

  const targetIndexBeforeRemoval = taskListOrders.findIndex(
    (item) => item.id === targetTaskListId,
  );
  if (targetIndexBeforeRemoval === -1) throw new Error("Task list not found");
  const [dragged] = taskListOrders.splice(draggedIndex, 1);

  taskListOrders.splice(targetIndexBeforeRemoval, 0, dragged);

  const now = Date.now();

  const updateData: Record<string, unknown> = { updatedAt: now };
  taskListOrders.forEach((item, index) => {
    updateData[item.id] = { order: (index + 1) * 1.0 };
  });
  await updateDoc(doc(db, "taskListOrder", uid), updateData);
}

export async function createTaskList(
  name: string,
  background: string = "#ffffff",
) {
  const data = appStore.getData();

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const taskListId = doc(collection(db, "taskLists")).id;

  const taskListOrders =
    Object.entries(data.taskListOrder || {})
      .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
      .map(([, value]) => (value as { order: number }).order) || [];

  let newOrder: number;
  if (taskListOrders.length === 0) {
    newOrder = 1.0;
  } else {
    const maxOrder = Math.max(...taskListOrders);
    newOrder = maxOrder + 1.0;
  }

  const now = Date.now();
  const newTaskList: TaskListStore = {
    id: taskListId,
    name,
    tasks: {},
    history: [],
    shareCode: null,
    background,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "taskLists", taskListId), newTaskList);
  batch.update(doc(db, "taskListOrder", uid), {
    [taskListId]: { order: newOrder },
    updatedAt: now,
  });
  await batch.commit();

  return taskListId;
}

export async function updateTaskList(
  taskListId: string,
  updates: Partial<Omit<TaskListStore, "id" | "createdAt" | "updatedAt">>,
) {
  const now = Date.now();
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: now,
  };
  await updateDoc(doc(db, "taskLists", taskListId), updateData);
}

export async function deleteTaskList(taskListId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const now = Date.now();

  const batch = writeBatch(db);
  batch.delete(doc(db, "taskLists", taskListId));
  batch.update(doc(db, "taskListOrder", uid), {
    [taskListId]: deleteField(),
    updatedAt: now,
  });
  await batch.commit();
}

export async function addTask(
  taskListId: string,
  text: string,
  date: string = "",
) {
  const data = appStore.getData();
  const normalizedText = text.trim();
  if (normalizedText === "") throw new Error("Task text is empty");

  const taskId = doc(collection(db, "taskLists")).id;

  const taskListData: TaskListStore = data.taskLists[taskListId];
  if (!taskListData) throw new Error("Task list not found");

  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const tasks = Object.values(taskListData.tasks).sort(
    (a, b) => a.order - b.order,
  );
  const insertPosition =
    data.settings?.taskInsertPosition === "top" ? "top" : "bottom";
  const insertIndex = insertPosition === "top" ? 0 : tasks.length;

  const now = Date.now();
  const newTask: TaskListStoreTask = {
    id: taskId,
    text: normalizedText,
    completed: false,
    date,
    order: 0,
  };

  const reorderedTasks = [...tasks];
  reorderedTasks.splice(insertIndex, 0, newTask);
  const normalizedTasks = autoSortEnabled
    ? getAutoSortedTasks(reorderedTasks)
    : reorderedTasks.map((task, index) => ({
        ...task,
        order: (index + 1) * 1.0,
      }));

  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    normalizedTasks.forEach((task) => {
      if (task.id === taskId) {
        updateData[`tasks.${task.id}`] = task;
      } else {
        updateData[`tasks.${task.id}.order`] = task.order;
      }
    });

    const history = (taskListData.history || [])
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const normalizedTextLower = normalizedText.toLowerCase();
    const existingIndex = history.findIndex(
      (item) => item.toLowerCase() === normalizedTextLower,
    );
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }

    history.unshift(normalizedText);
    while (history.length > 300) {
      history.pop();
    }
    updateData.history = history;

    transaction.update(taskListRef, updateData);
  });

  return taskId;
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Task>,
) {
  const now = Date.now();
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    const updateData: Record<string, unknown> = { updatedAt: now };
    Object.entries(updates).forEach(([key, value]) => {
      updateData[`tasks.${taskId}.${key}`] = value;
    });
    await updateDoc(taskListRef, updateData);
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const updatedTasks = Object.values(taskListData.tasks).map((task) =>
    task.id === taskId ? { ...task, ...updates } : task,
  );
  const normalizedTasks = getAutoSortedTasks(updatedTasks);

  await runTransaction(db, async (transaction) => {
    const updateData: Record<string, unknown> = { updatedAt: now };
    normalizedTasks.forEach((task) => {
      if (task.id === taskId) {
        updateData[`tasks.${task.id}`] = task;
      } else {
        updateData[`tasks.${task.id}.order`] = task.order;
      }
    });
    transaction.update(taskListRef, updateData);
  });
}

export async function deleteTask(taskListId: string, taskId: string) {
  const now = Date.now();
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    await updateDoc(taskListRef, {
      [`tasks.${taskId}`]: deleteField(),
      updatedAt: now,
    });
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const remainingTasks = Object.values(taskListData.tasks).filter(
    (task) => task.id !== taskId,
  );
  const normalizedTasks = getAutoSortedTasks(remainingTasks);

  await runTransaction(db, async (transaction) => {
    const updateData: Record<string, unknown> = {
      [`tasks.${taskId}`]: deleteField(),
      updatedAt: now,
    };

    normalizedTasks.forEach((task) => {
      updateData[`tasks.${task.id}.order`] = task.order;
    });

    transaction.update(taskListRef, updateData);
  });
}

/**
 * タスク並び順更新（ドラッグ&ドロップ時）
 * 浮動小数 order を使用し、ドラッグされたタスクのみの order 更新で完結
 *
 * @param taskListId タスクリスト ID
 * @param draggedTaskId ドラッグされたタスク ID
 * @param targetTaskId ドロップ先タスク ID（この前に挿入）
 */
export async function updateTasksOrder(
  taskListId: string,
  draggedTaskId: string,
  targetTaskId: string,
) {
  const taskListData = await getTaskListData(taskListId);
  if (draggedTaskId === targetTaskId) return;

  const tasks = Object.values(taskListData.tasks).sort(
    (a, b) => a.order - b.order,
  );
  const draggedIndex = tasks.findIndex((task) => task.id === draggedTaskId);
  if (draggedIndex === -1) throw new Error("Task not found");

  const targetIndexBeforeRemoval = tasks.findIndex(
    (task) => task.id === targetTaskId,
  );
  if (targetIndexBeforeRemoval === -1) throw new Error("Task not found");

  const [draggedTask] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndexBeforeRemoval, 0, draggedTask);
  const normalizedTasks = tasks.map((task, index) => ({
    ...task,
    order: (index + 1) * 1.0,
  }));

  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const updateData: Record<string, unknown> = { updatedAt: now };
    normalizedTasks.forEach((task) => {
      updateData[`tasks.${task.id}.order`] = task.order;
    });
    transaction.update(taskListRef, updateData);
  });
}

export async function sortTasks(taskListId: string): Promise<void> {
  const taskListData = await getTaskListData(taskListId);
  const tasks = Object.values(taskListData.tasks);
  if (tasks.length < 2) return;

  const normalizedTasks = getAutoSortedTasks(tasks);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const updateData: Record<string, unknown> = { updatedAt: now };
    normalizedTasks.forEach((task) => {
      updateData[`tasks.${task.id}.order`] = task.order;
    });
    transaction.update(taskListRef, updateData);
  });
}

export async function deleteCompletedTasks(
  taskListId: string,
): Promise<number> {
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);

  const taskListData = await getTaskListData(taskListId);
  const tasks = Object.values(taskListData.tasks);
  const completedTasks = tasks.filter((task) => task.completed);
  if (completedTasks.length === 0) return 0;

  const remainingTasks = tasks.filter((task) => !task.completed);
  const normalizedRemainingTasks = autoSortEnabled
    ? getAutoSortedTasks(remainingTasks)
    : [...remainingTasks]
        .sort((a, b) => a.order - b.order)
        .map((task, index) => ({
          ...task,
          order: (index + 1) * 1.0,
        }));

  const now = Date.now();
  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const updateData: Record<string, unknown> = { updatedAt: now };

    completedTasks.forEach((task) => {
      updateData[`tasks.${task.id}`] = deleteField();
    });
    normalizedRemainingTasks.forEach((task) => {
      updateData[`tasks.${task.id}.order`] = task.order;
    });

    transaction.update(taskListRef, updateData);
  });

  return completedTasks.length;
}

function generateRandomShareCode(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateShareCode(taskListId: string): Promise<string> {
  const data = appStore.getData();

  if (!data.taskLists[taskListId]) {
    throw new Error("Task list not found");
  }

  while (true) {
    const shareCode = generateRandomShareCode();
    const reserved = await runTransaction(
      db,
      async (transaction): Promise<string | null> => {
        const shareCodeRef = doc(db, "shareCodes", shareCode);
        const shareCodeSnapshot = await transaction.get(shareCodeRef);
        if (shareCodeSnapshot.exists()) {
          return null;
        }

        const taskListRef = doc(db, "taskLists", taskListId);
        const taskListSnapshot = await transaction.get(taskListRef);
        if (!taskListSnapshot.exists()) {
          throw new Error("Task list not found");
        }
        const currentShareCode = (taskListSnapshot.data() as TaskListStore)
          .shareCode;
        if (currentShareCode) {
          transaction.delete(doc(db, "shareCodes", currentShareCode));
        }

        const now = Date.now();
        transaction.set(shareCodeRef, { taskListId, createdAt: now });
        transaction.update(taskListRef, { shareCode, updatedAt: now });
        return shareCode;
      },
    );

    if (reserved) {
      return reserved;
    }
  }
}

export async function removeShareCode(taskListId: string): Promise<void> {
  const data = appStore.getData();

  if (!data.taskLists[taskListId]) {
    throw new Error("Task list not found");
  }

  const now = Date.now();
  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);
    if (!taskListSnapshot.exists()) {
      throw new Error("Task list not found");
    }
    const currentShareCode = (taskListSnapshot.data() as TaskListStore)
      .shareCode;
    if (currentShareCode) {
      transaction.delete(doc(db, "shareCodes", currentShareCode));
    }
    transaction.update(taskListRef, {
      shareCode: null,
      updatedAt: now,
    });
  });
}

export async function fetchTaskListIdByShareCode(
  shareCode: string,
): Promise<string | null> {
  const shareCodeRef = doc(db, "shareCodes", shareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const data = shareCodeSnapshot.data() as { taskListId?: string };
  return data.taskListId ?? null;
}

export async function fetchTaskListByShareCode(
  shareCode: string,
): Promise<TaskListStore | null> {
  const shareCodeRef = doc(db, "shareCodes", shareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const { taskListId } = shareCodeSnapshot.data() as { taskListId: string };
  const taskListRef = doc(db, "taskLists", taskListId);
  const taskListSnapshot = await getDoc(taskListRef);
  if (!taskListSnapshot.exists()) {
    return null;
  }

  return taskListSnapshot.data() as TaskListStore;
}

export async function addSharedTaskListToOrder(
  taskListId: string,
): Promise<void> {
  const data = appStore.getData();

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  if (!data.taskListOrder) {
    throw new Error("TaskListOrder not found");
  }

  if (data.taskListOrder[taskListId]) {
    throw new Error("This task list is already in your order");
  }

  const taskListOrders =
    Object.entries(data.taskListOrder)
      .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
      .map(([, value]) => (value as { order: number }).order) || [];

  let newOrder: number;
  if (taskListOrders.length === 0) {
    newOrder = 1.0;
  } else {
    const maxOrder = Math.max(...taskListOrders);
    newOrder = maxOrder + 1.0;
  }

  const now = Date.now();

  await updateDoc(doc(db, "taskListOrder", uid), {
    [taskListId]: { order: newOrder },
    updatedAt: now,
  });
}
