import { TFunction } from "i18next";

export type FormErrors = Partial<{
  email: string;
  password: string;
  confirmPassword: string;
  general: string;
}>;

type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
  requirePasswordConfirm?: boolean;
};

type PasswordFormData = {
  password: string;
  confirmPassword: string;
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateAuthForm = (
  data: AuthFormData,
  t: TFunction<"translation">,
): FormErrors => {
  const errors: FormErrors = {};

  if (!data.email.trim()) {
    errors.email = t("auth.validation.email.required");
  } else if (!validateEmail(data.email)) {
    errors.email = t("auth.validation.email.invalid");
  }

  if (!data.password) {
    errors.password = t("auth.validation.password.required");
  } else if (data.requirePasswordConfirm && data.password.length < 6) {
    errors.password = t("auth.validation.password.tooShort");
  }

  if (data.requirePasswordConfirm) {
    if (!data.confirmPassword) {
      errors.confirmPassword = t("auth.validation.confirmPassword.required");
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = t("auth.validation.confirmPassword.notMatch");
    }
  }

  return errors;
};

export const validatePasswordForm = (
  data: PasswordFormData,
  t: TFunction<"translation">,
): FormErrors => {
  const errors: FormErrors = {};

  if (!data.password) {
    errors.password = t("auth.validation.password.required");
  } else if (data.password.length < 6) {
    errors.password = t("auth.validation.password.tooShort");
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = t("auth.validation.confirmPassword.required");
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = t("auth.validation.confirmPassword.notMatch");
  }

  return errors;
};
