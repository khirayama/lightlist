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
import { validatePasswordResetForm } from "../utils/validation";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const normalizedCode = typeof oobCode === "string" ? oobCode : "";

  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setResetSuccess(false);

    if (!normalizedCode) {
      setCodeValid(false);
      setErrorMessage(t("pages.passwordReset.invalidCode"));
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
        setErrorMessage(resolveErrorMessage(error, t, "auth.error.general"));
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
    setErrorMessage(null);
    if (!normalizedCode) {
      setCodeValid(false);
      setErrorMessage(t("pages.passwordReset.invalidCode"));
      return;
    }

    const validationError = validatePasswordResetForm(
      password,
      confirmPassword,
      t,
    );
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(normalizedCode, password);
      setResetSuccess(true);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, t, "auth.error.general"));
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
            {errorMessage ?? t("pages.passwordReset.invalidCode")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("login.backToSignIn")}
            onPress={onBack}
            className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
          >
            <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
              {t("login.backToSignIn")}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (resetSuccess) {
      return (
        <View className="gap-4">
          <Text className="text-[13px] font-inter text-success dark:text-success-dark">
            {t("pages.passwordReset.success")}
          </Text>
          <View className="items-center">
            <ActivityIndicator className="text-primary dark:text-primary-dark" />
          </View>
        </View>
      );
    }

    return (
      <View className="gap-4">
        {errorMessage ? (
          <Text
            accessibilityRole="alert"
            className="text-[13px] font-inter text-error dark:text-error-dark"
          >
            {errorMessage}
          </Text>
        ) : null}
        <View className="gap-1.5">
          <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
            {t("pages.passwordReset.newPassword")}
          </Text>
          <TextInput
            className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderClassName="text-placeholder dark:text-placeholder-dark"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            editable={!loading}
            accessibilityLabel={t("pages.passwordReset.newPassword")}
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
            {t("pages.passwordReset.confirmPassword")}
          </Text>
          <TextInput
            ref={confirmPasswordInputRef}
            className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("login.confirmPasswordPlaceholder")}
            placeholderClassName="text-placeholder dark:text-placeholder-dark"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!loading}
            accessibilityLabel={t("pages.passwordReset.confirmPassword")}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.passwordReset.submit")}
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
              ? t("pages.passwordReset.submitting")
              : t("pages.passwordReset.submit")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("login.backToSignIn")}
          onPress={onBack}
          disabled={loading}
          className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
        >
          <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
            {t("login.backToSignIn")}
          </Text>
        </Pressable>
      </View>
    );
  })();

  return (
    <ScrollView
      contentContainerClassName="flex-grow justify-center p-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="rounded-[16px] border p-6 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <View className="mb-5">
          <Text className="text-[12px] font-inter-semibold tracking-[2px] uppercase text-muted dark:text-muted-dark">
            {t("app.name")}
          </Text>
          <Text className="text-[28px] font-inter-bold text-text dark:text-text-dark mt-2.5">
            {t("pages.passwordReset.title")}
          </Text>
          <Text className="text-[14px] font-inter text-muted dark:text-muted-dark mt-2">
            {t("pages.passwordReset.subtitle")}
          </Text>
        </View>
        {content}
      </View>
    </ScrollView>
  );
};
