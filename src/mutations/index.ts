import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { arrayMove } from "@dnd-kit/sortable";

import {
  bindSession,
  getApp,
  getPreferences,
  getProfile,
  getTaskLists,
  updateTaskList as updateTaskListAsync,
  createTaskList,
  updateApp as updateAppAync,
  refreshShareCode as refreshShareCodeAsync,
  deleteTaskList as deleteTaskListAsync,
  updatePreferences as updatePreferencesAsync,
  updateProfile as updateProfileAsync,
} from "services";
import { MutationFunction } from "globalstate/react";

// TODO: Remove it later
interface State {
  taskLists: {
    [key: string]: TaskList;
  };
  app: {
    update: Uint8Array;
  };
}

const docs: {
  app: Y.Doc;
  taskLists: { [taskListId: string]: Y.Doc };
} = {
  app: null,
  taskLists: {},
};

export const initializeAuth: MutationFunction = (_, commit) => {
  commit({
    isInitialized: {
      auth: true,
    },
  });
};

export const setSession: MutationFunction = (_, commit, { session }) => {
  bindSession(session);
  commit({
    auth: {
      session,
    },
  });
};

export const fetchApp: MutationFunction = (_, commit) => {
  getApp().then((d) => {
    if (!docs.app) {
      docs.app = new Y.Doc();
    }
    Y.applyUpdate(docs.app, Uint8Array.from(Object.values(d.app.update)));
    commit({
      app: {
        ...docs.app.getMap("app").toJSON(),
        update: Y.encodeStateAsUpdate(docs.app),
      },
      isInitialized: {
        app: true,
      },
    });
  });
};

export const fetchPreferences: MutationFunction = (_, commit) => {
  getPreferences().then((d) => {
    commit({
      preferences: {
        ...d.preferences,
      },
      isInitialized: {
        preferences: true,
      },
    });
  });
};

export const fetchProfile: MutationFunction = (_, commit) => {
  getProfile().then((d) => {
    commit({
      profile: {
        ...d.profile,
      },
      isInitialized: {
        profile: true,
      },
    });
  });
};

export const fetchTaskLists: MutationFunction = (_, commit) => {
  getTaskLists().then((d) => {
    const taskLists = {};
    for (const taskList of d.taskLists) {
      if (!docs[taskList.id]) {
        docs.taskLists[taskList.id] = new Y.Doc();
      }
      Y.applyUpdate(
        docs.taskLists[taskList.id],
        Uint8Array.from(Object.values(taskList.update)),
      );
      taskLists[taskList.id] = {
        ...docs.taskLists[taskList.id].getMap(taskList.id).toJSON(),
        shareCode: taskList.shareCode,
        update: Y.encodeStateAsUpdate(docs.taskLists[taskList.id]),
      };
    }
    commit({
      taskLists,
      isInitialized: {
        taskLists: true,
      },
    });
  });
};

export const updateEmail: MutationFunction = (_, commit, { email }) => {
  console.log("Executing: updateEmail");
  // TODO
};

export const updatePassword: MutationFunction = (
  _,
  commit,
  { currentPassword, newPassword },
) => {
  console.log("Executing: updatePassword");
  // TODO
};

export const updatePreferences: MutationFunction = (
  _,
  commit,
  { preferences },
) => {
  commit({
    preferences: {
      ...preferences,
    },
  });
  updatePreferencesAsync(preferences);
};

export const updateProfile: MutationFunction = (_, commit, { profile }) => {
  commit({
    profile: {
      ...profile,
    },
  });
  updateProfileAsync(profile);
};

export const deleteTaskList: MutationFunction = (_, commit, { taskListId }) => {
  const doc = docs.app;
  const appMap = doc.getMap("app");
  const taskListIds = appMap.get("taskListIds") as Y.Array<string>;
  const index = taskListIds.toArray().indexOf(taskListId);
  if (index !== -1) {
    taskListIds.delete(index, 1);
  }

  const newApp = {
    ...appMap.toJSON(),
    update: Y.encodeStateAsUpdate(doc),
  };

  commit({
    app: newApp,
    taskLists: { [taskListId]: undefined },
  });
  updateAppAync(newApp);
  deleteTaskListAsync(taskListId);
};

export const moveTaskList: MutationFunction<
  State,
  { taskListIds: string[] }
> = (getState, commit, { taskListIds }) => {
  const doc = docs.app;
  const appMap = doc.getMap("app");
  const currentTaskListIds = appMap.get("taskListIds") as Y.Array<string>;

  currentTaskListIds.delete(0, currentTaskListIds.length);
  currentTaskListIds.push(taskListIds);

  const newApp = {
    ...appMap.toJSON(),
    update: Y.encodeStateAsUpdate(doc),
  };

  commit({
    app: newApp,
  });
  updateAppAync(newApp);
};

export const appendTaskList: MutationFunction<
  any /*TODO*/,
  { name: string }
> = (getState, commit, { name }) => {
  const id = uuid();
  const doc = new Y.Doc();

  const taskList = doc.getMap(id);
  taskList.set("id", id);
  taskList.set("name", name);
  const tasks = new Y.Array();
  taskList.set("tasks", tasks);

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);

  const ad = docs.app;
  const appMap = ad.getMap("app");
  const taskListIds = appMap.get("taskListIds") as Y.Array<string>;
  taskListIds.push([id]);

  const newApp = {
    ...appMap.toJSON(),
    update: Y.encodeStateAsUpdate(ad),
  };

  commit({
    taskLists: { [tl.id]: tl },
    app: newApp,
  });

  createTaskList(tl);
  updateAppAync(newApp);
};

const insertTask: MutationFunction<
  State,
  { taskListId: string; task: Partial<Task>; index: number }
> = (getState, commit, { taskListId, task, index }) => {
  const id = uuid();
  const doc = docs.taskLists[taskListId];
  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map<any>>;

  const newTask = new Y.Map();
  newTask.set("id", id);
  newTask.set("text", task.text);
  newTask.set("completed", task.completed || false);
  newTask.set("date", task.date);

  if (index === -1) {
    tasks.push([newTask]);
  } else {
    tasks.insert(index, [newTask]);
  }

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);

  commit({
    taskLists: { [tl.id]: tl },
  });

  updateTaskListAsync(tl);
};

export const appendTask: MutationFunction<
  State,
  { taskListId: string; task: Partial<Task> }
> = (getState, commit, { taskListId, task }) => {
  insertTask(getState, commit, { taskListId, task, index: -1 });
};

export const prependTask: MutationFunction<
  State,
  { taskListId: string; task: Partial<Task> }
> = (getState, commit, { taskListId, task }) => {
  insertTask(getState, commit, { taskListId, task, index: 0 });
};

export const updateApp: MutationFunction = (_, commit, { app }) => {
  const doc = docs.app;
  const appMap = doc.getMap("app");
  appMap.set("taskInsertPosition", app.taskInsertPosition);
  const newApp = {
    ...appMap.toJSON(),
    update: Y.encodeStateAsUpdate(doc),
  };
  commit({
    app: newApp,
  });
  updateAppAync(newApp);
};

export const updateTaskList: MutationFunction<State, { taskList: TaskList }> = (
  getState,
  commit,
  { taskList },
) => {
  const doc = docs.taskLists[taskList.id];
  const taskListMap = doc.getMap(taskList.id);
  taskListMap.set("name", taskList.name);

  const tl = taskListMap.toJSON() as TaskList;
  tl.shareCode = taskList.shareCode;
  tl.update = Y.encodeStateAsUpdate(doc);

  commit({
    taskLists: { [tl.id]: tl },
  });

  updateTaskListAsync(tl);
};

export const sortTasks: MutationFunction<State, { taskListId: string }> = (
  getState,
  commit,
  { taskListId },
) => {
  const doc = docs.taskLists[taskListId];
  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map<any>>;

  tasks.doc.transact(() => {
    const sortedTasks = tasks.toJSON().sort((a, b) => {
      if (a.completed && !b.completed) {
        return 1;
      }
      if (!a.completed && b.completed) {
        return -1;
      }
      if (!a.date && b.date) {
        return 1;
      }
      if (a.date && !b.date) {
        return -1;
      }
      if (a.date > b.date) {
        return 1;
      }
      if (a.date < b.date) {
        return -1;
      }
      return 0;
    });
    for (let i = sortedTasks.length - 1; i >= 0; i--) {
      for (let j = 0; j < tasks.length; j++) {
        const task = tasks.get(j);
        if (task.get("id") === sortedTasks[i].id) {
          if (j !== i) {
            const t = task.clone();
            tasks.delete(j);
            tasks.insert(0, [t]);
          }
          break;
        }
      }
    }
  });

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);

  commit({
    taskLists: { [tl.id]: tl },
  });
  updateTaskListAsync(tl);
};

export const clearCompletedTasks: MutationFunction<
  State,
  { taskListId: string }
> = (getState, commit, { taskListId }) => {
  const doc = docs.taskLists[taskListId];
  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map<any>>;

  tasks.doc.transact(() => {
    for (let i = tasks.length - 1; i >= 0; i--) {
      const task = tasks.get(i);
      if (task.get("completed")) {
        tasks.delete(i);
      }
    }
  });

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);

  commit({
    taskLists: { [tl.id]: tl },
  });
  updateTaskListAsync(tl);
};

export const moveTask: MutationFunction<
  State,
  { taskListId: string; fromIndex: number; toIndex: number }
> = (getState, commit, { taskListId, fromIndex, toIndex }) => {
  const doc = docs.taskLists[taskListId];
  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map<any>>;

  tasks.doc.transact(() => {
    const sortedTasks = arrayMove(tasks.toJSON(), fromIndex, toIndex);
    for (let i = sortedTasks.length - 1; i >= 0; i--) {
      for (let j = 0; j < tasks.length; j++) {
        const task = tasks.get(j);
        if (task.get("id") === sortedTasks[i].id) {
          const t = task.clone();
          tasks.delete(j);
          tasks.insert(0, [t]);
          break;
        }
      }
    }
  });

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);

  commit({
    taskLists: { [tl.id]: tl },
  });
  updateTaskListAsync(tl);
};

export const updateTask: MutationFunction = (
  getState,
  commit,
  { taskListId, task: newTask },
) => {
  const doc = docs.taskLists[taskListId];
  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
  const task = Array.from(tasks).find((t) => t.get("id") === newTask.id);
  task.set("text", newTask.text);
  task.set("completed", newTask.completed);
  task.set("date", newTask.date);

  const tl = taskList.toJSON() as TaskList;
  tl.update = Y.encodeStateAsUpdate(doc);
  commit({ taskLists: { [tl.id]: tl } });
  updateTaskListAsync(tl);
};

export const refreshShareCode: MutationFunction<
  State,
  { taskListId: string }
> = (getState, commit, { taskListId }) => {
  const taskList = getState().taskLists[taskListId];
  refreshShareCodeAsync(taskList.shareCode).then((res) => {
    const newTaskList = {
      ...taskList,
      shareCode: (res.shareCode as any).code,
    };

    commit({
      taskLists: {
        [taskListId]: newTaskList,
      },
    });
    updateTaskListAsync(newTaskList);
  });
};
