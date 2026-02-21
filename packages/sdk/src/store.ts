import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  type FirestoreError,
} from "firebase/firestore";
import isEqual from "fast-deep-equal";

import { auth, db } from "./firebase";
import {
  AppState,
  SettingsStore,
  TaskList,
  TaskListStore,
  TaskListOrderStore,
  User,
} from "./types";

type DataStore = {
  user: User | null;
  settings: SettingsStore | null;
  taskListOrder: TaskListOrderStore | null;
  taskLists: Record<string, TaskListStore>;
};

type StoreListener = (state: AppState) => void;

export type PerformanceTrace = {
  traceId: string;
  op: string;
  scopeKey: string;
  taskListId?: string;
  taskId?: string;
  startedAt: number;
};

type StoredPerformanceTrace = PerformanceTrace & {
  registeredAt: number;
};

const TRACE_RETENTION_MS = 30_000;
const TRACE_QUEUE_LIMIT = 40;
const pendingTraceQueueByScope = new Map<string, StoredPerformanceTrace[]>();

const roundMs = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const prunePendingTraceQueue = (scopeKey: string, now: number): void => {
  const queue = pendingTraceQueueByScope.get(scopeKey);
  if (!queue || queue.length === 0) {
    pendingTraceQueueByScope.delete(scopeKey);
    return;
  }
  const filtered = queue.filter(
    (trace) => now - trace.registeredAt <= TRACE_RETENTION_MS,
  );
  if (filtered.length === 0) {
    pendingTraceQueueByScope.delete(scopeKey);
    return;
  }
  const nextQueue =
    filtered.length > TRACE_QUEUE_LIMIT
      ? filtered.slice(filtered.length - TRACE_QUEUE_LIMIT)
      : filtered;
  pendingTraceQueueByScope.set(scopeKey, nextQueue);
};

export function registerPendingPerformanceTrace(trace: PerformanceTrace): void {
  const now = Date.now();
  prunePendingTraceQueue(trace.scopeKey, now);
  const queue = pendingTraceQueueByScope.get(trace.scopeKey) ?? [];
  const nextQueue = [
    ...queue,
    {
      ...trace,
      registeredAt: now,
    },
  ];
  const normalizedQueue =
    nextQueue.length > TRACE_QUEUE_LIMIT
      ? nextQueue.slice(nextQueue.length - TRACE_QUEUE_LIMIT)
      : nextQueue;
  pendingTraceQueueByScope.set(trace.scopeKey, normalizedQueue);
}

export function consumePendingPerformanceTrace(
  scopeKey: string,
): PerformanceTrace | null {
  const now = Date.now();
  prunePendingTraceQueue(scopeKey, now);
  const queue = pendingTraceQueueByScope.get(scopeKey);
  if (!queue || queue.length === 0) return null;
  const [first, ...rest] = queue;
  if (rest.length === 0) {
    pendingTraceQueueByScope.delete(scopeKey);
  } else {
    pendingTraceQueueByScope.set(scopeKey, rest);
  }
  return {
    traceId: first.traceId,
    op: first.op,
    scopeKey: first.scopeKey,
    taskListId: first.taskListId,
    taskId: first.taskId,
    startedAt: first.startedAt,
  };
}

function createStore() {
  type TaskListTransformCacheEntry = {
    source: TaskListStore;
    mapped: TaskList;
  };

  const initialData: DataStore = {
    user: null,
    settings: null,
    taskListOrder: null,
    taskLists: {},
  };

  const data: DataStore = { ...initialData };

  const taskListTransformCache = new Map<string, TaskListTransformCacheEntry>();
  const missingTaskListCache = new Map<string, TaskList>();
  let cachedTaskListOrderSource: TaskListOrderStore | null = null;
  let cachedOrderedTaskListIds: string[] = [];
  let cachedSettingsSource: SettingsStore | null = null;
  let cachedSettings: AppState["settings"] = null;
  let cachedTaskLists: TaskList[] = [];
  let cachedSharedTaskListsById: Record<string, TaskList> = {};

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
    listId: string,
    listData: TaskListStore,
  ): TaskList => {
    const cached = taskListTransformCache.get(listId);
    if (cached && cached.source === listData) {
      return cached.mapped;
    }
    const mapped: TaskList = {
      id: listId,
      name: listData.name,
      tasks: Object.values(listData.tasks).sort((a, b) => a.order - b.order),
      history: listData.history,
      shareCode: listData.shareCode,
      background: listData.background,
      createdAt: listData.createdAt,
      updatedAt: listData.updatedAt,
    };
    taskListTransformCache.set(listId, { source: listData, mapped });
    missingTaskListCache.delete(listId);
    return mapped;
  };

  const getMissingTaskList = (listId: string): TaskList => {
    const cached = missingTaskListCache.get(listId);
    if (cached) return cached;
    const missingTaskList: TaskList = {
      id: listId,
      name: "",
      tasks: [],
      history: [],
      shareCode: null,
      background: null,
      createdAt: 0,
      updatedAt: 0,
    };
    missingTaskListCache.set(listId, missingTaskList);
    return missingTaskList;
  };

  const getSettings = (
    settingsStore: SettingsStore | null,
  ): AppState["settings"] => {
    if (!settingsStore) {
      cachedSettingsSource = null;
      cachedSettings = null;
      return null;
    }
    if (settingsStore === cachedSettingsSource && cachedSettings) {
      return cachedSettings;
    }
    const nextSettings = {
      theme: settingsStore.theme,
      language: settingsStore.language,
      taskInsertPosition: settingsStore.taskInsertPosition,
      autoSort: settingsStore.autoSort,
    };
    if (
      cachedSettings &&
      cachedSettings.theme === nextSettings.theme &&
      cachedSettings.language === nextSettings.language &&
      cachedSettings.taskInsertPosition === nextSettings.taskInsertPosition &&
      cachedSettings.autoSort === nextSettings.autoSort
    ) {
      cachedSettingsSource = settingsStore;
      return cachedSettings;
    }
    cachedSettingsSource = settingsStore;
    cachedSettings = nextSettings;
    return nextSettings;
  };

  const transform = (d: DataStore): AppState => {
    const orderedTaskListIds = getOrderedTaskListIds(d.taskListOrder);
    const orderedIdSet = new Set(orderedTaskListIds);

    const nextTaskLists = orderedTaskListIds.map((listId) => {
      const listData = d.taskLists[listId];
      if (!listData) {
        return getMissingTaskList(listId);
      }
      return getMappedTaskList(listId, listData);
    });

    const taskListsAreSame =
      cachedTaskLists.length === nextTaskLists.length &&
      nextTaskLists.every((list, index) => cachedTaskLists[index] === list);
    const taskLists = taskListsAreSame ? cachedTaskLists : nextTaskLists;
    if (!taskListsAreSame) {
      cachedTaskLists = nextTaskLists;
    }

    const nextSharedTaskListsById: Record<string, TaskList> = {};
    Object.entries(d.taskLists).forEach(([listId, listData]) => {
      if (orderedIdSet.has(listId)) return;
      nextSharedTaskListsById[listId] = getMappedTaskList(listId, listData);
    });

    const cachedSharedTaskListIds = Object.keys(cachedSharedTaskListsById);
    const nextSharedTaskListIds = Object.keys(nextSharedTaskListsById);
    const sharedTaskListsAreSame =
      cachedSharedTaskListIds.length === nextSharedTaskListIds.length &&
      nextSharedTaskListIds.every(
        (listId) =>
          cachedSharedTaskListsById[listId] === nextSharedTaskListsById[listId],
      );
    const sharedTaskListsById = sharedTaskListsAreSame
      ? cachedSharedTaskListsById
      : nextSharedTaskListsById;
    if (!sharedTaskListsAreSame) {
      cachedSharedTaskListsById = nextSharedTaskListsById;
    }

    return {
      user: d.user,
      settings: getSettings(d.settings),
      taskLists,
      taskListOrderUpdatedAt: d.taskListOrder?.updatedAt ?? null,
      sharedTaskListsById,
    };
  };

  const initialAppState = transform(initialData);

  const listeners = new Set<StoreListener>();
  const unsubscribers: (() => void)[] = [];
  const sharedTaskListUnsubscribers = new Map<string, () => void>();

  let taskListIdsKey: string | null = null;

  const unsubscribeSharedTaskLists = () => {
    const unsubscribes = Array.from(sharedTaskListUnsubscribers.values());
    sharedTaskListUnsubscribers.clear();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };

  let currentAppState: AppState = initialAppState;

  const logStorePerf = (
    phase: string,
    context: string,
    trace: PerformanceTrace | null,
    details: {
      elapsedMs?: number;
      transformMs?: number;
      notifyMs?: number;
      docChangeCount?: number;
      listenerCount?: number;
      skipped?: boolean;
    } = {},
  ) => {
    if (!trace) return;
    const payload = {
      scope: "sdk.store",
      phase,
      context,
      traceId: trace?.traceId ?? null,
      op: trace?.op ?? null,
      scopeKey: trace?.scopeKey ?? null,
      taskListId: trace?.taskListId ?? null,
      taskId: trace?.taskId ?? null,
      ts: Date.now(),
      ...details,
    };
    console.log(`[Perf][sdk.store] ${JSON.stringify(payload)}`);
  };

  const getState = (): AppState => {
    return currentAppState;
  };

  const commit = (
    trace: PerformanceTrace | null = null,
    context: string = "unknown",
  ) => {
    const commitStartedAt = performance.now();
    logStorePerf("store.commit.start", context, trace);
    const transformStartedAt = performance.now();
    const nextAppState = transform(data);
    const transformMs = roundMs(performance.now() - transformStartedAt);
    const sameUser = currentAppState.user === nextAppState.user;
    const sameTaskListOrderUpdatedAt =
      currentAppState.taskListOrderUpdatedAt ===
      nextAppState.taskListOrderUpdatedAt;

    const sameSettings =
      currentAppState.settings === nextAppState.settings ||
      isEqual(currentAppState.settings, nextAppState.settings);
    if (sameSettings) {
      nextAppState.settings = currentAppState.settings;
    }

    const sameTaskLists =
      currentAppState.taskLists === nextAppState.taskLists ||
      isEqual(currentAppState.taskLists, nextAppState.taskLists);
    if (sameTaskLists) {
      nextAppState.taskLists = currentAppState.taskLists;
    }

    const sameSharedTaskListsById =
      currentAppState.sharedTaskListsById ===
        nextAppState.sharedTaskListsById ||
      isEqual(
        currentAppState.sharedTaskListsById,
        nextAppState.sharedTaskListsById,
      );
    if (sameSharedTaskListsById) {
      nextAppState.sharedTaskListsById = currentAppState.sharedTaskListsById;
    }

    if (
      sameUser &&
      sameTaskListOrderUpdatedAt &&
      sameSettings &&
      sameTaskLists &&
      sameSharedTaskListsById
    ) {
      logStorePerf("store.commit.end", context, trace, {
        elapsedMs: roundMs(performance.now() - commitStartedAt),
        transformMs,
        skipped: true,
      });
      return;
    }

    currentAppState = nextAppState;
    const notifyStartedAt = performance.now();
    listeners.forEach((listener) => listener(currentAppState));
    const notifyMs = roundMs(performance.now() - notifyStartedAt);
    logStorePerf("store.listeners.notified", context, trace, {
      notifyMs,
      listenerCount: listeners.size,
    });
    logStorePerf("store.commit.end", context, trace, {
      elapsedMs: roundMs(performance.now() - commitStartedAt),
      transformMs,
      notifyMs,
      skipped: false,
    });
  };

  const logSnapshotError = (context: string, error: FirestoreError) => {
    const user = auth.currentUser;
    console.error(`[Store] Snapshot error in ${context}:`, {
      code: error.code,
      message: error.message,
      userUid: user?.uid,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
    });
  };

  const subscribeToUserData = (uid: string) => {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers.length = 0;
    taskListIdsKey = null;

    const settingsUnsub = onSnapshot(
      doc(db, "settings", uid),
      (snapshot) => {
        logStorePerf("snapshot.received", "settings", null);
        if (snapshot.exists()) {
          data.settings = snapshot.data() as SettingsStore;
        } else {
          data.settings = null;
        }
        commit(null, "settings");
      },
      (error) => logSnapshotError("settings", error),
    );
    unsubscribers.push(settingsUnsub);

    const taskListOrderUnsub = onSnapshot(
      doc(db, "taskListOrder", uid),
      (snapshot) => {
        const trace = consumePendingPerformanceTrace(`taskListOrder/${uid}`);
        logStorePerf("snapshot.received", "taskListOrder", trace);
        if (snapshot.exists()) {
          data.taskListOrder = snapshot.data() as TaskListOrderStore;
        } else {
          data.taskListOrder = null;
        }
        commit(trace, "taskListOrder");
        subscribeToTaskLists(data.taskListOrder);
      },
      (error) => logSnapshotError("taskListOrder", error),
    );
    unsubscribers.push(taskListOrderUnsub);
  };

  const subscribeToTaskLists = (taskListOrder: TaskListOrderStore | null) => {
    const nextTaskListIds = taskListOrder
      ? Object.entries(taskListOrder)
          .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
          .map(([id]) => id)
      : [];
    const nextTaskListIdsKey =
      nextTaskListIds.length > 0 ? [...nextTaskListIds].sort().join("|") : "";
    if (taskListIdsKey === nextTaskListIdsKey) return;
    taskListIdsKey = nextTaskListIdsKey;

    const taskListUnsubscribers = unsubscribers.splice(2);
    taskListUnsubscribers.forEach((unsub) => unsub());

    const keepTaskListIds = new Set<string>([
      ...nextTaskListIds,
      ...Array.from(sharedTaskListUnsubscribers.keys()),
    ]);
    const currentTaskLists = data.taskLists;
    const nextTaskLists: Record<string, TaskListStore> = {};
    let taskListsChanged = false;
    Object.entries(currentTaskLists).forEach(([taskListId, taskListData]) => {
      if (keepTaskListIds.has(taskListId)) {
        nextTaskLists[taskListId] = taskListData;
        return;
      }
      removeTaskListFromCache(taskListId);
      taskListsChanged = true;
    });
    if (taskListsChanged) {
      data.taskLists = nextTaskLists;
      if (Object.keys(nextTaskLists).length === 0) {
        resetTaskListCaches();
      }
    }

    if (!taskListOrder || nextTaskListIds.length === 0) {
      if (taskListsChanged) {
        commit(null, "taskLists.sync");
      }
      return;
    }

    const chunks = [];
    for (let i = 0; i < nextTaskListIds.length; i += 10) {
      chunks.push(nextTaskListIds.slice(i, i + 10));
    }

    chunks.forEach((chunk) => {
      const taskListsUnsub = onSnapshot(
        query(collection(db, "taskLists"), where("__name__", "in", chunk)),
        (snapshot) => {
          const snapshotStartedAt = performance.now();
          const nextTaskLists = { ...data.taskLists };
          let changed = false;
          let trace: PerformanceTrace | null = null;
          snapshot.docChanges().forEach((change) => {
            const taskListId = change.doc.id;
            if (!trace) {
              trace = consumePendingPerformanceTrace(`taskLists/${taskListId}`);
            }
            if (change.type === "removed") {
              if (
                !Object.prototype.hasOwnProperty.call(nextTaskLists, taskListId)
              ) {
                return;
              }
              delete nextTaskLists[taskListId];
              removeTaskListFromCache(taskListId);
              changed = true;
              return;
            }
            const taskListData = change.doc.data() as TaskListStore;
            if (nextTaskLists[taskListId] === taskListData) {
              return;
            }
            nextTaskLists[taskListId] = taskListData;
            changed = true;
          });
          logStorePerf("snapshot.received", "taskLists.chunk", trace, {
            elapsedMs: roundMs(performance.now() - snapshotStartedAt),
            docChangeCount: snapshot.docChanges().length,
          });
          if (!changed) return;
          data.taskLists = nextTaskLists;
          commit(trace, "taskLists.chunk");
        },
        (error) => logSnapshotError("taskLists (chunk)", error),
      );
      unsubscribers.push(taskListsUnsub);
    });
  };

  const subscribeToSharedTaskList = (taskListId: string): (() => void) => {
    const existing = sharedTaskListUnsubscribers.get(taskListId);
    if (existing) return existing;

    const unsubscribe = onSnapshot(
      doc(db, "taskLists", taskListId),
      (snapshot) => {
        const trace = consumePendingPerformanceTrace(`taskLists/${taskListId}`);
        logStorePerf("snapshot.received", "taskLists.shared", trace);
        if (snapshot.exists()) {
          data.taskLists[taskListId] = snapshot.data() as TaskListStore;
        } else {
          delete data.taskLists[taskListId];
          removeTaskListFromCache(taskListId);
        }
        commit(trace, "taskLists.shared");
      },
      (error) => logSnapshotError(`sharedTaskList (${taskListId})`, error),
    );

    const wrappedUnsubscribe = () => {
      unsubscribe();
      sharedTaskListUnsubscribers.delete(taskListId);
    };

    sharedTaskListUnsubscribers.set(taskListId, wrappedUnsubscribe);
    return wrappedUnsubscribe;
  };

  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    data.user = user;
    if (user) {
      subscribeToUserData(user.uid);
    } else {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
      unsubscribeSharedTaskLists();
      data.settings = null;
      data.taskListOrder = null;
      data.taskLists = {};
      taskListIdsKey = null;
      resetTaskListCaches();
      pendingTraceQueueByScope.clear();
    }
    commit(null, "authStateChanged");
  });

  const store = {
    getState,
    getServerSnapshot: (): AppState => initialAppState,
    getData: (): DataStore => data,
    commit,
    subscribe: (listener: StoreListener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeToSharedTaskList,
    unsubscribeAll: () => {
      authUnsubscribe();
      unsubscribers.forEach((unsub) => unsub());
      unsubscribeSharedTaskLists();
    },
  };

  return store;
}

export const appStore = createStore();
