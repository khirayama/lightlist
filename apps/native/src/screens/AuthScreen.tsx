import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  signIn,
  signUp,
  sendPasswordResetEmail,
} from "@lightlist/sdk/mutations/auth";
import { styles } from "../styles/appStyles";
import { useTheme } from "../styles/theme";
import { resolveAuthErrorMessage } from "../utils/errors";
import { isValidEmail } from "../utils/validation";

type AuthTab = "signin" | "signup" | "reset";

type AuthScreenProps = {
  onOpenShareCode: () => void;
};

export const AuthScreen = ({ onOpenShareCode }: AuthScreenProps) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);

  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isSignUp = activeTab === "signup";
  const isReset = activeTab === "reset";
  const isSignIn = activeTab === "signin";

  const titleKey = isSignUp
    ? "login.signUpTitle"
    : isReset
      ? "login.resetTitle"
      : "login.title";
  const subtitleKey = isSignUp
    ? "login.signUpSubtitle"
    : isReset
      ? "login.resetSubtitle"
      : "login.subtitle";

  const canSubmitSignIn =
    !isSubmitting && email.trim().length > 0 && password.length > 0;
  const canSubmitSignUp =
    !isSubmitting &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;
  const canSendReset = !resetLoading && email.trim().length > 0;

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setResetSent(false);
    setIsSubmitting(false);
    setResetLoading(false);
  };

  const handleTabChange = (nextTab: AuthTab) => {
    setActiveTab(nextTab);
    resetForm();
  };

  const validateSignIn = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return t("form.required");
    }
    if (!isValidEmail(trimmedEmail)) {
      return t("form.invalidEmail");
    }
    return null;
  };

  const validateSignUp = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      return t("form.required");
    }
    if (!isValidEmail(trimmedEmail)) {
      return t("form.invalidEmail");
    }
    if (password.length < 6) {
      return t("form.passwordTooShort");
    }
    if (password !== confirmPassword) {
      return t("form.passwordMismatch");
    }
    return null;
  };

  const validateReset = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return t("form.required");
    }
    if (!isValidEmail(trimmedEmail)) {
      return t("form.invalidEmail");
    }
    return null;
  };

  const handleSignIn = async () => {
    const validationError = validateSignIn();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const trimmedEmail = email.trim();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signIn(trimmedEmail, password);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setErrorMessage(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    const validationError = validateSignUp();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const trimmedEmail = email.trim();
    const resolvedLanguage = i18n.language.toLowerCase().startsWith("ja")
      ? "ja"
      : "en";
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signUp(trimmedEmail, password, resolvedLanguage);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setErrorMessage(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const validationError = validateReset();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const trimmedEmail = email.trim();
    setResetLoading(true);
    setErrorMessage(null);
    try {
      await sendPasswordResetEmail(trimmedEmail);
      setResetSent(true);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setErrorMessage(t("errors.generic"));
      }
    } finally {
      setResetLoading(false);
    }
  };

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
            {t(titleKey)}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t(subtitleKey)}
          </Text>
        </View>
        <View
          style={[styles.tabs, { backgroundColor: theme.inputBackground }]}
          accessibilityRole="tablist"
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignIn }}
            onPress={() => handleTabChange("signin")}
            disabled={isSubmitting || resetLoading}
            style={({ pressed }) => [
              styles.tabButton,
              {
                backgroundColor: isSignIn ? theme.surface : "transparent",
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: isSignIn ? theme.text : theme.muted },
              ]}
            >
              {t("login.tabs.signIn")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignUp }}
            onPress={() => handleTabChange("signup")}
            disabled={isSubmitting || resetLoading}
            style={({ pressed }) => [
              styles.tabButton,
              {
                backgroundColor: isSignUp ? theme.surface : "transparent",
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: isSignUp ? theme.text : theme.muted },
              ]}
            >
              {t("login.tabs.signUp")}
            </Text>
          </Pressable>
        </View>
        {isSignIn && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("login.emailLabel")}
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
                value={email}
                onChangeText={setEmail}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!isSubmitting}
                accessibilityLabel={t("login.emailLabel")}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("login.passwordLabel")}
              </Text>
              <TextInput
                ref={passwordInputRef}
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
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!isSubmitting}
                accessibilityLabel={t("login.passwordLabel")}
              />
            </View>
            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: theme.error }]}
              >
                {errorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.submit")}
              onPress={handleSignIn}
              disabled={!canSubmitSignIn}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: canSubmitSignIn
                    ? theme.primary
                    : theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: canSubmitSignIn ? theme.primaryText : theme.muted,
                  },
                ]}
              >
                {isSubmitting ? t("login.loading") : t("login.submit")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.forgotPassword")}
              onPress={() => handleTabChange("reset")}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                {t("login.forgotPassword")}
              </Text>
            </Pressable>
          </View>
        )}
        {isSignUp && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("login.emailLabel")}
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
                value={email}
                onChangeText={setEmail}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!isSubmitting}
                accessibilityLabel={t("login.emailLabel")}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("login.passwordLabel")}
              </Text>
              <TextInput
                ref={passwordInputRef}
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
                editable={!isSubmitting}
                accessibilityLabel={t("login.passwordLabel")}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t("login.confirmPasswordLabel")}
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
                onSubmitEditing={handleSignUp}
                editable={!isSubmitting}
                accessibilityLabel={t("login.confirmPasswordLabel")}
              />
            </View>
            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: theme.error }]}
              >
                {errorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.signUpSubmit")}
              onPress={handleSignUp}
              disabled={!canSubmitSignUp}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: canSubmitSignUp
                    ? theme.primary
                    : theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: canSubmitSignUp ? theme.primaryText : theme.muted,
                  },
                ]}
              >
                {isSubmitting
                  ? t("login.signUpLoading")
                  : t("login.signUpSubmit")}
              </Text>
            </Pressable>
          </View>
        )}
        {isReset && (
          <View style={styles.form}>
            {resetSent ? (
              <Text style={[styles.notice, { color: theme.primary }]}>
                {t("login.resetSuccess")}
              </Text>
            ) : (
              <>
                <Text style={[styles.helpText, { color: theme.muted }]}>
                  {t("login.resetInstruction")}
                </Text>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t("login.emailLabel")}
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
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t("login.emailPlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordReset}
                    editable={!resetLoading}
                    accessibilityLabel={t("login.emailLabel")}
                  />
                </View>
                {errorMessage ? (
                  <Text
                    accessibilityRole="alert"
                    style={[styles.error, { color: theme.error }]}
                  >
                    {errorMessage}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("login.resetSubmit")}
                  onPress={handlePasswordReset}
                  disabled={!canSendReset}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: canSendReset
                        ? theme.primary
                        : theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: canSendReset ? theme.primaryText : theme.muted,
                      },
                    ]}
                  >
                    {resetLoading
                      ? t("login.resetLoading")
                      : t("login.resetSubmit")}
                  </Text>
                </Pressable>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.backToSignIn")}
              onPress={() => handleTabChange("signin")}
              disabled={resetLoading}
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
        )}
      </View>
    </ScrollView>
  );
};
