import axios, { type AxiosResponse } from "axios";

import { getSession } from "v2/common/auth";

export type Res<T, D = any> = Promise<AxiosResponse<T, D>>;

function errorHandler(err: Error) {
  console.warn(err);
}

export async function register(options: { lang?: string } = {}) {
  try {
    return await axios.post("/api/register", options, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function getApp() {
  try {
    return await axios.get("/api/app", {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateApp(newApp: Partial<AppV2>) {
  try {
    return await axios.patch("/api/app", newApp, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function getPreferences() {
  try {
    return await axios.get("/api/preferences", {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function updatePreferences(
  newPreferences: Partial<PreferencesV2>,
) {
  try {
    return await axios.patch("/api/preferences", newPreferences, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function getProfile() {
  try {
    return await axios.get("/api/profile", {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateProfile(newProfile: Partial<ProfileV2>) {
  try {
    return await axios.patch("/api/profile", newProfile, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function getTaskLists() {
  try {
    return await axios.get("/api/task-lists", {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function createTaskList(newTaskList: Partial<TaskListV2>) {
  try {
    return await axios.post("/api/task-lists", newTaskList, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateTaskList(newTaskList: Partial<TaskListV2>) {
  try {
    return await axios.patch(`/api/task-lists/${newTaskList.id}`, newTaskList, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}

export async function deleteTaskList(taskListId: string) {
  try {
    return await axios.delete(`/api/task-lists/${taskListId}`, {
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    });
  } catch (err) {
    errorHandler(err);
  }
}
