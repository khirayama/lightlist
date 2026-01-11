import { useEffect, useState, useSyncExternalStore } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  type Theme as NavigationTheme,
  createNavigationContainerRef,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles/appStyles";
import i18n from "./utils/i18n";
import { AuthScreen } from "./screens/AuthScreen";
import { PasswordResetScreen } from "./screens/PasswordResetScreen";
import { ShareCodeScreen } from "./screens/ShareCodeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AppScreen } from "./screens/AppScreen";
import { themes, type ThemeMode, type ThemeName } from "./styles/theme";
import { appStore } from "@lightlist/sdk/store";
import { onAuthStateChange } from "@lightlist/sdk/auth";

type RootStackParamList = {
  Auth: undefined;
  TaskList: undefined;
  Settings: undefined;
  ShareCode: { shareCode?: string } | undefined;
  PasswordReset: { oobCode?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const linking = {
  prefixes: ["lightlist://"],
  config: {
    screens: {
      PasswordReset: "password-reset",
    },
  },
};

export default function App() {
  const { t } = useTranslation();
  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  const systemScheme = useColorScheme();
  const storedTheme = appState.settings?.theme;
  const themeMode: ThemeMode =
    storedTheme === "system" ||
    storedTheme === "light" ||
    storedTheme === "dark"
      ? storedTheme
      : "system";
  const resolvedTheme: ThemeName =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;
  const theme = themes[resolvedTheme];

  const navigationTheme: NavigationTheme = {
    ...DefaultTheme,
    dark: resolvedTheme === "dark",
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(() => {
      setIsAuthReady(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const storedLanguage = appState.settings?.language;
    const language =
      storedLanguage === "ja" || storedLanguage === "en"
        ? storedLanguage
        : "ja";
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [appState.settings?.language]);

  useEffect(() => {
    if (!navigationReady) return;
    const targetRoute: keyof RootStackParamList = appState.user
      ? "TaskList"
      : "Auth";
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === "PasswordReset") return;
    if (currentRoute === targetRoute) return;
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  }, [appState.user, navigationReady]);

  const handleOpenSettings = () => {
    if (!navigationReady) return;
    navigationRef.navigate("Settings");
  };

  const handleOpenShareCode = () => {
    if (!navigationReady) return;
    navigationRef.navigate("ShareCode");
  };

  const handleBackFromSettings = () => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate("TaskList");
  };

  const handleBackFromShareCode = () => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate(appState.user ? "TaskList" : "Auth");
  };

  const handleBackFromPasswordReset = () => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate(appState.user ? "TaskList" : "Auth");
  };

  const handleOpenTaskListFromShareCode = () => {
    if (!navigationReady) return;
    navigationRef.navigate(appState.user ? "TaskList" : "Auth");
  };

  const screenMode: "auth" | "task" = appState.user ? "task" : "auth";

  const renderAuthScreen = () => (
    <AuthScreen onOpenShareCode={handleOpenShareCode} />
  );

  const renderAppScreen = () => (
    <AppScreen
      onOpenSettings={handleOpenSettings}
      onOpenShareCode={handleOpenShareCode}
    />
  );

  const renderSettingsScreen = () => (
    <SettingsScreen onBack={handleBackFromSettings} />
  );

  const renderShareCodeScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "ShareCode">;
  }) => (
    <ShareCodeScreen
      initialShareCode={route.params?.shareCode ?? null}
      onBack={handleBackFromShareCode}
      onOpenTaskList={handleOpenTaskListFromShareCode}
    />
  );

  const renderPasswordResetScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "PasswordReset">;
  }) => (
    <PasswordResetScreen
      oobCode={route.params?.oobCode ?? null}
      onBack={handleBackFromPasswordReset}
    />
  );

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size="large"
        color={theme.primary}
        accessibilityLabel={t("common.loading")}
      />
      <Text style={[styles.loadingText, { color: theme.text }]}>
        {t("common.loading")}
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {isAuthReady ? (
              <NavigationContainer
                ref={navigationRef}
                theme={navigationTheme}
                linking={linking}
                onReady={() => setNavigationReady(true)}
              >
                <Stack.Navigator
                  key={screenMode}
                  initialRouteName={screenMode === "task" ? "TaskList" : "Auth"}
                  screenOptions={{ headerShown: false }}
                >
                  {screenMode === "task" ? (
                    <>
                      <Stack.Screen name="TaskList">
                        {renderAppScreen}
                      </Stack.Screen>
                      <Stack.Screen name="Settings">
                        {renderSettingsScreen}
                      </Stack.Screen>
                    </>
                  ) : (
                    <Stack.Screen name="Auth">{renderAuthScreen}</Stack.Screen>
                  )}
                  <Stack.Screen name="PasswordReset">
                    {renderPasswordResetScreen}
                  </Stack.Screen>
                  <Stack.Screen name="ShareCode">
                    {renderShareCodeScreen}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            ) : (
              renderLoadingScreen()
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
