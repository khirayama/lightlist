import * as Y from "yjs";

import {
  bindSession,
  getApp,
  getPreferences,
  getProfile,
  getTaskLists,
  updateTaskList as updateTaskListAsync,
} from "services";
import { MutationFunction } from "globalstate/react";

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
    commit({
      app: {
        ...d.app,
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
    commit({
      taskLists: {
        ...d.taskLists.reduce((acc: Object, taskList: TaskList) => {
          acc[taskList.id] = taskList;
          return acc;
        }, {}),
      },
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

export const deleteTaskList: MutationFunction = (_, commit, { taskListId }) => {
  console.log("Executing: deleteTaskList");
  // TODO
};

export const updateTaskListIds: MutationFunction = (
  _,
  commit,
  { taskListIds },
) => {
  console.log("Executing: updateTaskListIds");
  // TODO
  // そもそもmoveTasksなどでtaskListとappを同時に更新すべき
};

export const appendTaskList: MutationFunction = (_, commit, { name }) => {
  console.log("Executing: appendTaskList");
  // TODO
};

export const appendTask: MutationFunction = (
  _,
  commit,
  { taskListId, task },
) => {
  console.log("Executing: appendTask");
  // TODO
};

export const prependTask: MutationFunction = (
  _,
  commit,
  { taskListId, task },
) => {
  console.log("Executing: prependTask");
  // TODO
};

export const updateApp: MutationFunction = (_, commit, { app }) => {
  console.log("Executing: updateApp");
  // TODO
};

export const updateTaskList: MutationFunction = (_, commit, { taskList }) => {
  console.log("Executing: updateTaskList");
  // TODO
};

export const sortTasks: MutationFunction = (_, commit, { taskListId }) => {
  console.log("Executing: sortTasks");
  // TODO
};

export const clearCompletedTasks: MutationFunction = (
  _,
  commit,
  { taskListId },
) => {
  console.log("Executing: clearCompletedTasks");
  // TODO
};

export const moveTask: MutationFunction = (
  _,
  commit,
  { taskListId, fromIndex, toIndex },
) => {
  console.log("Executing: moveTask");
  // TODO
};

export const updateTask: MutationFunction = (
  getState,
  commit,
  { taskListId, newTask },
) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, getState().taskLists[taskListId].update);

  const taskList = doc.getMap(taskListId);
  const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
  const task = Array.from(tasks).find((t) => t.get("id") === newTask.id);
  task.set("text", newTask.text);
  task.set("completed", newTask.completed);
  task.set("date", newTask.date);

  const tl = taskList.toJSON() as TaskListV2;
  tl.update = Y.encodeStateAsUpdate(doc);
  commit({ taskLists: { [tl.id]: tl } });
  updateTaskListAsync(tl);
};
