import axios, { type AxiosResponse } from "axios";
import { Session } from "@supabase/supabase-js";

import { createSupabaseClient } from "common/supabase";
import { config } from "config";

export type Res<T, D = any> = Promise<AxiosResponse<T, D>>;

/* Auth Services */
let session: Session = null;

export function bindSession(newSession: Session) {
  session = newSession;
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

export async function signUpOrIn(
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
  lang?: string,
) {
  const supabase = createSupabaseClient();

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  if (!signInError && signInData?.session) {
    bindSession(signInData.session);
    return register({ lang });
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: config.appBaseUrl,
    },
  });
  if (!signUpError && signUpData) {
    if (signUpData.session) {
      bindSession(signUpData.session);
      return register({ lang });
    }
  }
}

export async function resetPasswordForEmail(
  email: string,
  options: { lang?: string } = {},
) {
  const supabase = createSupabaseClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password?lang=${options.lang || "JA"}`,
  });
}

export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Password update error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

export async function signOut() {
  const supabase = createSupabaseClient();
  return supabase.auth.signOut();
}

export async function deleteUser() {
  try {
    return await c()
      .delete("/api/user")
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

/* TaskList Services */
function errorHandler(err: Error) {
  console.warn(err);
}

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

export async function updateApp(newApp: Partial<App>) {
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

export async function updatePreferences(newPreferences: Partial<Preferences>) {
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

export async function updateProfile(newProfile: Partial<Profile>) {
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

export async function createTaskList(newTaskList: Partial<TaskList>) {
  try {
    return await c()
      .post("/api/task-lists", newTaskList)
      .then((res) => res.data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function updateTaskList(newTaskList: Partial<TaskList>) {
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
