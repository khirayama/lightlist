import { Suspense, useCallback, lazy, useEffect, useState } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  type Theme as NavigationTheme,
  createNavigationContainerRef,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColorScheme as useNWColorScheme } from "nativewind";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "./screens/Auth";
import { themes } from "./styles/theme";
import { initializeSdk } from "@lightlist/sdk/config";
import { useSessionState } from "@lightlist/sdk/session";
import { useSettingsState } from "@lightlist/sdk/settings";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import i18n from "./utils/i18n";
import { StartupSplash } from "./components/ui/StartupSplash";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AppDirectionProvider } from "./context/appDirection";
import {
  getLanguageDirection,
  normalizeLanguage,
} from "@lightlist/sdk/utils/language";

initializeSdk({
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  passwordResetUrl: process.env.EXPO_PUBLIC_PASSWORD_RESET_URL,
});

void SplashScreen.preventAutoHideAsync().catch(() => {});

const AppScreen = lazy(async () => {
  const module = await import("./screens/App");
  return { default: module.AppScreen };
});

const SettingsScreen = lazy(async () => {
  const module = await import("./screens/Settings");
  return { default: module.SettingsScreen };
});

const ShareCodeScreen = lazy(async () => {
  const module = await import("./screens/ShareCode");
  return { default: module.ShareCodeScreen };
});

const PasswordResetScreen = lazy(async () => {
  const module = await import("./screens/PasswordReset");
  return { default: module.PasswordResetScreen };
});

type RootStackParamList = {
  Auth: undefined;
  TaskList: undefined;
  Settings: undefined;
  ShareCode: { shareCode?: string } | undefined;
  PasswordReset: { oobCode?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const appEnv = String(Constants.expoConfig?.extra?.APP_ENV ?? "development");
const appScheme =
  appEnv === "production"
    ? "lightlist"
    : appEnv === "staging"
      ? "lightlist-staging"
      : "lightlist-dev";
const linking = {
  prefixes: [`${appScheme}://`, "expo://"],
  config: {
    screens: {
      PasswordReset: "password-reset",
    },
  },
};

export default function App() {
  const { i18n: i18nInstance } = useTranslation();
  const { authStatus, user } = useSessionState();
  const { settings, settingsStatus } = useSettingsState();
  const [isRootLayoutReady, setIsRootLayoutReady] = useState(false);
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isSettingsLanguageReady =
    !user || settingsStatus === "ready" || settingsStatus === "error";
  const appLanguage = isSettingsLanguageReady
    ? normalizeLanguage(
        settings?.language ?? i18n.resolvedLanguage ?? i18n.language,
      )
    : null;
  const appTheme = settings?.theme ?? "system";
  const isAuthReady = authStatus !== "loading";

  useEffect(() => {
    if (!appLanguage) {
      return;
    }
    const targetLanguage = normalizeLanguage(appLanguage);
    if (i18nInstance.language !== targetLanguage) {
      void i18nInstance.changeLanguage(targetLanguage);
    }
  }, [appLanguage, i18nInstance]);

  useEffect(() => {
    if (!isAuthReady || !isRootLayoutReady) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [isAuthReady, isRootLayoutReady]);

  const [navigationReady, setNavigationReady] = useState(false);

  const { colorScheme, setColorScheme } = useNWColorScheme();
  const resolvedTheme = colorScheme === "dark" ? "dark" : "light";
  const theme = themes[resolvedTheme];
  const resolvedLanguage = appLanguage
    ? normalizeLanguage(appLanguage)
    : normalizeLanguage(i18nInstance.resolvedLanguage ?? i18nInstance.language);
  const uiDirection = getLanguageDirection(resolvedLanguage);

  useEffect(() => {
    if (appTheme === "light" || appTheme === "dark" || appTheme === "system") {
      setColorScheme(appTheme);
    } else {
      setColorScheme("system");
    }
  }, [appTheme, setColorScheme]);

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
    const targetRoute: keyof RootStackParamList = user ? "TaskList" : "Auth";
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === "PasswordReset") return;
    if (currentRoute === targetRoute) return;
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  }, [user, navigationReady]);

  const handleOpenSettings = useCallback(() => {
    if (!navigationReady) return;
    navigationRef.navigate("Settings");
  }, [navigationReady]);

  const handleBackFromSettings = useCallback(() => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate("TaskList");
  }, [navigationReady]);

  const handleBackFromShareCode = useCallback(() => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate(user ? "TaskList" : "Auth");
  }, [navigationReady, user]);

  const handleBackFromPasswordReset = useCallback(() => {
    if (!navigationReady) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigationRef.navigate(user ? "TaskList" : "Auth");
  }, [navigationReady, user]);

  const handleOpenTaskListFromShareCode = useCallback(() => {
    if (!navigationReady) return;
    navigationRef.navigate(user ? "TaskList" : "Auth");
  }, [navigationReady, user]);
  const handleRootLayout = useCallback(() => {
    setIsRootLayoutReady(true);
  }, []);

  const screenMode: "auth" | "task" = user ? "task" : "auth";
  const splashFallback = <View style={{ flex: 1 }} />;

  const renderAuthScreen = () => <AuthScreen />;

  const renderAppScreen = () => (
    <Suspense fallback={splashFallback}>
      <AppScreen onOpenSettings={handleOpenSettings} />
    </Suspense>
  );

  const renderSettingsScreen = () => (
    <Suspense fallback={splashFallback}>
      <SettingsScreen onBack={handleBackFromSettings} />
    </Suspense>
  );

  const renderShareCodeScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "ShareCode">;
  }) => (
    <Suspense fallback={splashFallback}>
      <ShareCodeScreen
        initialShareCode={route.params?.shareCode ?? null}
        onBack={handleBackFromShareCode}
        onOpenTaskList={handleOpenTaskListFromShareCode}
      />
    </Suspense>
  );

  const renderPasswordResetScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "PasswordReset">;
  }) => (
    <Suspense fallback={splashFallback}>
      <PasswordResetScreen
        oobCode={route.params?.oobCode ?? null}
        onBack={handleBackFromPasswordReset}
      />
    </Suspense>
  );

  return (
    <ErrorBoundary>
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          <SafeAreaView
            style={{
              backgroundColor: theme.background,
              direction: uiDirection,
            }}
            className="flex-1"
            onLayout={handleRootLayout}
          >
            <AppDirectionProvider value={uiDirection}>
              <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                {!isAuthReady ? (
                  <StartupSplash />
                ) : (
                  <NavigationContainer
                    ref={navigationRef}
                    theme={navigationTheme}
                    direction={uiDirection}
                    linking={linking}
                    onReady={() => setNavigationReady(true)}
                  >
                    <Stack.Navigator
                      key={screenMode}
                      initialRouteName={
                        screenMode === "task" ? "TaskList" : "Auth"
                      }
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
                        <Stack.Screen name="Auth">
                          {renderAuthScreen}
                        </Stack.Screen>
                      )}
                      <Stack.Screen name="PasswordReset">
                        {renderPasswordResetScreen}
                      </Stack.Screen>
                      <Stack.Screen name="ShareCode">
                        {renderShareCodeScreen}
                      </Stack.Screen>
                    </Stack.Navigator>
                  </NavigationContainer>
                )}
              </KeyboardAvoidingView>
            </AppDirectionProvider>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
