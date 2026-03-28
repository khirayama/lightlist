import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";

import { getDbInstance } from "./firebase";
import { getCurrentSettingsStatus, subscribeSettingsStore } from "./settings";
import { getCurrentSessionState, subscribeSessionStore } from "./session";
import type {
  AppState,
  TaskList,
  TaskListOrderStore,
  TaskListStore,
  TaskListStoreTask,
} from "./types";

type TaskListIndexState = {
  hasStartupError: boolean;
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskLists: TaskList[];
};

type InternalTaskListsState = {
  taskListOrder: TaskListOrderStore | null;
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskListsById: Record<string, TaskListStore>;
};

type TaskListTransformCacheEntry = {
  source: TaskListStore;
  mapped: TaskList;
};
const serverTaskListIndexState: TaskListIndexState = {
  hasStartupError: false,
  taskListOrderStatus: "idle",
  taskLists: [],
};

const listeners = new Set<() => void>();
const sharedTaskListUnsubscribers = new Map<string, () => void>();
const taskListTransformCache = new Map<string, TaskListTransformCacheEntry>();
const missingTaskListCache = new Map<string, TaskList>();

let taskListsStarted = false;
let sessionUnsubscribe: (() => void) | null = null;
let settingsUnsubscribe: (() => void) | null = null;
let taskListOrderUnsubscribe: (() => void) | null = null;
let taskListChunkUnsubscribers: Array<() => void> = [];
let taskListIdsKey: string | null = null;
let internalState: InternalTaskListsState = {
  taskListOrder: null,
  taskListOrderStatus: "idle",
  taskListsById: {},
};
let cachedTaskListOrderSource: TaskListOrderStore | null = null;
let cachedOrderedTaskListIds: string[] = [];
let cachedTaskLists: TaskList[] = [];
let cachedSharedTaskListsById: Record<string, TaskList> = {};
let cachedTaskListIndexState: TaskListIndexState | null =
  serverTaskListIndexState;

const getInitialInternalTaskListsState = (
  taskListOrderStatus: AppState["taskListOrderStatus"],
): InternalTaskListsState => ({
  taskListOrder: null,
  taskListOrderStatus,
  taskListsById: {},
});

export function normalizeTaskListStore(
  taskListData: TaskListStore,
): TaskListStore {
  const tasks = taskListData.tasks;
  let needsNormalization = false;
  for (const taskId of Object.keys(tasks)) {
    if (tasks[taskId].id !== taskId) {
      needsNormalization = true;
      break;
    }
  }
  if (!needsNormalization) return taskListData;

  const normalizedTasks: Record<string, TaskListStoreTask> = {};
  for (const taskId of Object.keys(tasks)) {
    const task = tasks[taskId];
    normalizedTasks[taskId] =
      task.id === taskId ? task : { ...task, id: taskId };
  }
  return { ...taskListData, tasks: normalizedTasks };
}

const emitTaskLists = () => {
  cachedTaskListIndexState = null;
  listeners.forEach((listener) => listener());
};

const removeTaskListFromCache = (taskListId: string) => {
  taskListTransformCache.delete(taskListId);
  missingTaskListCache.delete(taskListId);
};

const resetTaskListCaches = () => {
  taskListTransformCache.clear();
  missingTaskListCache.clear();
  cachedTaskListOrderSource = null;
  cachedOrderedTaskListIds = [];
  cachedTaskLists = [];
  cachedSharedTaskListsById = {};
  cachedTaskListIndexState = null;
};

const resetTaskListsState = (
  taskListOrderStatus: AppState["taskListOrderStatus"],
) => {
  taskListIdsKey = null;
  resetTaskListCaches();
  internalState = getInitialInternalTaskListsState(taskListOrderStatus);
  emitTaskLists();
};

export const getTaskListIdsFromOrder = (
  taskListOrder: TaskListOrderStore | null,
): string[] => {
  if (!taskListOrder) {
    return [];
  }
  return Object.keys(taskListOrder).filter(
    (taskListId) => taskListId !== "createdAt" && taskListId !== "updatedAt",
  );
};

const getTaskListIdsKey = (taskListIds: string[]): string => {
  return taskListIds.length > 0 ? [...taskListIds].sort().join("|") : "";
};

const pruneTaskListsById = (taskListIds: string[]) => {
  const keepTaskListIds = new Set<string>([
    ...taskListIds,
    ...Array.from(sharedTaskListUnsubscribers.keys()),
  ]);
  const nextTaskListsById: Record<string, TaskListStore> = {};
  let changed = false;

  Object.entries(internalState.taskListsById).forEach(
    ([taskListId, taskListData]) => {
      if (!keepTaskListIds.has(taskListId)) {
        removeTaskListFromCache(taskListId);
        changed = true;
        return;
      }
      nextTaskListsById[taskListId] = taskListData;
    },
  );

  if (!changed) {
    return;
  }

  setTaskListsById(nextTaskListsById);
  if (Object.keys(nextTaskListsById).length === 0) {
    resetTaskListCaches();
  }
};

const setSingleTaskListStoreData = (
  taskListId: string,
  taskListData: TaskListStore | null,
) => {
  const nextTaskListsById = { ...internalState.taskListsById };
  if (!taskListData) {
    if (!Object.prototype.hasOwnProperty.call(nextTaskListsById, taskListId)) {
      return;
    }
    delete nextTaskListsById[taskListId];
    removeTaskListFromCache(taskListId);
    setTaskListsById(nextTaskListsById);
    return;
  }

  if (nextTaskListsById[taskListId] === taskListData) {
    return;
  }

  nextTaskListsById[taskListId] = taskListData;
  setTaskListsById(nextTaskListsById);
};

const getOrderedTaskListIds = (
  taskListOrder: TaskListOrderStore | null,
): string[] => {
  if (taskListOrder === cachedTaskListOrderSource) {
    return cachedOrderedTaskListIds;
  }
  const nextOrderedTaskListIds = taskListOrder
    ? Object.entries(taskListOrder)
        .flatMap(([taskListId, value]) => {
          if (typeof value !== "object" || value === null) return [];
          if (!("order" in value)) return [];
          return [{ taskListId, order: (value as { order: number }).order }];
        })
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.taskListId)
    : [];
  cachedTaskListOrderSource = taskListOrder;
  cachedOrderedTaskListIds = nextOrderedTaskListIds;
  return nextOrderedTaskListIds;
};

const getMappedTaskList = (
  taskListId: string,
  taskListData: TaskListStore,
): TaskList => {
  const cached = taskListTransformCache.get(taskListId);
  if (cached && cached.source === taskListData) {
    return cached.mapped;
  }
  const mapped: TaskList = {
    id: taskListId,
    name: taskListData.name,
    tasks: Object.values(taskListData.tasks).sort((a, b) => a.order - b.order),
    history: taskListData.history,
    shareCode: taskListData.shareCode,
    background: taskListData.background,
    memberCount:
      typeof taskListData.memberCount === "number"
        ? taskListData.memberCount
        : 1,
    createdAt: taskListData.createdAt,
    updatedAt: taskListData.updatedAt,
  };
  taskListTransformCache.set(taskListId, { source: taskListData, mapped });
  missingTaskListCache.delete(taskListId);
  return mapped;
};

const getMissingTaskList = (taskListId: string): TaskList => {
  const cached = missingTaskListCache.get(taskListId);
  if (cached) {
    return cached;
  }
  const missingTaskList: TaskList = {
    id: taskListId,
    name: "",
    tasks: [],
    history: [],
    shareCode: null,
    background: null,
    memberCount: 0,
    createdAt: 0,
    updatedAt: 0,
  };
  missingTaskListCache.set(taskListId, missingTaskList);
  return missingTaskList;
};

const getCurrentSharedTaskListsById = (): Record<string, TaskList> => {
  const orderedTaskListIds = getOrderedTaskListIds(internalState.taskListOrder);
  const orderedIdSet = new Set(orderedTaskListIds);
  const nextSharedTaskListsById: Record<string, TaskList> = {};

  Object.entries(internalState.taskListsById).forEach(
    ([taskListId, taskListData]) => {
      if (orderedIdSet.has(taskListId)) {
        return;
      }
      nextSharedTaskListsById[taskListId] = getMappedTaskList(
        taskListId,
        taskListData,
      );
    },
  );

  const cachedIds = Object.keys(cachedSharedTaskListsById);
  const nextIds = Object.keys(nextSharedTaskListsById);
  const isSame =
    cachedIds.length === nextIds.length &&
    nextIds.every(
      (taskListId) =>
        cachedSharedTaskListsById[taskListId] ===
        nextSharedTaskListsById[taskListId],
    );

  if (isSame) {
    return cachedSharedTaskListsById;
  }

  cachedSharedTaskListsById = nextSharedTaskListsById;
  return cachedSharedTaskListsById;
};

const getCurrentOrderedTaskLists = (): TaskList[] => {
  const orderedTaskListIds = getOrderedTaskListIds(internalState.taskListOrder);
  const nextTaskLists = orderedTaskListIds.map((taskListId) => {
    const taskListData = internalState.taskListsById[taskListId];
    if (!taskListData) {
      return getMissingTaskList(taskListId);
    }
    return getMappedTaskList(taskListId, taskListData);
  });

  const isSame =
    cachedTaskLists.length === nextTaskLists.length &&
    nextTaskLists.every(
      (taskList, index) => cachedTaskLists[index] === taskList,
    );

  if (isSame) {
    return cachedTaskLists;
  }

  cachedTaskLists = nextTaskLists;
  return cachedTaskLists;
};

const getCurrentTaskListIndexStateSnapshot = (): TaskListIndexState => {
  const nextState: TaskListIndexState = {
    hasStartupError:
      getCurrentSettingsStatus() === "error" ||
      internalState.taskListOrderStatus === "error",
    taskListOrderStatus: internalState.taskListOrderStatus,
    taskLists: getCurrentOrderedTaskLists(),
  };

  if (
    cachedTaskListIndexState &&
    cachedTaskListIndexState.hasStartupError === nextState.hasStartupError &&
    cachedTaskListIndexState.taskListOrderStatus ===
      nextState.taskListOrderStatus &&
    cachedTaskListIndexState.taskLists === nextState.taskLists
  ) {
    return cachedTaskListIndexState;
  }

  cachedTaskListIndexState = nextState;
  return nextState;
};

const setTaskListOrder = (
  taskListOrder: TaskListOrderStore | null,
  taskListOrderStatus: AppState["taskListOrderStatus"],
) => {
  internalState = {
    ...internalState,
    taskListOrder,
    taskListOrderStatus,
  };
  emitTaskLists();
};

const setTaskListsById = (taskListsById: Record<string, TaskListStore>) => {
  internalState = {
    ...internalState,
    taskListsById,
  };
  emitTaskLists();
};

const unsubscribeSharedTaskLists = () => {
  const unsubscribeEntries = Array.from(sharedTaskListUnsubscribers.values());
  sharedTaskListUnsubscribers.clear();
  unsubscribeEntries.forEach((unsubscribe) => unsubscribe());
};

const unsubscribeTaskListChunks = () => {
  taskListChunkUnsubscribers.forEach((unsubscribe) => unsubscribe());
  taskListChunkUnsubscribers = [];
};

const unsubscribeUserTaskLists = () => {
  taskListOrderUnsubscribe?.();
  taskListOrderUnsubscribe = null;
  unsubscribeTaskListChunks();
};

const subscribeToTaskLists = (taskListOrder: TaskListOrderStore | null) => {
  const nextTaskListIds = getTaskListIdsFromOrder(taskListOrder);
  const nextTaskListIdsKey = getTaskListIdsKey(nextTaskListIds);

  if (taskListIdsKey === nextTaskListIdsKey) {
    return;
  }
  taskListIdsKey = nextTaskListIdsKey;

  unsubscribeTaskListChunks();
  pruneTaskListsById(nextTaskListIds);

  if (!taskListOrder || nextTaskListIds.length === 0) {
    return;
  }

  const chunks: string[][] = [];
  for (let index = 0; index < nextTaskListIds.length; index += 10) {
    chunks.push(nextTaskListIds.slice(index, index + 10));
  }

  chunks.forEach((chunk) => {
    const unsubscribe = onSnapshot(
      query(
        collection(getDbInstance(), "taskLists"),
        where("__name__", "in", chunk),
      ),
      (snapshot) => {
        const nextState = { ...internalState.taskListsById };
        let hasChanged = false;
        snapshot.docChanges().forEach((change) => {
          const taskListId = change.doc.id;
          if (change.type === "removed") {
            if (!Object.prototype.hasOwnProperty.call(nextState, taskListId)) {
              return;
            }
            delete nextState[taskListId];
            removeTaskListFromCache(taskListId);
            hasChanged = true;
            return;
          }
          const taskListData = normalizeTaskListStore(
            change.doc.data() as TaskListStore,
          );
          if (nextState[taskListId] === taskListData) {
            return;
          }
          nextState[taskListId] = taskListData;
          hasChanged = true;
        });

        if (hasChanged) {
          setTaskListsById(nextState);
        }
      },
      (error: FirestoreError) => {
        console.error("taskList chunk listener error:", error);
        setTaskListOrder(internalState.taskListOrder, "error");
      },
    );
    taskListChunkUnsubscribers.push(unsubscribe);
  });
};

const subscribeToUserTaskLists = (uid: string) => {
  unsubscribeUserTaskLists();
  resetTaskListsState("loading");

  taskListOrderUnsubscribe = onSnapshot(
    doc(getDbInstance(), "taskListOrder", uid),
    (snapshot) => {
      const taskListOrder = snapshot.exists()
        ? (snapshot.data() as TaskListOrderStore)
        : null;
      setTaskListOrder(taskListOrder, "ready");
      subscribeToTaskLists(taskListOrder);
    },
    (_error: FirestoreError) => {
      setTaskListOrder(null, "error");
    },
  );
};

const handleSessionChange = () => {
  const session = getCurrentSessionState();
  if (session.authStatus === "authenticated" && session.user) {
    subscribeToUserTaskLists(session.user.uid);
    return;
  }

  unsubscribeUserTaskLists();
  unsubscribeSharedTaskLists();
  resetTaskListsState("idle");
};

const ensureTaskListsStarted = () => {
  if (taskListsStarted) {
    return;
  }
  taskListsStarted = true;
  sessionUnsubscribe = subscribeSessionStore(handleSessionChange);
  settingsUnsubscribe = subscribeSettingsStore(emitTaskLists);
  handleSessionChange();
};

const resolveTaskList = (taskListId: string | null): TaskList | null => {
  if (!taskListId) {
    return null;
  }
  return (
    getCurrentOrderedTaskLists().find(
      (taskList) => taskList.id === taskListId,
    ) ??
    getCurrentSharedTaskListsById()[taskListId] ??
    null
  );
};

export const subscribeTaskListsStore = (listener: () => void): (() => void) => {
  ensureTaskListsStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getServerTaskListIndexState = (): TaskListIndexState => {
  return serverTaskListIndexState;
};

export const getCurrentTaskLists = (): TaskList[] => {
  return getCurrentOrderedTaskLists();
};

export const getCurrentTaskListOrderStatus =
  (): AppState["taskListOrderStatus"] => {
    return internalState.taskListOrderStatus;
  };

export const getCurrentHasStartupError = (): boolean => {
  return (
    getCurrentSettingsStatus() === "error" ||
    internalState.taskListOrderStatus === "error"
  );
};

export const getCurrentTaskList = (
  taskListId: string | null,
): TaskList | null => {
  return resolveTaskList(taskListId);
};

export const getCurrentTaskListStoreData = (
  taskListId: string,
): TaskListStore | null => {
  return internalState.taskListsById[taskListId] ?? null;
};

export const getCurrentTaskListOrderStore = (): TaskListOrderStore | null => {
  return internalState.taskListOrder;
};

export const subscribeToSharedTaskList = (taskListId: string): (() => void) => {
  ensureTaskListsStarted();
  const existing = sharedTaskListUnsubscribers.get(taskListId);
  if (existing) {
    return existing;
  }

  const unsubscribe = onSnapshot(
    doc(getDbInstance(), "taskLists", taskListId),
    (snapshot) => {
      setSingleTaskListStoreData(
        taskListId,
        snapshot.exists()
          ? normalizeTaskListStore(snapshot.data() as TaskListStore)
          : null,
      );
    },
    (error: FirestoreError) => {
      console.error("shared taskList listener error:", error);
      setSingleTaskListStoreData(taskListId, null);
    },
  );

  const wrappedUnsubscribe = () => {
    unsubscribe();
    sharedTaskListUnsubscribers.delete(taskListId);
  };

  sharedTaskListUnsubscribers.set(taskListId, wrappedUnsubscribe);
  return wrappedUnsubscribe;
};

export function useTaskListIndexState(): TaskListIndexState {
  return useSyncExternalStore(
    subscribeTaskListsStore,
    getCurrentTaskListIndexStateSnapshot,
    getServerTaskListIndexState,
  );
}

export function useTaskLists(): TaskList[] {
  return useSyncExternalStore(
    subscribeTaskListsStore,
    getCurrentTaskLists,
    () => getServerTaskListIndexState().taskLists,
  );
}

export function useTaskList(taskListId: string | null): TaskList | null {
  return useSyncExternalStore(
    subscribeTaskListsStore,
    () => getCurrentTaskList(taskListId),
    () => null,
  );
}

export const disposeTaskListsStore = () => {
  sessionUnsubscribe?.();
  sessionUnsubscribe = null;
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
  unsubscribeUserTaskLists();
  unsubscribeSharedTaskLists();
  taskListsStarted = false;
  taskListIdsKey = null;
  internalState = getInitialInternalTaskListsState("idle");
  resetTaskListCaches();
  cachedTaskListIndexState = serverTaskListIndexState;
  listeners.clear();
};
