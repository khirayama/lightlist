import {
  bindSession,
  getApp,
  getPreferences,
  getProfile,
  getTaskLists,
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
