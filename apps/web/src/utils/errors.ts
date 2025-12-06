export const getErrorMessage = (
  errorCode: string,
  t: (key: string) => string,
): string => {
  const errorKeyMap: { [key: string]: string } = {
    "auth/invalid-credential": "auth.error.invalidCredential",
    "auth/user-not-found": "auth.error.userNotFound",
    "auth/email-already-in-use": "auth.error.emailAlreadyInUse",
    "auth/weak-password": "auth.error.weakPassword",
    "auth/invalid-email": "auth.error.invalidEmail",
    "auth/operation-not-allowed": "auth.error.operationNotAllowed",
    "auth/too-many-requests": "auth.error.tooManyRequests",
    "auth/expired-action-code": "auth.passwordReset.expiredCode",
    "auth/invalid-action-code": "auth.passwordReset.invalidCode",
  };
  const key = errorKeyMap[errorCode] || "auth.error.general";
  return t(key);
};

type ErrorLike = { code?: string; message?: string };

export const resolveErrorMessage = (
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string => {
  if (typeof error === "object" && error !== null) {
    const err = error as ErrorLike;
    if (typeof err.code === "string") {
      return getErrorMessage(err.code, t);
    }
    if (typeof err.message === "string") {
      return err.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t(fallbackKey);
};
