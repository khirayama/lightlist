import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps } from "firebase/app";
import type {
  Auth,
  Persistence,
  ReactNativeAsyncStorage,
} from "@firebase/auth";
import { getAuth, initializeAuth } from "@firebase/auth";
import * as FirebaseAuth from "@firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "../utils/env";

const getReactNativePersistence = (
  FirebaseAuth as {
    getReactNativePersistence?: (
      storage: ReactNativeAsyncStorage,
    ) => Persistence;
  }
).getReactNativePersistence;

if (!getReactNativePersistence) {
  throw new Error("getReactNativePersistence is not available");
}

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

const getApp = () =>
  getApps().length === 0
    ? initializeApp(getFirebaseConfig("EXPO_PUBLIC"))
    : getApps()[0];

export const getAuthInstance = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getApp();

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
};

export const getDbInstance = (): Firestore => {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getFirestore(getApp());
  return cachedDb;
};
