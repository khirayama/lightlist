import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  signIn,
  signUp,
  sendPasswordResetEmail,
} from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "../utils/errors";
import { isValidEmail } from "../utils/validation";

type AuthTab = "signin" | "signup" | "reset";

type AuthScreenProps = {
  onOpenShareCode: () => void;
};

export const AuthScreen = ({ onOpenShareCode }: AuthScreenProps) => {
  const { t, i18n } = useTranslation();
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
      setErrorMessage(resolveErrorMessage(error, t, "auth.error.general"));
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
      setErrorMessage(resolveErrorMessage(error, t, "auth.error.general"));
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
      setErrorMessage(resolveErrorMessage(error, t, "auth.error.general"));
    } finally {
      setResetLoading(false);
    }
  };

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
            {t(titleKey)}
          </Text>
          <Text className="text-[14px] font-inter text-muted dark:text-muted-dark mt-2">
            {t(subtitleKey)}
          </Text>
        </View>
        <View
          className="flex-row rounded-[16px] p-1 gap-1 mb-5 bg-input-background dark:bg-input-background-dark"
          accessibilityRole="tablist"
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignIn }}
            onPress={() => handleTabChange("signin")}
            disabled={isSubmitting || resetLoading}
            className={`flex-1 rounded-[12px] py-2.5 items-center border border-transparent active:opacity-90 ${
              isSignIn
                ? "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                : "bg-transparent"
            }`}
          >
            <Text
              className={`text-[14px] font-inter-semibold ${
                isSignIn
                  ? "text-text dark:text-text-dark"
                  : "text-muted dark:text-muted-dark"
              }`}
            >
              {t("login.tabs.signIn")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignUp }}
            onPress={() => handleTabChange("signup")}
            disabled={isSubmitting || resetLoading}
            className={`flex-1 rounded-[12px] py-2.5 items-center border border-transparent active:opacity-90 ${
              isSignUp
                ? "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                : "bg-transparent"
            }`}
          >
            <Text
              className={`text-[14px] font-inter-semibold ${
                isSignUp
                  ? "text-text dark:text-text-dark"
                  : "text-muted dark:text-muted-dark"
              }`}
            >
              {t("login.tabs.signUp")}
            </Text>
          </Pressable>
        </View>
        {isSignIn && (
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.emailLabel")}
              </Text>
              <TextInput
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={email}
                onChangeText={setEmail}
                placeholder={t("login.emailPlaceholder")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
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
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.passwordLabel")}
              </Text>
              <TextInput
                ref={passwordInputRef}
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={password}
                onChangeText={setPassword}
                placeholder={t("login.passwordPlaceholder")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
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
                className="text-[13px] font-inter text-error dark:text-error-dark"
              >
                {errorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.submit")}
              onPress={handleSignIn}
              disabled={!canSubmitSignIn}
              className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
                canSubmitSignIn
                  ? "bg-primary dark:bg-primary-dark"
                  : "bg-border dark:bg-border-dark"
              }`}
            >
              <Text
                className={`text-[16px] font-inter-semibold ${
                  canSubmitSignIn
                    ? "text-primary-text dark:text-primary-text-dark"
                    : "text-muted dark:text-muted-dark"
                }`}
              >
                {isSubmitting ? t("login.loading") : t("login.submit")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.forgotPassword")}
              onPress={() => handleTabChange("reset")}
              disabled={isSubmitting}
              className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
            >
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.forgotPassword")}
              </Text>
            </Pressable>
          </View>
        )}
        {isSignUp && (
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.emailLabel")}
              </Text>
              <TextInput
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={email}
                onChangeText={setEmail}
                placeholder={t("login.emailPlaceholder")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
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
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.passwordLabel")}
              </Text>
              <TextInput
                ref={passwordInputRef}
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
                editable={!isSubmitting}
                accessibilityLabel={t("login.passwordLabel")}
              />
            </View>
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.confirmPasswordLabel")}
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
                onSubmitEditing={handleSignUp}
                editable={!isSubmitting}
                accessibilityLabel={t("login.confirmPasswordLabel")}
              />
            </View>
            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                className="text-[13px] font-inter text-error dark:text-error-dark"
              >
                {errorMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.signUpSubmit")}
              onPress={handleSignUp}
              disabled={!canSubmitSignUp}
              className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
                canSubmitSignUp
                  ? "bg-primary dark:bg-primary-dark"
                  : "bg-border dark:bg-border-dark"
              }`}
            >
              <Text
                className={`text-[16px] font-inter-semibold ${
                  canSubmitSignUp
                    ? "text-primary-text dark:text-primary-text-dark"
                    : "text-muted dark:text-muted-dark"
                }`}
              >
                {isSubmitting
                  ? t("login.signUpLoading")
                  : t("login.signUpSubmit")}
              </Text>
            </Pressable>
          </View>
        )}
        {isReset && (
          <View className="gap-4">
            {resetSent ? (
              <Text className="text-[13px] font-inter text-success dark:text-success-dark">
                {t("login.resetSuccess")}
              </Text>
            ) : (
              <>
                <Text className="text-[13px] font-inter text-muted dark:text-muted-dark leading-[18px]">
                  {t("login.resetInstruction")}
                </Text>
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("login.emailLabel")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t("login.emailPlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
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
                    className="text-[13px] font-inter text-error dark:text-error-dark"
                  >
                    {errorMessage}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("login.resetSubmit")}
                  onPress={handlePasswordReset}
                  disabled={!canSendReset}
                  className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
                    canSendReset
                      ? "bg-primary dark:bg-primary-dark"
                      : "bg-border dark:bg-border-dark"
                  }`}
                >
                  <Text
                    className={`text-[16px] font-inter-semibold ${
                      canSendReset
                        ? "text-primary-text dark:text-primary-text-dark"
                        : "text-muted dark:text-muted-dark"
                    }`}
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
              className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
            >
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("login.backToSignIn")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
