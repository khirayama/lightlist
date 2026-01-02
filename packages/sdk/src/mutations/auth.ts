import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  deleteUser,
  ActionCodeSettings,
} from "firebase/auth";
import { collection, doc, writeBatch } from "firebase/firestore";

import { auth, db } from "../firebase";
import {
  SettingsStore,
  TaskListOrderStore,
  TaskListStore,
  Language,
} from "../types";
import { appStore } from "../store";

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
  const taskListName = language === "ja" ? "📒個人" : "📒PERSONAL";

  const settingsData: SettingsStore = {
    theme: "system",
    language,
    taskInsertPosition: "bottom",
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

  const resetUrl =
    process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || "http://localhost:3000";
  const actionCodeSettings: ActionCodeSettings = {
    url: resetUrl,
    handleCodeInApp: false,
  };
  const languageToUse = language || data.settings?.language || "ja";
  auth.languageCode = languageToUse;
  await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);
}

export async function verifyPasswordResetCode(code: string) {
  return await firebaseVerifyPasswordResetCode(auth, code);
}

export async function confirmPasswordReset(code: string, newPassword: string) {
  await firebaseConfirmPasswordReset(auth, code, newPassword);
}

export async function deleteAccount() {
  const data = appStore.getData();

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user logged in");

  const batch = writeBatch(db);
  batch.delete(doc(db, "settings", uid));
  batch.delete(doc(db, "taskListOrder", uid));

  const taskListIds = Object.keys(data.taskLists);
  taskListIds.forEach((id) => {
    batch.delete(doc(db, "taskLists", id));
  });

  await batch.commit();
  await deleteUser(auth.currentUser!);
}
