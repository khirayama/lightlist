import type { TFunction } from "i18next";

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePasswordResetForm = (
  password: string,
  confirmPassword: string,
  t: TFunction,
) => {
  if (!password || !confirmPassword) {
    return t("form.required");
  }
  if (password.length < 6) {
    return t("form.passwordTooShort");
  }
  if (password !== confirmPassword) {
    return t("form.passwordMismatch");
  }
  return null;
};
