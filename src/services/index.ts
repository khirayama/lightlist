import axios, { type AxiosResponse } from "axios";
import { Session } from "@supabase/supabase-js";

export type Res<T, D = any> = Promise<AxiosResponse<T, D>>;

let session: Session = null;

export function bindSession(newSession: Session) {
  session = newSession;
}

function errorHandler(err: Error) {
  console.warn(err);
}

const c = () => {
  if (session === null) {
    throw new Error("Session is not bound");
  }

  return axios.create({
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
};

export async function register(options: { lang?: string } = {}) {
  try {
    return await c()
      .post("/api/register", options)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function getApp() {
  try {
    return await c()
      .get("/api/app")
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateApp(newApp: Partial<AppV2>) {
  try {
    return await c()
      .patch("/api/app", newApp)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function getPreferences() {
  try {
    return await c()
      .get("/api/preferences")
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function updatePreferences(
  newPreferences: Partial<PreferencesV2>,
) {
  try {
    return await c()
      .patch("/api/preferences", newPreferences)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function getProfile() {
  try {
    return await c()
      .get("/api/profile")
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateProfile(newProfile: Partial<ProfileV2>) {
  try {
    return await c()
      .patch("/api/profile", newProfile)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function getTaskLists() {
  try {
    return await c()
      .get("/api/task-lists")
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function createTaskList(newTaskList: Partial<TaskListV2>) {
  try {
    return await c()
      .post("/api/task-lists", newTaskList)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateTaskList(newTaskList: Partial<TaskListV2>) {
  try {
    return await c()
      .patch(`/api/task-lists/${newTaskList.id}`, newTaskList)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function deleteTaskList(taskListId: string) {
  try {
    return await c()
      .delete(`/api/task-lists/${taskListId}`)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function refreshShareCode(shareCode: string) {
  try {
    return await c()
      .put(`/api/share-codes/${shareCode}`)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function getTaskListsWithShareCodes(shareCodes: string[]) {
  try {
    return await c()
      .get("/api/task-lists", {
        params: {
          shareCodes,
        },
        paramsSerializer: { indexes: null },
      })
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}
