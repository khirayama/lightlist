import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "../utils/env";

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

const getApp = () =>
  getApps().length === 0
    ? initializeApp(getFirebaseConfig("NEXT_PUBLIC"))
    : getApps()[0];

export const getAuthInstance = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = getAuth(getApp());
  return cachedAuth;
};

export const getDbInstance = (): Firestore => {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getFirestore(getApp());
  return cachedDb;
};
