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
} from "firebase/auth";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore";

import { auth, db } from "../firebase";
import {
  SettingsStore,
  TaskListOrderStore,
  TaskListStore,
  Language,
} from "../types";
import { appStore } from "../store";
import { deleteTaskList } from "./app";
import { DEFAULT_LANGUAGE, normalizeLanguage } from "../utils/language";

const withAuthLanguage = async <T>(
  language: Language,
  fn: () => Promise<T>,
): Promise<T> => {
  const previousLanguageCode = auth.languageCode;
  auth.languageCode = language;
  try {
    return await fn();
  } finally {
    auth.languageCode = previousLanguageCode;
  }
};

const requirePasswordResetUrl = (): string => {
  const resetUrl =
    process.env.NEXT_PUBLIC_PASSWORD_RESET_URL ||
    process.env.EXPO_PUBLIC_PASSWORD_RESET_URL;
  if (!resetUrl) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_PASSWORD_RESET_URL or EXPO_PUBLIC_PASSWORD_RESET_URL",
    );
  }
  return resetUrl;
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

export async function signUp(
  email: string,
  password: string,
  language: Language,
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = userCredential.user.uid;
  const now = Date.now();
  const taskListId = doc(collection(db, "taskLists")).id;
  const normalizedLanguage = normalizeLanguage(language);
  const taskListName = INITIAL_TASK_LIST_NAME_BY_LANGUAGE[normalizedLanguage];

  const settingsData: SettingsStore = {
    theme: "system",
    language: normalizedLanguage,
    taskInsertPosition: "top",
    autoSort: false,
    createdAt: now,
    updatedAt: now,
  };

  const taskListData: TaskListStore = {
    id: taskListId,
    name: taskListName,
    tasks: {},
    history: [],
    shareCode: null,
    background: null,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  const taskListOrderData = {
    [taskListId]: { order: 1.0 },
    createdAt: now,
    updatedAt: now,
  } as TaskListOrderStore;

  const batch = writeBatch(db);
  batch.set(doc(db, "settings", uid), settingsData);
  batch.set(doc(db, "taskLists", taskListId), taskListData);
  batch.set(doc(db, "taskListOrder", uid), taskListOrderData);
  await batch.commit();
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function sendPasswordResetEmail(
  email: string,
  language?: Language,
) {
  const data = appStore.getData();

  const actionCodeSettings: ActionCodeSettings = {
    url: requirePasswordResetUrl(),
    handleCodeInApp: false,
  };
  const languageToUse = normalizeLanguage(
    language || data.settings?.language || DEFAULT_LANGUAGE,
  );
  await withAuthLanguage(languageToUse, () =>
    firebaseSendPasswordResetEmail(auth, email, actionCodeSettings),
  );
}

export async function verifyPasswordResetCode(code: string) {
  return await firebaseVerifyPasswordResetCode(auth, code);
}

export async function confirmPasswordReset(code: string, newPassword: string) {
  await firebaseConfirmPasswordReset(auth, code, newPassword);
}

export async function sendEmailChangeVerification(newEmail: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  const data = appStore.getData();
  const language = normalizeLanguage(
    data.settings?.language || DEFAULT_LANGUAGE,
  );
  await withAuthLanguage(language, () =>
    verifyBeforeUpdateEmail(user, newEmail),
  );
}

export async function deleteAccount() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const taskListOrderSnapshot = await getDoc(taskListOrderRef);
  if (taskListOrderSnapshot.exists()) {
    const taskListOrderData =
      taskListOrderSnapshot.data() as TaskListOrderStore;
    const taskListIds = Object.keys(taskListOrderData).filter(
      (key) => key !== "createdAt" && key !== "updatedAt",
    );
    await Promise.allSettled(
      taskListIds.map((taskListId) => deleteTaskList(taskListId)),
    );
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, "settings", uid));
  batch.delete(taskListOrderRef);

  await batch.commit();
  await deleteUser(auth.currentUser!);
}
