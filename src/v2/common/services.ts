import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import { getSession } from "v2/common/auth";

export type Res<T> = Promise<{ data: T }>;

export async function register(options: { lang?: string } = {}) {
  return axios.post("/api/register", options, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export async function getApp() {
  return axios.get("/api/app", {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function updateApp(newApp: Partial<AppV2>) {
  return axios.patch("/api/app", newApp, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function getPreferences() {
  return axios.get("/api/preferences", {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function updatePreferences(newPreferences: Partial<PreferencesV2>) {
  return axios.patch("/api/preferences", newPreferences, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function getProfile() {
  return axios.get("/api/profile", {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function updateProfile(newProfile: Partial<ProfileV2>) {
  return axios.patch("/api/profile", newProfile, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function getTaskLists() {
  return axios.get("/api/task-lists", {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function createTaskList(newTaskList: Partial<TaskListV2>) {
  return axios.post("/api/task-lists", newTaskList, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function updateTaskList(newTaskList: Partial<TaskListV2>) {
  return axios.patch(`/api/task-lists/${newTaskList.id}`, newTaskList, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}

export function deleteTaskList(taskListId: string) {
  return axios.delete(`/api/task-lists/${taskListId}`, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${getSession()?.access_token}`,
    },
  });
}
