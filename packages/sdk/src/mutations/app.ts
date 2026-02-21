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
import { appStore, registerPendingPerformanceTrace } from "../store";
import { parseDateFromText } from "../utils/dateParser";

type MutationOperation =
  | "add_task"
  | "toggle_task"
  | "edit_task"
  | "set_task_date"
  | "update_task"
  | "delete_task"
  | "reorder_task"
  | "sort_tasks"
  | "delete_completed_tasks"
  | "reorder_task_list";

const roundMs = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const createTraceId = (operation: MutationOperation, key: string): string => {
  return `${operation}:${key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
};

const resolveTraceId = (
  traceId: string | undefined,
  operation: MutationOperation,
  key: string,
): string => {
  return traceId ?? createTraceId(operation, key);
};

const logMutationPerf = (payload: {
  phase: string;
  op: MutationOperation;
  traceId: string;
  taskListId?: string;
  taskId?: string;
  elapsedMs?: number;
  autoSortMs?: number;
  writeFieldCount?: number;
}) => {
  console.log(
    `[Perf][sdk.mutation] ${JSON.stringify({
      scope: "sdk.mutation",
      ts: Date.now(),
      ...payload,
    })}`,
  );
};

const resolveUpdateTaskOperation = (
  updates: Partial<Task>,
): MutationOperation => {
  if (updates.completed !== undefined) {
    return "toggle_task";
  }
  if (updates.text !== undefined) {
    return "edit_task";
  }
  if (updates.date !== undefined) {
    return "set_task_date";
  }
  return "update_task";
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
  traceId?: string,
) {
  const operation: MutationOperation = "reorder_task_list";
  const resolvedTraceId = resolveTraceId(
    traceId,
    operation,
    `${draggedTaskListId}:${targetTaskListId}`,
  );
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId: draggedTaskListId,
  });

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
  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskListOrder/${uid}`,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId: draggedTaskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(doc(db, "taskListOrder", uid), updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId: draggedTaskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
  });
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

export function generateTaskId(): string {
  return doc(collection(db, "taskLists")).id;
}

export async function addTask(
  taskListId: string,
  text: string,
  date: string = "",
  id?: string,
  traceId?: string,
) {
  const operation: MutationOperation = "add_task";
  const data = appStore.getData();
  const { date: parsedDate, text: parsedTextRaw } = parseDateFromText(
    text.trim(),
  );
  const normalizedText = parsedTextRaw.trim();
  const finalDate = parsedDate || date;

  if (normalizedText === "") throw new Error("Task text is empty");

  const taskId = id || generateTaskId();
  const resolvedTraceId = resolveTraceId(traceId, operation, taskId);
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
  });

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
  let autoSortMs: number | undefined;
  const normalizedTasks = autoSortEnabled
    ? (() => {
        const autoSortStartedAt = performance.now();
        const next = getAutoSortedTasks(reorderedTasks);
        autoSortMs = roundMs(performance.now() - autoSortStartedAt);
        return next;
      })()
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

  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    taskId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
  });

  return taskId;
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Task>,
  traceId?: string,
) {
  const normalizedUpdates: Partial<Task> = { ...updates };
  if (normalizedUpdates.text) {
    const { date: parsedDate, text: parsedTextRaw } = parseDateFromText(
      normalizedUpdates.text.trim(),
    );
    if (parsedDate) {
      normalizedUpdates.date = parsedDate;
      normalizedUpdates.text = parsedTextRaw.trim();
    }
  }

  if (normalizedUpdates.text !== undefined && normalizedUpdates.text === "") {
    throw new Error("Task text is empty");
  }

  const operation = resolveUpdateTaskOperation(normalizedUpdates);
  const resolvedTraceId = resolveTraceId(traceId, operation, taskId);
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
  });
  const now = Date.now();
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    const updateData: Record<string, unknown> = { updatedAt: now };
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      updateData[`tasks.${taskId}.${key}`] = value;
    });
    registerPendingPerformanceTrace({
      traceId: resolvedTraceId,
      op: operation,
      scopeKey: `taskLists/${taskListId}`,
      taskListId,
      taskId,
      startedAt,
    });
    logMutationPerf({
      phase: "mutation.before_write",
      op: operation,
      traceId: resolvedTraceId,
      taskListId,
      taskId,
      elapsedMs: roundMs(performance.now() - startedAt),
      writeFieldCount: Object.keys(updateData).length,
    });
    await updateDoc(taskListRef, updateData);
    logMutationPerf({
      phase: "mutation.after_write",
      op: operation,
      traceId: resolvedTraceId,
      taskListId,
      taskId,
      elapsedMs: roundMs(performance.now() - startedAt),
    });
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const updatedTasks = Object.values(taskListData.tasks).map((task) =>
    task.id === taskId ? { ...task, ...normalizedUpdates } : task,
  );
  const autoSortStartedAt = performance.now();
  const normalizedTasks = getAutoSortedTasks(updatedTasks);
  const autoSortMs = roundMs(performance.now() - autoSortStartedAt);

  const updateData: Record<string, unknown> = { updatedAt: now };
  normalizedTasks.forEach((task) => {
    if (task.id === taskId) {
      updateData[`tasks.${task.id}`] = task;
    } else {
      updateData[`tasks.${task.id}.order`] = task.order;
    }
  });
  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    taskId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
  });
}

export async function deleteTask(
  taskListId: string,
  taskId: string,
  traceId?: string,
) {
  const operation: MutationOperation = "delete_task";
  const resolvedTraceId = resolveTraceId(traceId, operation, taskId);
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
  });
  const now = Date.now();
  const data = appStore.getData();
  const autoSortEnabled = Boolean(data.settings?.autoSort);
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!autoSortEnabled) {
    const updateData = {
      [`tasks.${taskId}`]: deleteField(),
      updatedAt: now,
    };
    registerPendingPerformanceTrace({
      traceId: resolvedTraceId,
      op: operation,
      scopeKey: `taskLists/${taskListId}`,
      taskListId,
      taskId,
      startedAt,
    });
    logMutationPerf({
      phase: "mutation.before_write",
      op: operation,
      traceId: resolvedTraceId,
      taskListId,
      taskId,
      elapsedMs: roundMs(performance.now() - startedAt),
      writeFieldCount: Object.keys(updateData).length,
    });
    await updateDoc(taskListRef, updateData);
    logMutationPerf({
      phase: "mutation.after_write",
      op: operation,
      traceId: resolvedTraceId,
      taskListId,
      taskId,
      elapsedMs: roundMs(performance.now() - startedAt),
    });
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

  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    taskId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId,
    elapsedMs: roundMs(performance.now() - startedAt),
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
  traceId?: string,
) {
  const operation: MutationOperation = "reorder_task";
  const resolvedTraceId = resolveTraceId(
    traceId,
    operation,
    `${draggedTaskId}:${targetTaskId}`,
  );
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId: draggedTaskId,
  });
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
  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    taskId: draggedTaskId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId: draggedTaskId,
    elapsedMs: roundMs(performance.now() - startedAt),
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    taskId: draggedTaskId,
    elapsedMs: roundMs(performance.now() - startedAt),
  });
}

export async function sortTasks(
  taskListId: string,
  traceId?: string,
): Promise<void> {
  const operation: MutationOperation = "sort_tasks";
  const resolvedTraceId = resolveTraceId(traceId, operation, taskListId);
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
  });
  const taskListData = await getTaskListData(taskListId);
  const tasks = Object.values(taskListData.tasks);
  if (tasks.length < 2) return;

  const autoSortStartedAt = performance.now();
  const normalizedTasks = getAutoSortedTasks(tasks);
  const autoSortMs = roundMs(performance.now() - autoSortStartedAt);
  const now = Date.now();

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData: Record<string, unknown> = { updatedAt: now };
  normalizedTasks.forEach((task) => {
    updateData[`tasks.${task.id}.order`] = task.order;
  });
  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
    autoSortMs,
  });
}

export async function deleteCompletedTasks(
  taskListId: string,
  traceId?: string,
): Promise<number> {
  const operation: MutationOperation = "delete_completed_tasks";
  const resolvedTraceId = resolveTraceId(traceId, operation, taskListId);
  const startedAt = performance.now();
  logMutationPerf({
    phase: "mutation.start",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
  });
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

  registerPendingPerformanceTrace({
    traceId: resolvedTraceId,
    op: operation,
    scopeKey: `taskLists/${taskListId}`,
    taskListId,
    startedAt,
  });
  logMutationPerf({
    phase: "mutation.before_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
    writeFieldCount: Object.keys(updateData).length,
  });
  await updateDoc(taskListRef, updateData);
  logMutationPerf({
    phase: "mutation.after_write",
    op: operation,
    traceId: resolvedTraceId,
    taskListId,
    elapsedMs: roundMs(performance.now() - startedAt),
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
