import type { TFunction } from "i18next";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../appStyles";
import type { Theme } from "../theme";

type AuthTab = "signin" | "signup" | "reset";
type AuthFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthScreenProps = {
  t: TFunction;
  theme: Theme;
  activeTab: AuthTab;
  onTabChange: (nextTab: AuthTab) => void;
  form: AuthFormState;
  setForm: Dispatch<SetStateAction<AuthFormState>>;
  authErrorMessage: string | null;
  isSubmitting: boolean;
  resetLoading: boolean;
  resetSent: boolean;
  onSignIn: () => void | Promise<void>;
  onSignUp: () => void | Promise<void>;
  onPasswordReset: () => void | Promise<void>;
  passwordInputRef: RefObject<TextInput | null>;
  confirmPasswordInputRef: RefObject<TextInput | null>;
  onOpenShareCode: () => void;
};

export const AuthScreen = ({
  t,
  theme,
  activeTab,
  onTabChange,
  form,
  setForm,
  authErrorMessage,
  isSubmitting,
  resetLoading,
  resetSent,
  onSignIn,
  onSignUp,
  onPasswordReset,
  passwordInputRef,
  confirmPasswordInputRef,
  onOpenShareCode,
}: AuthScreenProps) => {
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
    !isSubmitting && form.email.trim().length > 0 && form.password.length > 0;
  const canSubmitSignUp =
    !isSubmitting &&
    form.email.trim().length > 0 &&
    form.password.length > 0 &&
    form.confirmPassword.length > 0;
  const canSendReset = !resetLoading && form.email.trim().length > 0;

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
            onPress={() => onTabChange("signin")}
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
            onPress={() => onTabChange("signup")}
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
                value={form.email}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, email: value }))
                }
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
                value={form.password}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
                placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={onSignIn}
                editable={!isSubmitting}
                accessibilityLabel={t("login.passwordLabel")}
              />
            </View>
            {authErrorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: theme.error }]}
              >
                {authErrorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.submit")}
              onPress={onSignIn}
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
              onPress={() => onTabChange("reset")}
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
                value={form.email}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, email: value }))
                }
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
                value={form.password}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
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
                value={form.confirmPassword}
                onChangeText={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: value,
                  }))
                }
                placeholder={t("login.confirmPasswordPlaceholder")}
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={onSignUp}
                editable={!isSubmitting}
                accessibilityLabel={t("login.confirmPasswordLabel")}
              />
            </View>
            {authErrorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: theme.error }]}
              >
                {authErrorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.signUpSubmit")}
              onPress={onSignUp}
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
                    value={form.email}
                    onChangeText={(value) =>
                      setForm((prev) => ({ ...prev, email: value }))
                    }
                    placeholder={t("login.emailPlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={onPasswordReset}
                    editable={!resetLoading}
                    accessibilityLabel={t("login.emailLabel")}
                  />
                </View>
                {authErrorMessage ? (
                  <Text
                    accessibilityRole="alert"
                    style={[styles.error, { color: theme.error }]}
                  >
                    {authErrorMessage}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("login.resetSubmit")}
                  onPress={onPasswordReset}
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
              onPress={() => onTabChange("signin")}
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
        <View style={styles.form}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("pages.sharecode.open")}
            onPress={onOpenShareCode}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              {t("pages.sharecode.open")}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};
