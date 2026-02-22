import {
  Suspense,
  useCallback,
  lazy,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  NavigationContainer,
  DefaultTheme,
  type Theme as NavigationTheme,
  createNavigationContainerRef,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useColorScheme as useNWColorScheme } from "nativewind";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "./screens/AuthScreen";
import { themes } from "./styles/theme";
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

SplashScreen.preventAutoHideAsync();

const AppScreen = lazy(async () => {
  const module = await import("./screens/AppScreen");
  return { default: module.AppScreen };
});

const SettingsScreen = lazy(async () => {
  const module = await import("./screens/SettingsScreen");
  return { default: module.SettingsScreen };
});

const ShareCodeScreen = lazy(async () => {
  const module = await import("./screens/ShareCodeScreen");
  return { default: module.ShareCodeScreen };
});

const PasswordResetScreen = lazy(async () => {
  const module = await import("./screens/PasswordResetScreen");
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
const linking = {
  prefixes: ["lightlist://", "expo://"],
  config: {
    screens: {
      PasswordReset: "password-reset",
    },
  },
};

const getUserSnapshot = () => {
  return appStore.getState().user;
};

const getAppLanguageSnapshot = () => {
  return appStore.getState().settings?.language ?? "ja";
};

const getAppThemeSnapshot = () => {
  return appStore.getState().settings?.theme ?? "system";
};

export default function App() {
  const user = useSyncExternalStore(appStore.subscribe, getUserSnapshot);
  const appLanguage = useSyncExternalStore(
    appStore.subscribe,
    getAppLanguageSnapshot,
  );
  const appTheme = useSyncExternalStore(
    appStore.subscribe,
    getAppThemeSnapshot,
  );

  const [isAuthReady, setIsAuthReady] = useState(false);
  useFonts({
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
    const targetLanguage = appLanguage === "en" ? "en" : "ja";
    if (i18n.language !== targetLanguage) {
      void i18n.changeLanguage(targetLanguage);
    }
  }, [appLanguage]);

  useEffect(() => {
    if (isAuthReady) {
      void SplashScreen.hideAsync();
    }
  }, [isAuthReady]);

  const [navigationReady, setNavigationReady] = useState(false);

  const { colorScheme, setColorScheme } = useNWColorScheme();
  const resolvedTheme = colorScheme === "dark" ? "dark" : "light";
  const theme = themes[resolvedTheme];

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

  if (!isAuthReady) {
    return null;
  }

  const screenMode: "auth" | "task" = user ? "task" : "auth";

  const renderAuthScreen = () => <AuthScreen />;

  const renderAppScreen = () => (
    <Suspense fallback={null}>
      <AppScreen onOpenSettings={handleOpenSettings} />
    </Suspense>
  );

  const renderSettingsScreen = () => (
    <Suspense fallback={null}>
      <SettingsScreen onBack={handleBackFromSettings} />
    </Suspense>
  );

  const renderShareCodeScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "ShareCode">;
  }) => (
    <Suspense fallback={null}>
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
    <Suspense fallback={null}>
      <PasswordResetScreen
        oobCode={route.params?.oobCode ?? null}
        onBack={handleBackFromPasswordReset}
      />
    </Suspense>
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
