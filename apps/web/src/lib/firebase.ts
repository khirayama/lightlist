import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

const getApp = () =>
  getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
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

  cachedDb = initializeFirestore(getApp(), {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  return cachedDb;
};
