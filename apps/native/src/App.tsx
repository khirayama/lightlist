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
import { KeyboardAvoidingView, Platform } from "react-native";
import { useColorScheme as useNWColorScheme } from "nativewind";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "./screens/AuthScreen";
import { PasswordResetScreen } from "./screens/PasswordResetScreen";
import { ShareCodeScreen } from "./screens/ShareCodeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AppScreen } from "./screens/AppScreen";
import { themes, type ThemeMode, type ThemeName } from "./styles/theme";
import { appStore } from "@lightlist/sdk/store";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { onAuthStateChange } from "@lightlist/sdk/auth";
import i18n from "./utils/i18n";

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

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(() => {
      setIsAuthReady(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const language = appState.settings?.language;
    const targetLanguage =
      language === "ja" || language === "en" ? language : "ja";
    if (i18n.language !== targetLanguage) {
      void i18n.changeLanguage(targetLanguage);
    }
  }, [appState.settings?.language]);

  useEffect(() => {
    if (fontsLoaded && isAuthReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthReady]);

  const isReady = fontsLoaded && isAuthReady;

  const [navigationReady, setNavigationReady] = useState(false);

  const { colorScheme, setColorScheme } = useNWColorScheme();
  const resolvedTheme = colorScheme === "dark" ? "dark" : "light";
  const theme = themes[resolvedTheme];

  useEffect(() => {
    const storedTheme = appState.settings?.theme;
    if (
      storedTheme === "light" ||
      storedTheme === "dark" ||
      storedTheme === "system"
    ) {
      setColorScheme(storedTheme);
    } else {
      setColorScheme("system");
    }
  }, [appState.settings?.theme, setColorScheme]);

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
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <SafeAreaView
          style={{ backgroundColor: theme.background }}
          className="flex-1"
        >
          <KeyboardAvoidingView
            className="flex-1"
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
