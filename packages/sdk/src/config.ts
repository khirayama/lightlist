import type { FirebaseOptions } from "firebase/app";

type RuntimeConfig = {
  firebaseConfig?: FirebaseOptions;
  passwordResetUrl?: string;
};

const runtimeConfig: RuntimeConfig = {};

export const initializeSdk = (config: RuntimeConfig) => {
  if (config.firebaseConfig) {
    runtimeConfig.firebaseConfig = config.firebaseConfig;
  }

  if (config.passwordResetUrl) {
    runtimeConfig.passwordResetUrl = config.passwordResetUrl;
  }
};

export const getRuntimeConfig = (): Readonly<RuntimeConfig> => runtimeConfig;
