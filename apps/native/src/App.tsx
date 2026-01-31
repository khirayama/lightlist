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
import { KeyboardAvoidingView, Platform, useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles/appStyles";
import { AuthScreen } from "./screens/AuthScreen";
import { PasswordResetScreen } from "./screens/PasswordResetScreen";
import { ShareCodeScreen } from "./screens/ShareCodeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AppScreen } from "./screens/AppScreen";
import { themes, type ThemeMode, type ThemeName } from "./styles/theme";
import { appStore } from "@lightlist/sdk/store";
import { useAppInitialization } from "./hooks/useAppInitialization";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

  const { isReady } = useAppInitialization(appState.settings?.language);

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

  if (!isReady) {
    return null;
  }

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

  // Render functions
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
