import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "../utils/errors";
import { FormErrors, validatePasswordForm } from "../utils/validation";

type PasswordResetScreenProps = {
  oobCode: string | null;
  onBack: () => void;
};

export const PasswordResetScreen = ({
  oobCode,
  onBack,
}: PasswordResetScreenProps) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSuccess, setResetSuccess] = useState(false);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const normalizedCode = typeof oobCode === "string" ? oobCode : "";

  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setResetSuccess(false);

    if (!normalizedCode) {
      setCodeValid(false);
      setErrors({ general: t("auth.passwordReset.invalidCode") });
      return;
    }

    let cancelled = false;
    const verifyCode = async () => {
      try {
        setCodeValid(null);
        await verifyPasswordResetCode(normalizedCode);
        if (!cancelled) {
          setCodeValid(true);
        }
      } catch (error) {
        if (cancelled) return;
        setErrors({
          general: resolveErrorMessage(error, t, "auth.error.general"),
        });
        setCodeValid(false);
      }
    };

    void verifyCode();

    return () => {
      cancelled = true;
    };
  }, [normalizedCode, t]);

  useEffect(() => {
    if (!resetSuccess) return;
    const timer = setTimeout(() => {
      onBack();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onBack, resetSuccess]);

  const handleSubmit = async () => {
    setErrors({});
    if (!normalizedCode) {
      setCodeValid(false);
      setErrors({ general: t("auth.passwordReset.invalidCode") });
      return;
    }

    const validationErrors = validatePasswordForm(
      { password, confirmPassword },
      t,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(normalizedCode, password);
      setResetSuccess(true);
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading && password.length > 0 && confirmPassword.length > 0;

  const content = (() => {
    if (codeValid === null) {
      return (
        <View className="gap-4">
          <ActivityIndicator className="text-primary dark:text-primary-dark" />
        </View>
      );
    }

    if (codeValid === false) {
      return (
        <View className="gap-4">
          <Text
            accessibilityRole="alert"
            className="text-[13px] font-inter text-error dark:text-error-dark"
          >
            {errors.general ?? t("auth.passwordReset.invalidCode")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("auth.button.backToSignIn")}
            onPress={onBack}
            className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
          >
            <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
              {t("auth.button.backToSignIn")}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (resetSuccess) {
      return (
        <View className="gap-4">
          <Text className="text-[13px] font-inter text-success dark:text-success-dark">
            {t("auth.passwordReset.resetSuccess")}
          </Text>
          <View className="items-center">
            <ActivityIndicator className="text-primary dark:text-primary-dark" />
          </View>
        </View>
      );
    }

    return (
      <View className="gap-4">
        {errors.general ? (
          <Text
            accessibilityRole="alert"
            className="text-[13px] font-inter text-error dark:text-error-dark"
          >
            {errors.general}
          </Text>
        ) : null}

        <View className="gap-1.5">
          <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
            {t("auth.passwordReset.newPassword")}
          </Text>
          <TextInput
            className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.placeholder.password")}
            placeholderClassName="text-placeholder dark:text-placeholder-dark"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            editable={!loading}
            accessibilityLabel={t("auth.passwordReset.newPassword")}
          />
          {errors.password ? (
            <Text
              accessibilityRole="alert"
              className="text-[13px] font-inter text-error dark:text-error-dark"
            >
              {errors.password}
            </Text>
          ) : null}
        </View>

        <View className="gap-1.5">
          <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
            {t("auth.passwordReset.confirmNewPassword")}
          </Text>
          <TextInput
            ref={confirmPasswordInputRef}
            className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("auth.placeholder.password")}
            placeholderClassName="text-placeholder dark:text-placeholder-dark"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!loading}
            accessibilityLabel={t("auth.passwordReset.confirmNewPassword")}
          />
          {errors.confirmPassword ? (
            <Text
              accessibilityRole="alert"
              className="text-[13px] font-inter text-error dark:text-error-dark"
            >
              {errors.confirmPassword}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("auth.passwordReset.setNewPassword")}
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
            canSubmit
              ? "bg-primary dark:bg-primary-dark"
              : "bg-border dark:bg-border-dark"
          }`}
        >
          <Text
            className={`text-[16px] font-inter-semibold ${
              canSubmit
                ? "text-primary-text dark:text-primary-text-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {loading
              ? t("auth.passwordReset.settingNewPassword")
              : t("auth.passwordReset.setNewPassword")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("auth.button.backToSignIn")}
          onPress={onBack}
          disabled={loading}
          className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
        >
          <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
            {t("auth.button.backToSignIn")}
          </Text>
        </Pressable>
      </View>
    );
  })();

  return (
    <ScrollView
      contentContainerClassName="flex-grow justify-center px-4 py-10 w-full max-w-[576px] self-center"
      keyboardShouldPersistTaps="handled"
    >
      <View className="rounded-[16px] border p-6 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <View className="mb-5">
          <Text className="text-[12px] font-inter-semibold tracking-[2px] uppercase text-muted dark:text-muted-dark">
            {t("title")}
          </Text>
          <Text className="text-[28px] font-inter-bold text-text dark:text-text-dark mt-2.5">
            {t("auth.passwordReset.title")}
          </Text>
        </View>
        {content}
      </View>
    </ScrollView>
  );
};
