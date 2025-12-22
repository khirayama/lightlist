import i18n, { type TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import { initReactI18next, useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { onAuthStateChange } from "@lightlist/sdk/auth";
import { signIn } from "@lightlist/sdk/mutations/auth";

const resources = {
  en: {
    translation: {
      app: {
        name: "LightList",
      },
      login: {
        title: "Sign in",
        subtitle: "Use your LightList account.",
        emailLabel: "Email",
        emailPlaceholder: "name@example.com",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        submit: "Sign in",
        loading: "Signing in...",
      },
      status: {
        signedInAs: "Signed in as {{email}}",
      },
      errors: {
        invalidCredential: "Email or password is incorrect.",
        userNotFound: "Account not found.",
        tooManyRequests: "Too many attempts. Try again later.",
        invalidEmail: "Email address is invalid.",
        generic: "Sign in failed. Please try again.",
      },
      form: {
        required: "Please fill in all fields.",
      },
    },
  },
  ja: {
    translation: {
      app: {
        name: "LightList",
      },
      login: {
        title: "ログイン",
        subtitle: "LightList アカウントでサインインします。",
        emailLabel: "メールアドレス",
        emailPlaceholder: "name@example.com",
        passwordLabel: "パスワード",
        passwordPlaceholder: "パスワードを入力",
        submit: "ログイン",
        loading: "ログイン中...",
      },
      status: {
        signedInAs: "{{email}}でログイン済み",
      },
      errors: {
        invalidCredential: "メールアドレスまたはパスワードが正しくありません。",
        userNotFound: "アカウントが見つかりません。",
        tooManyRequests:
          "試行回数が多すぎます。しばらくしてからお試しください。",
        invalidEmail: "メールアドレスの形式が正しくありません。",
        generic: "ログインに失敗しました。再度お試しください。",
      },
      form: {
        required: "入力内容を確認してください。",
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "ja",
    fallbackLng: "ja",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
  });
}

type ThemeName = "light" | "dark";
type ThemeMode = "system" | ThemeName;
type Theme = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  error: string;
  inputBackground: string;
  placeholder: string;
};

const themes: Record<ThemeName, Theme> = {
  light: {
    background: "#F5F3EE",
    surface: "#FFFFFF",
    text: "#1B1D18",
    muted: "#6B6F66",
    border: "#DAD6CE",
    primary: "#1F5C4D",
    primaryText: "#F9F7F2",
    error: "#B4232A",
    inputBackground: "#FAF8F2",
    placeholder: "#8C9087",
  },
  dark: {
    background: "#111412",
    surface: "#1C201D",
    text: "#F2F2EE",
    muted: "#A6AAA2",
    border: "#2B302D",
    primary: "#7AC2A7",
    primaryText: "#0C1512",
    error: "#FF9A91",
    inputBackground: "#171A18",
    placeholder: "#7B8077",
  },
};

type LoginFormState = {
  email: string;
  password: string;
};

type FirebaseAuthError = Error & {
  code?: string;
};

const resolveAuthErrorMessage = (error: Error, t: TFunction) => {
  const errorCode =
    "code" in error ? String((error as FirebaseAuthError).code ?? "") : "";
  switch (errorCode) {
    case "auth/invalid-credential":
      return t("errors.invalidCredential");
    case "auth/user-not-found":
      return t("errors.userNotFound");
    case "auth/too-many-requests":
      return t("errors.tooManyRequests");
    case "auth/invalid-email":
      return t("errors.invalidEmail");
    default:
      return t("errors.generic");
  }
};

export default function App() {
  const { t } = useTranslation();
  const systemScheme = useColorScheme();
  const themeMode: ThemeMode = "system";
  const resolvedTheme: ThemeName =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;
  const theme = themes[resolvedTheme];
  const passwordInputRef = useRef<TextInput>(null);
  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setSignedInEmail(user?.email ?? null);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !form.password) {
      setErrorMessage(t("form.required"));
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signIn(trimmedEmail, form.password);
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

  const canSubmit =
    !isSubmitting && form.email.trim().length > 0 && form.password.length > 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
                  {t("login.title")}
                </Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>
                  {t("login.subtitle")}
                </Text>
                {signedInEmail ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.status, { color: theme.muted }]}
                  >
                    {t("status.signedInAs", { email: signedInEmail })}
                  </Text>
                ) : null}
              </View>
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
                  onSubmitEditing={handleSubmit}
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
                  {isSubmitting ? t("login.loading") : t("login.submit")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  appName: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  status: {
    fontSize: 13,
    marginTop: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
