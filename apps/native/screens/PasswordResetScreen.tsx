import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "@lightlist/sdk/mutations/auth";
import { styles } from "../appStyles";
import type { Theme } from "../theme";

type PasswordResetScreenProps = {
  t: TFunction;
  theme: Theme;
  oobCode: string | null;
  onBack: () => void;
};

type FirebaseAuthError = Error & {
  code?: string;
};

const resolvePasswordResetErrorMessage = (error: Error, t: TFunction) => {
  const errorCode =
    "code" in error ? String((error as FirebaseAuthError).code ?? "") : "";
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

const validatePasswordResetForm = (
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

export const PasswordResetScreen = ({
  t,
  theme,
  oobCode,
  onBack,
}: PasswordResetScreenProps) => {
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
        if (error instanceof Error) {
          setErrorMessage(resolvePasswordResetErrorMessage(error, t));
        } else {
          setErrorMessage(t("errors.generic"));
        }
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
      if (error instanceof Error) {
        setErrorMessage(resolvePasswordResetErrorMessage(error, t));
      } else {
        setErrorMessage(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading && password.length > 0 && confirmPassword.length > 0;

  const content = (() => {
    if (codeValid === null) {
      return (
        <View style={styles.form}>
          <ActivityIndicator color={theme.primary} />
        </View>
      );
    }

    if (codeValid === false) {
      return (
        <View style={styles.form}>
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: theme.error }]}
          >
            {errorMessage ?? t("pages.passwordReset.invalidCode")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("login.backToSignIn")}
            onPress={onBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              {t("login.backToSignIn")}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (resetSuccess) {
      return (
        <View style={styles.form}>
          <Text style={[styles.notice, { color: theme.primary }]}>
            {t("pages.passwordReset.success")}
          </Text>
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.form}>
        {errorMessage ? (
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: theme.error }]}
          >
            {errorMessage}
          </Text>
        ) : null}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            {t("pages.passwordReset.newPassword")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            editable={!loading}
            accessibilityLabel={t("pages.passwordReset.newPassword")}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            {t("pages.passwordReset.confirmPassword")}
          </Text>
          <TextInput
            ref={confirmPasswordInputRef}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("login.confirmPasswordPlaceholder")}
            placeholderTextColor={theme.placeholder}
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
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canSubmit ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: canSubmit ? theme.primaryText : theme.muted,
              },
            ]}
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
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
            {t("login.backToSignIn")}
          </Text>
        </Pressable>
      </View>
    );
  })();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.appName, { color: theme.muted }]}>
            {t("app.name")}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("pages.passwordReset.title")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t("pages.passwordReset.subtitle")}
          </Text>
        </View>
        {content}
      </View>
    </ScrollView>
  );
};
