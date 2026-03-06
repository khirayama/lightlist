import type { FirebaseOptions } from "firebase/app";
import { getRuntimeConfig } from "../config";

type PublicEnvPrefix = "NEXT_PUBLIC" | "EXPO_PUBLIC";

const requireEnv = (keys: readonly string[]): string => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing environment variable: ${keys.join(" or ")}`);
};

export const getFirebaseConfig = (
  publicEnvPrefix: PublicEnvPrefix,
): FirebaseOptions =>
  getRuntimeConfig().firebaseConfig ?? {
    apiKey: requireEnv([`${publicEnvPrefix}_FIREBASE_API_KEY`]),
    authDomain: requireEnv([`${publicEnvPrefix}_FIREBASE_AUTH_DOMAIN`]),
    projectId: requireEnv([`${publicEnvPrefix}_FIREBASE_PROJECT_ID`]),
    storageBucket: requireEnv([`${publicEnvPrefix}_FIREBASE_STORAGE_BUCKET`]),
    messagingSenderId: requireEnv([
      `${publicEnvPrefix}_FIREBASE_MESSAGING_SENDER_ID`,
    ]),
    appId: requireEnv([`${publicEnvPrefix}_FIREBASE_APP_ID`]),
  };

export const getPasswordResetUrl = (): string =>
  getRuntimeConfig().passwordResetUrl ??
  requireEnv([
    "NEXT_PUBLIC_PASSWORD_RESET_URL",
    "EXPO_PUBLIC_PASSWORD_RESET_URL",
  ]);
