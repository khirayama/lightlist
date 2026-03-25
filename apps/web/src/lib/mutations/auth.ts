import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  deleteUser,
  verifyBeforeUpdateEmail,
  ActionCodeSettings,
  type User,
} from "firebase/auth";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore";

import { getAuthInstance, getDbInstance } from "../firebase";
import {
  SettingsStore,
  TaskListOrderStore,
  TaskListStore,
  Language,
} from "../types";
import { getCurrentSettings } from "../settings";
import { deleteTaskList } from "./app";
import { DEFAULT_LANGUAGE, normalizeLanguage } from "../utils/language";

const withAuthLanguage = async <T>(
  language: Language,
  fn: () => Promise<T>,
): Promise<T> => {
  const auth = getAuthInstance();
  const previousLanguageCode = auth.languageCode;
  auth.languageCode = language;
  try {
    return await fn();
  } finally {
    auth.languageCode = previousLanguageCode;
  }
};

const INITIAL_TASK_LIST_NAME_BY_LANGUAGE: Record<Language, string> = {
  ja: "📒個人",
  en: "📒PERSONAL",
  es: "📒PERSONAL",
  de: "📒PERSÖNLICH",
  fr: "📒PERSONNEL",
  ko: "📒개인",
  "zh-CN": "📒个人",
  hi: "📒व्यक्तिगत",
  ar: "📒شخصية",
  "pt-BR": "📒PESSOAL",
  id: "📒PRIBADI",
};

const getPreferredLanguage = (language?: Language): Language => {
  return normalizeLanguage(
    language ?? getCurrentSettings()?.language ?? DEFAULT_LANGUAGE,
  );
};

const requireCurrentUser = (): User => {
  const user = getAuthInstance().currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }
  return user;
};

const getTaskListIdsFromOrder = (
  taskListOrder: TaskListOrderStore,
): string[] => {
  return Object.keys(taskListOrder).filter(
    (key) => key !== "createdAt" && key !== "updatedAt",
  );
};

const createInitialSettingsStore = (
  language: Language,
  now: number,
): SettingsStore => ({
  theme: "system",
  language,
  taskInsertPosition: "top",
  autoSort: false,
  createdAt: now,
  updatedAt: now,
});

const createInitialTaskListStore = (
  taskListId: string,
  language: Language,
  now: number,
): TaskListStore => ({
  id: taskListId,
  name: INITIAL_TASK_LIST_NAME_BY_LANGUAGE[language],
  tasks: {},
  history: [],
  shareCode: null,
  background: null,
  memberCount: 1,
  createdAt: now,
  updatedAt: now,
});

const createInitialTaskListOrderStore = (
  taskListId: string,
  now: number,
): TaskListOrderStore => {
  return {
    [taskListId]: { order: 1.0 },
    createdAt: now,
    updatedAt: now,
  } as TaskListOrderStore;
};

export async function signUp(
  email: string,
  password: string,
  language: Language,
) {
  const auth = getAuthInstance();
  const db = getDbInstance();
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = userCredential.user.uid;
  const now = Date.now();
  const taskListId = doc(collection(db, "taskLists")).id;
  const normalizedLanguage = normalizeLanguage(language);
  const settingsData = createInitialSettingsStore(normalizedLanguage, now);
  const taskListData = createInitialTaskListStore(
    taskListId,
    normalizedLanguage,
    now,
  );
  const taskListOrderData = createInitialTaskListOrderStore(taskListId, now);

  const batch = writeBatch(db);
  batch.set(doc(db, "settings", uid), settingsData);
  batch.set(doc(db, "taskLists", taskListId), taskListData);
  batch.set(doc(db, "taskListOrder", uid), taskListOrderData);
  await batch.commit();
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(getAuthInstance(), email, password);
}

export async function signOut() {
  await firebaseSignOut(getAuthInstance());
}

export async function sendPasswordResetEmail(
  email: string,
  language?: Language,
) {
  const auth = getAuthInstance();

  const actionCodeSettings: ActionCodeSettings = {
    url: process.env.NEXT_PUBLIC_PASSWORD_RESET_URL!,
    handleCodeInApp: false,
  };
  const languageToUse = getPreferredLanguage(language);
  await withAuthLanguage(languageToUse, () =>
    firebaseSendPasswordResetEmail(auth, email, actionCodeSettings),
  );
}

export async function verifyPasswordResetCode(code: string) {
  return await firebaseVerifyPasswordResetCode(getAuthInstance(), code);
}

export async function confirmPasswordReset(code: string, newPassword: string) {
  await firebaseConfirmPasswordReset(getAuthInstance(), code, newPassword);
}

export async function sendEmailChangeVerification(newEmail: string) {
  const user = requireCurrentUser();
  const language = getPreferredLanguage();
  await withAuthLanguage(language, () =>
    verifyBeforeUpdateEmail(user, newEmail),
  );
}

export async function deleteAccount() {
  const user = requireCurrentUser();
  const db = getDbInstance();
  const uid = user.uid;

  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const taskListOrderSnapshot = await getDoc(taskListOrderRef);
  if (taskListOrderSnapshot.exists()) {
    const taskListOrderData =
      taskListOrderSnapshot.data() as TaskListOrderStore;
    const taskListIds = getTaskListIdsFromOrder(taskListOrderData);
    await Promise.allSettled(
      taskListIds.map((taskListId) => deleteTaskList(taskListId)),
    );
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, "settings", uid));
  batch.delete(taskListOrderRef);

  await batch.commit();
  await deleteUser(user);
}
