import type { TFunction } from "i18next";

type FirebaseAuthError = Error & {
  code?: string;
};

const getErrorCode = (error: Error) =>
  "code" in error ? String((error as FirebaseAuthError).code ?? "") : "";

export const resolveAuthErrorMessage = (error: Error, t: TFunction) => {
  const errorCode = getErrorCode(error);
  switch (errorCode) {
    case "auth/invalid-credential":
      return t("errors.invalidCredential");
    case "auth/user-not-found":
      return t("errors.userNotFound");
    case "auth/email-already-in-use":
      return t("errors.emailAlreadyInUse");
    case "auth/weak-password":
      return t("errors.weakPassword");
    case "auth/too-many-requests":
      return t("errors.tooManyRequests");
    case "auth/invalid-email":
      return t("errors.invalidEmail");
    default:
      return t("errors.generic");
  }
};

export const resolvePasswordResetErrorMessage = (
  error: Error,
  t: TFunction,
) => {
  const errorCode = getErrorCode(error);
  switch (errorCode) {
    case "auth/expired-action-code":
      return t("pages.passwordReset.expiredCode");
    case "auth/invalid-action-code":
      return t("pages.passwordReset.invalidCode");
    case "auth/weak-password":
      return t("form.passwordTooShort");
    case "auth/too-many-requests":
      return t("errors.tooManyRequests");
    default:
      return t("errors.generic");
  }
};
