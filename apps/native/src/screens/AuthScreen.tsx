import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  signIn,
  signUp,
  sendPasswordResetEmail,
} from "@lightlist/sdk/mutations/auth";
import { resolveErrorMessage } from "../utils/errors";
import { FormErrors, validateAuthForm } from "../utils/validation";

type AuthTab = "signin" | "signup" | "reset";

export const AuthScreen = () => {
  const { t, i18n } = useTranslation();
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);

  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isSignUp = activeTab === "signup";
  const isReset = activeTab === "reset";
  const isSignIn = activeTab === "signin";

  const canSubmitSignIn =
    !loading && email.trim().length > 0 && password.length > 0;
  const canSubmitSignUp =
    !loading &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;
  const canSendReset = !resetLoading && email.trim().length > 0;

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setResetSent(false);
    setLoading(false);
    setResetLoading(false);
  };

  const handleTabChange = (nextTab: AuthTab) => {
    setActiveTab(nextTab);
    resetForm();
  };

  const handleSignIn = async () => {
    const validationErrors = validateAuthForm({ email, password }, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await signIn(email, password);
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    const validationErrors = validateAuthForm(
      { email, password, confirmPassword, requirePasswordConfirm: true },
      t,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const resolvedLanguage = i18n.language.toLowerCase().startsWith("ja")
      ? "ja"
      : "en";

    setLoading(true);
    setErrors({});
    try {
      await signUp(email, password, resolvedLanguage);
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const validationErrors = validateAuthForm({ email, password: "" }, t);
    if (validationErrors.email) {
      setErrors({ email: validationErrors.email });
      return;
    }

    setResetLoading(true);
    setErrors({});
    try {
      await sendPasswordResetEmail(email);
      setResetSent(true);
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setResetLoading(false);
    }
  };

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
            {isReset ? t("auth.passwordReset.title") : t("title")}
          </Text>
        </View>

        {!isReset ? (
          <View
            className="flex-row rounded-[16px] p-1 gap-1 mb-5 bg-input-background dark:bg-input-background-dark"
            accessibilityRole="tablist"
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSignIn }}
              onPress={() => handleTabChange("signin")}
              disabled={loading || resetLoading}
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
                {t("auth.tabs.signin")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSignUp }}
              onPress={() => handleTabChange("signup")}
              disabled={loading || resetLoading}
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
                {t("auth.tabs.signup")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isSignIn ? (
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.form.email")}
              </Text>
              <TextInput
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.placeholder.email")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!loading}
                accessibilityLabel={t("auth.form.email")}
              />
              {errors.email ? (
                <Text
                  accessibilityRole="alert"
                  className="text-[13px] font-inter text-error dark:text-error-dark"
                >
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.form.password")}
              </Text>
              <TextInput
                ref={passwordInputRef}
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.placeholder.password")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!loading}
                accessibilityLabel={t("auth.form.password")}
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

            {errors.general ? (
              <Text
                accessibilityRole="alert"
                className="text-[13px] font-inter text-error dark:text-error-dark"
              >
                {errors.general}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.button.signin")}
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
                {loading ? t("auth.button.signingIn") : t("auth.button.signin")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.button.forgotPassword")}
              onPress={() => handleTabChange("reset")}
              disabled={loading}
              className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
            >
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.button.forgotPassword")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isSignUp ? (
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.form.email")}
              </Text>
              <TextInput
                className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.placeholder.email")}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!loading}
                accessibilityLabel={t("auth.form.email")}
              />
              {errors.email ? (
                <Text
                  accessibilityRole="alert"
                  className="text-[13px] font-inter text-error dark:text-error-dark"
                >
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.form.password")}
              </Text>
              <TextInput
                ref={passwordInputRef}
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
                accessibilityLabel={t("auth.form.password")}
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
                {t("auth.form.confirmPassword")}
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
                onSubmitEditing={handleSignUp}
                editable={!loading}
                accessibilityLabel={t("auth.form.confirmPassword")}
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

            {errors.general ? (
              <Text
                accessibilityRole="alert"
                className="text-[13px] font-inter text-error dark:text-error-dark"
              >
                {errors.general}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.button.signup")}
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
                {loading ? t("auth.button.signingUp") : t("auth.button.signup")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isReset ? (
          <View className="gap-4">
            {resetSent ? (
              <Text className="text-[13px] font-inter text-success dark:text-success-dark">
                {t("auth.passwordReset.success")}
              </Text>
            ) : (
              <>
                <Text className="text-[13px] font-inter text-muted dark:text-muted-dark leading-[18px]">
                  {t("auth.passwordReset.instruction")}
                </Text>
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("auth.form.email")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t("auth.placeholder.email")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordReset}
                    editable={!resetLoading}
                    accessibilityLabel={t("auth.form.email")}
                  />
                  {errors.email ? (
                    <Text
                      accessibilityRole="alert"
                      className="text-[13px] font-inter text-error dark:text-error-dark"
                    >
                      {errors.email}
                    </Text>
                  ) : null}
                </View>

                {errors.general ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-[13px] font-inter text-error dark:text-error-dark"
                  >
                    {errors.general}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("auth.button.sendResetEmail")}
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
                      ? t("auth.button.sending")
                      : t("auth.button.sendResetEmail")}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.button.backToSignIn")}
              onPress={() => handleTabChange("signin")}
              disabled={resetLoading}
              className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
            >
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("auth.button.backToSignIn")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};
