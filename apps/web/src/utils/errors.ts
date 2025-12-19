import type { TFunction } from "i18next";

const ERROR_KEY_MAP = {
  "auth/invalid-credential": "auth.error.invalidCredential",
  "auth/user-not-found": "auth.error.userNotFound",
  "auth/email-already-in-use": "auth.error.emailAlreadyInUse",
  "auth/weak-password": "auth.error.weakPassword",
  "auth/invalid-email": "auth.error.invalidEmail",
  "auth/operation-not-allowed": "auth.error.operationNotAllowed",
  "auth/too-many-requests": "auth.error.tooManyRequests",
  "auth/expired-action-code": "auth.passwordReset.expiredCode",
  "auth/invalid-action-code": "auth.passwordReset.invalidCode",
} as const;

type AuthErrorCode = keyof typeof ERROR_KEY_MAP;

const isAuthErrorCode = (code: unknown): code is AuthErrorCode =>
  typeof code === "string" && code in ERROR_KEY_MAP;

const isCodedError = (error: unknown): error is { code: string } =>
  Boolean(
    error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string",
  );

const hasMessage = (error: unknown): error is { message: string } =>
  Boolean(
    error &&
    typeof error === "object" &&
    typeof (error as { message?: unknown }).message === "string",
  );

export const getErrorMessage = (
  errorCode: string,
  t: TFunction<"translation">,
): string => {
  if (isAuthErrorCode(errorCode)) {
    return t(ERROR_KEY_MAP[errorCode]);
  }
  return t("auth.error.general");
};

export const resolveErrorMessage = (
  error: unknown,
  t: TFunction<"translation">,
  fallbackKey: Parameters<TFunction<"translation">>[0],
): string => {
  if (typeof error === "string") {
    return error;
  }

  if (isCodedError(error)) {
    return getErrorMessage(error.code, t);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (hasMessage(error)) {
    return error.message;
  }

  return t(fallbackKey as never);
};
