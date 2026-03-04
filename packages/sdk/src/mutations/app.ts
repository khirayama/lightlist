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
import { parseDateFromText } from "../utils/dateParser";
import { DEFAULT_LANGUAGE, normalizeLanguage } from "../utils/language";

const TASK_LIST_ORDER_METADATA_KEYS = new Set(["createdAt", "updatedAt"]);

function assertTaskListStore(data: unknown, id: string): TaskListStore {
  if (data == null) throw new Error(`TaskList not found: ${id}`);
  const d = data as Record<string, unknown>;
  if (
    typeof d.name !== "string" ||
    typeof d.tasks !== "object" ||
    d.tasks === null ||
    typeof d.memberCount !== "number"
  ) {
    throw new Error(`TaskList data is malformed: ${id}`);
  }
  return data as TaskListStore;
}

function assertTaskListOrderStore(
  data: unknown,
  uid: string,
): TaskListOrderStore {
  if (data == null) throw new Error(`TaskListOrder not found: ${uid}`);
  return data as TaskListOrderStore;
}

const getTaskListOrderEntries = (taskListOrder: TaskListOrderStore) => {
  return Object.entries(taskListOrder).filter(
    ([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key),
  );
};

const getValidMemberCount = (taskList: TaskListStore): number => {
  if (!Number.isInteger(taskList.memberCount) || taskList.memberCount < 1) {
    throw new Error("Invalid member count");
  }
  return taskList.memberCount;
};

const normalizeShareCode = (shareCode: string): string => {
  return shareCode.trim().toUpperCase();
};

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
  return assertTaskListStore(snapshot.data(), taskListId);
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
    .filter(([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key))
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
  background: string | null = null,
) {
  const data = appStore.getData();

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const taskListId = doc(collection(db, "taskLists")).id;

  const taskListOrders =
    Object.entries(data.taskListOrder || {})
      .filter(([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key))
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
    memberCount: 1,
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
  updates: Partial<Pick<TaskListStore, "name" | "background">>,
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

  await runTransaction(db, async (transaction) => {
    const now = Date.now();
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const taskListOrderSnapshot = await transaction.get(taskListOrderRef);
    if (!taskListOrderSnapshot.exists()) {
      throw new Error("TaskListOrder not found");
    }

    const taskListOrderData = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    if (!taskListOrderData[taskListId]) {
      throw new Error("Task list not found");
    }

    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);

    transaction.update(taskListOrderRef, {
      [taskListId]: deleteField(),
      updatedAt: now,
    });

    if (!taskListSnapshot.exists()) {
      return;
    }

    const taskListData = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    );
    const currentMemberCount = getValidMemberCount(taskListData);
    const nextMemberCount = currentMemberCount - 1;

    if (nextMemberCount <= 0) {
      if (taskListData.shareCode) {
        transaction.delete(doc(db, "shareCodes", taskListData.shareCode));
      }
      transaction.delete(taskListRef);
      return;
    }

    transaction.update(taskListRef, {
      memberCount: nextMemberCount,
      updatedAt: now,
    });
  });
}

export function generateTaskId(): string {
  return doc(collection(db, "taskLists")).id;
}

export async function addTask(
  taskListId: string,
  text: string,
  date: string = "",
  id?: string,
) {
  const data = appStore.getData();
  const language = normalizeLanguage(
    data.settings?.language ?? DEFAULT_LANGUAGE,
  );
  const { date: parsedDate, text: parsedTextRaw } = parseDateFromText(
    text.trim(),
    language,
  );
  const normalizedText = parsedTextRaw.trim();
  const finalDate = parsedDate || date;

  if (normalizedText === "") throw new Error("Task text is empty");

  const taskId = id || generateTaskId();

  const taskListData: TaskListStore = data.taskLists[taskListId];
  if (!taskListData) throw new Error("Task list not found");

  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const tasks = Object.values(taskListData.tasks).sort(
    (a, b) => a.order - b.order,
  );
  const insertPosition =
    data.settings?.taskInsertPosition === "bottom" ? "bottom" : "top";
  const insertIndex = insertPosition === "top" ? 0 : tasks.length;

  const now = Date.now();
  const newTask: TaskListStoreTask = {
    id: taskId,
    text: normalizedText,
    completed: false,
    date: finalDate,
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

  await updateDoc(taskListRef, updateData);

  return taskId;
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Task>,
) {
  const data = appStore.getData();
  const language = normalizeLanguage(
    data.settings?.language ?? DEFAULT_LANGUAGE,
  );
  const normalizedUpdates: Partial<Task> = { ...updates };
  if (normalizedUpdates.text) {
    const { date: parsedDate, text: parsedTextRaw } = parseDateFromText(
      normalizedUpdates.text.trim(),
      language,
    );
    if (parsedDate) {
      normalizedUpdates.date = parsedDate;
      normalizedUpdates.text = parsedTextRaw.trim();
    }
  }

  if (normalizedUpdates.text !== undefined && normalizedUpdates.text === "") {
    throw new Error("Task text is empty");
  }

  const now = Date.now();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    const updateData: Record<string, unknown> = { updatedAt: now };
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      updateData[`tasks.${taskId}.${key}`] = value;
    });
    await updateDoc(taskListRef, updateData);
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const updatedTasks = Object.values(taskListData.tasks).map((task) =>
    task.id === taskId ? { ...task, ...normalizedUpdates } : task,
  );
  const normalizedTasks = getAutoSortedTasks(updatedTasks);

  const updateData: Record<string, unknown> = { updatedAt: now };
  normalizedTasks.forEach((task) => {
    if (task.id === taskId) {
      updateData[`tasks.${task.id}`] = task;
    } else {
      updateData[`tasks.${task.id}.order`] = task.order;
    }
  });
  await updateDoc(taskListRef, updateData);
}

export async function deleteTask(taskListId: string, taskId: string) {
  const now = Date.now();
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    const updateData = {
      [`tasks.${taskId}`]: deleteField(),
      updatedAt: now,
    };
    await updateDoc(taskListRef, updateData);
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const remainingTasks = Object.values(taskListData.tasks).filter(
    (task) => task.id !== taskId,
  );
  const normalizedTasks = getAutoSortedTasks(remainingTasks);

  const updateData: Record<string, unknown> = {
    [`tasks.${taskId}`]: deleteField(),
    updatedAt: now,
  };

  normalizedTasks.forEach((task) => {
    updateData[`tasks.${task.id}.order`] = task.order;
  });

  await updateDoc(taskListRef, updateData);
}

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
  const insertionIndex = targetIndexBeforeRemoval;
  const previousTask = insertionIndex > 0 ? tasks[insertionIndex - 1] : null;
  const nextTask = insertionIndex < tasks.length ? tasks[insertionIndex] : null;

  let nextOrder = draggedTask.order;
  if (previousTask && nextTask) {
    nextOrder = (previousTask.order + nextTask.order) / 2;
  } else if (previousTask) {
    nextOrder = previousTask.order + 1;
  } else if (nextTask) {
    nextOrder = nextTask.order - 1;
  } else {
    nextOrder = 1;
  }

  const canUseSingleTaskUpdate =
    Number.isFinite(nextOrder) &&
    (!previousTask || nextOrder > previousTask.order) &&
    (!nextTask || nextOrder < nextTask.order);

  const now = Date.now();

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData: Record<string, unknown> = { updatedAt: now };
  if (canUseSingleTaskUpdate) {
    updateData[`tasks.${draggedTask.id}.order`] = nextOrder;
  } else {
    tasks.splice(insertionIndex, 0, draggedTask);
    tasks.forEach((task, index) => {
      updateData[`tasks.${task.id}.order`] = (index + 1) * 1.0;
    });
  }
  await updateDoc(taskListRef, updateData);
}

export async function sortTasks(taskListId: string): Promise<void> {
  const taskListData = await getTaskListData(taskListId);
  const tasks = Object.values(taskListData.tasks);
  if (tasks.length < 2) return;

  const normalizedTasks = getAutoSortedTasks(tasks);
  const now = Date.now();

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData: Record<string, unknown> = { updatedAt: now };
  normalizedTasks.forEach((task) => {
    updateData[`tasks.${task.id}.order`] = task.order;
  });
  await updateDoc(taskListRef, updateData);
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
  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData: Record<string, unknown> = { updatedAt: now };

  completedTasks.forEach((task) => {
    updateData[`tasks.${task.id}`] = deleteField();
  });
  normalizedRemainingTasks.forEach((task) => {
    updateData[`tasks.${task.id}.order`] = task.order;
  });

  await updateDoc(taskListRef, updateData);

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

const MAX_SHARE_CODE_ATTEMPTS = 10;

export async function generateShareCode(taskListId: string): Promise<string> {
  const data = appStore.getData();

  if (!data.taskLists[taskListId]) {
    throw new Error("Task list not found");
  }

  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt++) {
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
        const currentShareCode = assertTaskListStore(
          taskListSnapshot.data(),
          taskListId,
        ).shareCode;
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

  throw new Error("Failed to generate a unique share code. Please try again.");
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
    const currentShareCode = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    ).shareCode;
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
  const normalizedShareCode = normalizeShareCode(shareCode);
  if (!normalizedShareCode) {
    return null;
  }

  const shareCodeRef = doc(db, "shareCodes", normalizedShareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const data = shareCodeSnapshot.data() as { taskListId?: string } | undefined;
  return data?.taskListId ?? null;
}

export async function fetchTaskListByShareCode(
  shareCode: string,
): Promise<TaskListStore | null> {
  const normalizedShareCode = normalizeShareCode(shareCode);
  if (!normalizedShareCode) {
    return null;
  }

  const shareCodeRef = doc(db, "shareCodes", normalizedShareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const shareData = shareCodeSnapshot.data() as
    | { taskListId: string }
    | undefined;
  if (!shareData?.taskListId) return null;
  const { taskListId } = shareData;
  const taskListRef = doc(db, "taskLists", taskListId);
  const taskListSnapshot = await getDoc(taskListRef);
  if (!taskListSnapshot.exists()) {
    return null;
  }

  return assertTaskListStore(taskListSnapshot.data(), taskListId);
}

export async function addSharedTaskListToOrder(
  taskListId: string,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  await runTransaction(db, async (transaction) => {
    const now = Date.now();
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const taskListOrderSnapshot = await transaction.get(taskListOrderRef);
    if (!taskListOrderSnapshot.exists()) {
      throw new Error("TaskListOrder not found");
    }

    const taskListOrderData = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    if (taskListOrderData[taskListId]) {
      throw new Error("This task list is already in your order");
    }

    const taskListOrders = getTaskListOrderEntries(taskListOrderData).map(
      ([, value]) => (value as { order: number }).order,
    );

    const newOrder =
      taskListOrders.length === 0 ? 1.0 : Math.max(...taskListOrders) + 1.0;

    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);
    if (!taskListSnapshot.exists()) {
      throw new Error("Task list not found");
    }
    const taskListData = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    );
    const currentMemberCount = getValidMemberCount(taskListData);

    transaction.update(taskListOrderRef, {
      [taskListId]: { order: newOrder },
      updatedAt: now,
    });
    transaction.update(taskListRef, {
      memberCount: currentMemberCount + 1,
      updatedAt: now,
    });
  });
}
