import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./appStyles";
import i18n from "./i18n";
import { AuthScreen } from "./screens/AuthScreen";
import { PasswordResetScreen } from "./screens/PasswordResetScreen";
import { ShareCodeScreen } from "./screens/ShareCodeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TaskListScreen } from "./screens/TaskListScreen";
import { listColors, themes, type ThemeMode, type ThemeName } from "./theme";
import { appStore } from "@lightlist/sdk/store";
import { AppState, Settings, Task, TaskList } from "@lightlist/sdk/types";
import {
  addTask,
  createTaskList,
  deleteCompletedTasks,
  deleteTask,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
  sortTasks,
  updateSettings,
  updateTask,
  updateTaskListOrder,
  updateTaskList,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import {
  deleteAccount,
  sendPasswordResetEmail,
  signIn,
  signUp,
  signOut,
} from "@lightlist/sdk/mutations/auth";

type AuthTab = "signin" | "signup" | "reset";
type AuthFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

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
    case "auth/email-already-in-use":
      return t("errors.emailAlreadyInUse");
    case "auth/weak-password":
      return t("errors.weakPassword");
    case "auth/too-many-requests":
      return t("errors.tooManyRequests");
    case "auth/invalid-email":
      return t("errors.invalidEmail");
    default:
      return t("errors.generic");
  }
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function App() {
  const { t } = useTranslation();
  const [appState, setAppState] = useState<AppState>(appStore.getState());
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
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [form, setForm] = useState<AuthFormState>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [createListName, setCreateListName] = useState("");
  const [createListBackground, setCreateListBackground] = useState(
    listColors[0],
  );
  const [editListName, setEditListName] = useState("");
  const [editListBackground, setEditListBackground] = useState(listColors[0]);
  const [newTaskText, setNewTaskText] = useState("");
  const [appErrorMessage, setAppErrorMessage] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(
    null,
  );
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);
  const [isReorderingTaskLists, setIsReorderingTaskLists] = useState(false);
  const [isSortingTasks, setIsSortingTasks] = useState(false);
  const [isDeletingCompletedTasks, setIsDeletingCompletedTasks] =
    useState(false);
  const [isGeneratingShareCode, setIsGeneratingShareCode] = useState(false);
  const [isRemovingShareCode, setIsRemovingShareCode] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    const unsubscribe = appStore.subscribe((nextState) => {
      setAppState(nextState);
    });
    setAppState(appStore.getState());
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
    if (!appState.user) {
      setSelectedTaskListId(null);
      setCreateListName("");
      setCreateListBackground(listColors[0]);
      setEditListName("");
      setEditListBackground(listColors[0]);
      setNewTaskText("");
      setAppErrorMessage(null);
      setShareErrorMessage(null);
      setSettingsErrorMessage(null);
      setIsUpdatingSettings(false);
      setIsSigningOut(false);
      setIsDeletingAccount(false);
      setIsGeneratingShareCode(false);
      setIsRemovingShareCode(false);
      setIsUpdatingTask(false);
      setIsReorderingTasks(false);
      setIsReorderingTaskLists(false);
      setIsSortingTasks(false);
      setIsDeletingCompletedTasks(false);
    }
  }, [appState.user]);

  const selectedTaskList: TaskList | null =
    appState.taskLists.find((list) => list.id === selectedTaskListId) ?? null;

  useEffect(() => {
    if (appState.taskLists.length === 0) {
      setSelectedTaskListId(null);
      return;
    }
    if (
      !selectedTaskListId ||
      !appState.taskLists.some((list) => list.id === selectedTaskListId)
    ) {
      setSelectedTaskListId(appState.taskLists[0].id);
    }
  }, [appState.taskLists, selectedTaskListId]);

  useEffect(() => {
    if (!selectedTaskList) {
      setEditListName("");
      setEditListBackground(listColors[0]);
      setNewTaskText("");
      return;
    }
    setEditListName(selectedTaskList.name);
    setEditListBackground(selectedTaskList.background || listColors[0]);
    setNewTaskText("");
  }, [selectedTaskList?.id]);

  useEffect(() => {
    setShareErrorMessage(null);
    setIsGeneratingShareCode(false);
    setIsRemovingShareCode(false);
  }, [selectedTaskList?.id]);

  useEffect(() => {
    if (!navigationReady) {
      return;
    }
    const targetRoute: keyof RootStackParamList = appState.user
      ? "TaskList"
      : "Auth";
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === "PasswordReset") {
      return;
    }
    if (currentRoute === targetRoute) {
      return;
    }
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  }, [appState.user, navigationReady]);

  const resetFormState = () => {
    setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    setAuthErrorMessage(null);
    setResetSent(false);
    setIsSubmitting(false);
    setResetLoading(false);
  };

  const handleTabChange = (nextTab: AuthTab) => {
    setActiveTab(nextTab);
    resetFormState();
  };

  const validateSignIn = () => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !form.password) {
      return t("form.required");
    }
    if (!isValidEmail(trimmedEmail)) {
      return t("form.invalidEmail");
    }
    return null;
  };

  const validateSignUp = () => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !form.password || !form.confirmPassword) {
      return t("form.required");
    }
    if (!isValidEmail(trimmedEmail)) {
      return t("form.invalidEmail");
    }
    if (form.password.length < 6) {
      return t("form.passwordTooShort");
    }
    if (form.password !== form.confirmPassword) {
      return t("form.passwordMismatch");
    }
    return null;
  };

  const validateReset = () => {
    const trimmedEmail = form.email.trim();
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
      setAuthErrorMessage(validationError);
      return;
    }
    const trimmedEmail = form.email.trim();
    setIsSubmitting(true);
    setAuthErrorMessage(null);
    try {
      await signIn(trimmedEmail, form.password);
    } catch (error) {
      if (error instanceof Error) {
        setAuthErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setAuthErrorMessage(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    const validationError = validateSignUp();
    if (validationError) {
      setAuthErrorMessage(validationError);
      return;
    }
    const trimmedEmail = form.email.trim();
    setIsSubmitting(true);
    setAuthErrorMessage(null);
    try {
      await signUp(trimmedEmail, form.password);
    } catch (error) {
      if (error instanceof Error) {
        setAuthErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setAuthErrorMessage(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const validationError = validateReset();
    if (validationError) {
      setAuthErrorMessage(validationError);
      return;
    }
    const trimmedEmail = form.email.trim();
    setResetLoading(true);
    setAuthErrorMessage(null);
    try {
      await sendPasswordResetEmail(trimmedEmail);
      setResetSent(true);
    } catch (error) {
      if (error instanceof Error) {
        setAuthErrorMessage(resolveAuthErrorMessage(error, t));
      } else {
        setAuthErrorMessage(t("errors.generic"));
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdateSettings = async (next: Partial<Settings>) => {
    if (isUpdatingSettings || !appState.user) {
      return;
    }
    setSettingsErrorMessage(null);
    setIsUpdatingSettings(true);
    try {
      await updateSettings(next);
    } catch (error) {
      if (error instanceof Error) {
        setSettingsErrorMessage(error.message);
      } else {
        setSettingsErrorMessage(t("app.error"));
      }
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSettingsSignOut = async () => {
    if (isSigningOut) return;
    setSettingsErrorMessage(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (error instanceof Error) {
        setSettingsErrorMessage(error.message);
      } else {
        setSettingsErrorMessage(t("app.error"));
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setSettingsErrorMessage(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (error) {
      if (error instanceof Error) {
        setSettingsErrorMessage(error.message);
      } else {
        setSettingsErrorMessage(t("app.error"));
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmSettingsSignOut = () => {
    Alert.alert(t("app.signOut"), t("app.signOutConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("app.signOut"),
        style: "destructive",
        onPress: () => {
          void handleSettingsSignOut();
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("settings.deleteAccountConfirm"),
      [
        { text: t("app.cancel"), style: "cancel" },
        {
          text: t("settings.deleteAccount"),
          style: "destructive",
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ],
    );
  };

  const handleCreateList = async () => {
    const trimmedName = createListName.trim();
    if (!trimmedName) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setIsCreatingList(true);
    setAppErrorMessage(null);
    try {
      const newListId = await createTaskList(trimmedName, createListBackground);
      setCreateListName("");
      setSelectedTaskListId(newListId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleSaveList = async () => {
    if (!selectedTaskList) return;
    const trimmedName = editListName.trim();
    if (!trimmedName) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setIsSavingList(true);
    setAppErrorMessage(null);
    try {
      await updateTaskList(selectedTaskList.id, {
        name: trimmedName,
        background: editListBackground,
      });
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsSavingList(false);
    }
  };

  const handleDeleteList = async (taskListId: string) => {
    setIsDeletingList(true);
    setAppErrorMessage(null);
    try {
      await deleteTaskList(taskListId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsDeletingList(false);
    }
  };

  const confirmDeleteList = () => {
    if (!selectedTaskList) return;
    Alert.alert(t("taskList.deleteList"), t("taskList.deleteConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("taskList.deleteList"),
        style: "destructive",
        onPress: () => {
          void handleDeleteList(selectedTaskList.id);
        },
      },
    ]);
  };

  const handleReorderTaskList = async (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => {
    if (!draggedTaskListId || !targetTaskListId) return;
    if (draggedTaskListId === targetTaskListId) return;
    setIsReorderingTaskLists(true);
    setAppErrorMessage(null);
    try {
      await updateTaskListOrder(draggedTaskListId, targetTaskListId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsReorderingTaskLists(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskList) return;
    const trimmedText = newTaskText.trim();
    if (!trimmedText) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setIsAddingTask(true);
    setAppErrorMessage(null);
    try {
      await addTask(selectedTaskList.id, trimmedText);
      setNewTaskText("");
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!selectedTaskList) return;
    if (typeof updates.text === "string" && updates.text.trim().length === 0) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setIsUpdatingTask(true);
    setAppErrorMessage(null);
    try {
      await updateTask(selectedTaskList.id, taskId, updates);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleReorderTask = async (
    draggedTaskId: string,
    targetTaskId: string,
  ) => {
    if (!selectedTaskList) return;
    if (!draggedTaskId || !targetTaskId) return;
    if (draggedTaskId === targetTaskId) return;
    setIsReorderingTasks(true);
    setAppErrorMessage(null);
    try {
      await updateTasksOrder(selectedTaskList.id, draggedTaskId, targetTaskId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsReorderingTasks(false);
    }
  };

  const handleSortTasks = async () => {
    if (!selectedTaskList) return;
    setIsSortingTasks(true);
    setAppErrorMessage(null);
    try {
      await sortTasks(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsSortingTasks(false);
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!selectedTaskList) return;
    setIsDeletingCompletedTasks(true);
    setAppErrorMessage(null);
    try {
      await deleteCompletedTasks(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    } finally {
      setIsDeletingCompletedTasks(false);
    }
  };

  const handleGenerateShareCode = async () => {
    if (!selectedTaskList) return;

    setIsGeneratingShareCode(true);
    setShareErrorMessage(null);
    try {
      await generateShareCode(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setShareErrorMessage(error.message);
      } else {
        setShareErrorMessage(t("taskList.shareError"));
      }
    } finally {
      setIsGeneratingShareCode(false);
    }
  };

  const handleRemoveShareCode = async () => {
    if (!selectedTaskList) return;

    setIsRemovingShareCode(true);
    setShareErrorMessage(null);
    try {
      await removeShareCode(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setShareErrorMessage(error.message);
      } else {
        setShareErrorMessage(t("taskList.shareError"));
      }
    } finally {
      setIsRemovingShareCode(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!selectedTaskList) return;
    setAppErrorMessage(null);
    try {
      await updateTask(selectedTaskList.id, task.id, {
        completed: !task.completed,
      });
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!selectedTaskList) return;
    setAppErrorMessage(null);
    try {
      await deleteTask(selectedTaskList.id, task.id);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert(t("taskList.deleteTask"), t("taskList.deleteTaskConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("taskList.deleteTask"),
        style: "destructive",
        onPress: () => {
          void handleDeleteTask(task);
        },
      },
    ]);
  };

  const confirmSignOut = () => {
    Alert.alert(t("app.signOut"), t("app.signOutConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("app.signOut"),
        style: "destructive",
        onPress: () => {
          void signOut().catch((error: unknown) => {
            if (error instanceof Error) {
              setAppErrorMessage(error.message);
            } else {
              setAppErrorMessage(t("app.error"));
            }
          });
        },
      },
    ]);
  };

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

  const userEmail = appState.user?.email ?? "";
  const tasks = selectedTaskList?.tasks ?? [];
  const screenMode: "auth" | "task" = appState.user ? "task" : "auth";
  const renderAuthScreen = () => (
    <AuthScreen
      t={t}
      theme={theme}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      form={form}
      setForm={setForm}
      authErrorMessage={authErrorMessage}
      isSubmitting={isSubmitting}
      resetLoading={resetLoading}
      resetSent={resetSent}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onPasswordReset={handlePasswordReset}
      passwordInputRef={passwordInputRef}
      confirmPasswordInputRef={confirmPasswordInputRef}
      onOpenShareCode={handleOpenShareCode}
    />
  );
  const renderTaskListScreen = () => (
    <TaskListScreen
      t={t}
      theme={theme}
      taskLists={appState.taskLists}
      selectedTaskList={selectedTaskList}
      selectedTaskListId={selectedTaskListId}
      tasks={tasks}
      userEmail={userEmail}
      appErrorMessage={appErrorMessage}
      createListName={createListName}
      createListBackground={createListBackground}
      editListName={editListName}
      editListBackground={editListBackground}
      newTaskText={newTaskText}
      isCreatingList={isCreatingList}
      isSavingList={isSavingList}
      isDeletingList={isDeletingList}
      isAddingTask={isAddingTask}
      shareCode={selectedTaskList?.shareCode ?? null}
      shareErrorMessage={shareErrorMessage}
      isGeneratingShareCode={isGeneratingShareCode}
      isRemovingShareCode={isRemovingShareCode}
      onOpenSettings={handleOpenSettings}
      onOpenShareCode={handleOpenShareCode}
      onSelectTaskList={setSelectedTaskListId}
      onChangeCreateListName={setCreateListName}
      onChangeCreateListBackground={setCreateListBackground}
      onChangeEditListName={setEditListName}
      onChangeEditListBackground={setEditListBackground}
      onChangeNewTaskText={setNewTaskText}
      onCreateList={handleCreateList}
      onSaveList={handleSaveList}
      onConfirmDeleteList={confirmDeleteList}
      onAddTask={handleAddTask}
      onUpdateTask={handleUpdateTask}
      onToggleTask={handleToggleTask}
      onReorderTask={handleReorderTask}
      onSortTasks={handleSortTasks}
      onDeleteCompletedTasks={handleDeleteCompletedTasks}
      onConfirmDeleteTask={confirmDeleteTask}
      onConfirmSignOut={confirmSignOut}
      onReorderTaskList={handleReorderTaskList}
      onGenerateShareCode={handleGenerateShareCode}
      onRemoveShareCode={handleRemoveShareCode}
      isUpdatingTask={isUpdatingTask}
      isReorderingTasks={isReorderingTasks}
      isSortingTasks={isSortingTasks}
      isDeletingCompletedTasks={isDeletingCompletedTasks}
      isReorderingTaskLists={isReorderingTaskLists}
    />
  );
  const renderSettingsScreen = () => (
    <SettingsScreen
      t={t}
      theme={theme}
      settings={appState.settings}
      userEmail={userEmail}
      errorMessage={settingsErrorMessage}
      isUpdating={isUpdatingSettings}
      isSigningOut={isSigningOut}
      isDeletingAccount={isDeletingAccount}
      onUpdateSettings={handleUpdateSettings}
      onConfirmSignOut={confirmSettingsSignOut}
      onConfirmDeleteAccount={confirmDeleteAccount}
      onBack={handleBackFromSettings}
    />
  );
  const renderShareCodeScreen = ({
    route,
  }: {
    route: RouteProp<RootStackParamList, "ShareCode">;
  }) => (
    <ShareCodeScreen
      t={t}
      theme={theme}
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
      t={t}
      theme={theme}
      oobCode={route.params?.oobCode ?? null}
      onBack={handleBackFromPasswordReset}
    />
  );

  return (
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
                    {renderTaskListScreen}
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
  );
}
