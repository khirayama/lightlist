import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";

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
  taskLists: {
    [taskListId: string]: TaskListStore;
  };
};

type StoreListener = (state: AppState) => void;

const transform = (d: DataStore): AppState => {
  const mapStoreTaskListToAppTaskList = (listId: string, listData: TaskListStore) => {
    return {
      id: listId,
      name: listData.name,
      tasks: Object.values(listData.tasks).sort((a, b) => a.order - b.order),
      history: listData.history,
      shareCode: listData.shareCode,
      background: listData.background,
      createdAt: listData.createdAt,
      updatedAt: listData.updatedAt,
    };
  };

  const taskListOrderEntries = d.taskListOrder
    ? Object.entries(d.taskListOrder)
        .flatMap(([taskListId, value]) => {
          if (typeof value !== "object" || value === null) return [];
          if (!("order" in value)) return [];
          return [{ taskListId, order: (value as { order: number }).order }];
        })
        .sort((a, b) => a.order - b.order)
    : [];

  const orderedTaskListIds = taskListOrderEntries.map((entry) => entry.taskListId);
  const orderedIdSet = new Set(orderedTaskListIds);

  const taskLists = orderedTaskListIds.map((listId) => {
    const listData = d.taskLists[listId];
    if (!listData) {
      return {
        id: listId,
        name: "",
        tasks: [],
        history: [],
        shareCode: null,
        background: "#ffffff",
        createdAt: 0,
        updatedAt: 0,
      };
    }
    return mapStoreTaskListToAppTaskList(listId, listData);
  });

  const sharedTaskListsById: Record<string, TaskList> = {};
  Object.entries(d.taskLists).forEach(([listId, listData]) => {
    if (orderedIdSet.has(listId)) return;
    sharedTaskListsById[listId] = mapStoreTaskListToAppTaskList(listId, listData);
  });

  return {
    user: d.user,
    settings: d.settings
      ? {
          theme: d.settings.theme,
          language: d.settings.language,
          taskInsertPosition: d.settings.taskInsertPosition,
          autoSort: d.settings.autoSort,
        }
      : null,
    taskLists,
    taskListOrderUpdatedAt: d.taskListOrder?.updatedAt ?? null,
    sharedTaskListsById,
  };
};

function createStore() {
  const data: DataStore = {
    user: null,
    settings: null,
    taskListOrder: null,
    taskLists: {},
  };

  const listeners = new Set<StoreListener>();
  const unsubscribers: (() => void)[] = [];
  const sharedTaskListUnsubscribers = new Map<string, () => void>();

  let prevState: AppState | null = null;
  let prevStateKey: string | null = null;

  const unsubscribeSharedTaskLists = () => {
    const unsubscribes = Array.from(sharedTaskListUnsubscribers.values());
    sharedTaskListUnsubscribers.clear();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };

  const commit = () => {
    const nextState = transform(data);
    const nextStateKey = JSON.stringify(nextState);
    if (!prevStateKey || prevStateKey !== nextStateKey) {
      prevState = nextState;
      prevStateKey = nextStateKey;
      listeners.forEach((listener) => listener(nextState));
    }
  };

  const subscribeToUserData = (uid: string) => {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers.length = 0;

    const settingsUnsub = onSnapshot(doc(db, "settings", uid), (snapshot) => {
      if (snapshot.exists()) {
        data.settings = snapshot.data() as SettingsStore;
      } else {
        data.settings = null;
      }
      commit();
    });
    unsubscribers.push(settingsUnsub);

    const taskListOrderUnsub = onSnapshot(
      doc(db, "taskListOrder", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          data.taskListOrder = snapshot.data() as TaskListOrderStore;
        } else {
          data.taskListOrder = null;
        }
        commit();
        subscribeToTaskLists(data.taskListOrder);
      },
    );
    unsubscribers.push(taskListOrderUnsub);
  };

  const subscribeToTaskLists = (taskListOrder: TaskListOrderStore | null) => {
    const taskListUnsubscribers = unsubscribers.splice(2);
    taskListUnsubscribers.forEach((unsub) => unsub());

    if (!taskListOrder) {
      data.taskLists = {};
      commit();
      return;
    }

    const taskListIds = Object.entries(taskListOrder)
      .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
      .map(([id]) => id);

    if (taskListIds.length === 0) {
      data.taskLists = {};
      commit();
      return;
    }

    const chunks = [];
    for (let i = 0; i < taskListIds.length; i += 10) {
      chunks.push(taskListIds.slice(i, i + 10));
    }

    chunks.forEach((chunk) => {
      const taskListsUnsub = onSnapshot(
        query(collection(db, "taskLists"), where("__name__", "in", chunk)),
        (snapshot) => {
          const lists: { [taskListId: string]: TaskListStore } = {};
          snapshot.docs.forEach((doc) => {
            lists[doc.id] = doc.data() as TaskListStore;
          });
          data.taskLists = { ...data.taskLists, ...lists };
          commit();
        },
      );
      unsubscribers.push(taskListsUnsub);
    });
  };

  const subscribeToSharedTaskList = (taskListId: string): (() => void) => {
    const existing = sharedTaskListUnsubscribers.get(taskListId);
    if (existing) return existing;

    const unsubscribe = onSnapshot(doc(db, "taskLists", taskListId), (snapshot) => {
      if (snapshot.exists()) {
        data.taskLists[taskListId] = snapshot.data() as TaskListStore;
      } else {
        delete data.taskLists[taskListId];
      }
      commit();
    });

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
    }
    commit();
  });

  const store = {
    getState: (): AppState => transform(data),
    getData: (): DataStore => data,
    commit,
    subscribe: (listener: StoreListener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeToSharedTaskList,
    // Actions
    unsubscribeAll: () => {
      authUnsubscribe();
      unsubscribers.forEach((unsub) => unsub());
      unsubscribeSharedTaskLists();
    },
  };

  return store;
}

export const appStore = createStore();
