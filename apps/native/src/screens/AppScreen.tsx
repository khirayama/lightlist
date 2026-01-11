import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { appStore } from "@lightlist/sdk/store";
import type { Task, TaskList } from "@lightlist/sdk/types";
import {
  addTask,
  addSharedTaskListToOrder,
  createTaskList,
  deleteCompletedTasks,
  deleteTaskList,
  fetchTaskListIdByShareCode,
  generateShareCode,
  removeShareCode,
  sortTasks,
  updateTask,
  updateTaskListOrder,
  updateTaskList,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { signOut } from "@lightlist/sdk/mutations/auth";
import { AppIcon } from "../components/ui/AppIcon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../components/ui/Carousel";
import { Dialog } from "../components/ui/Dialog";
import { TaskListPanel } from "../components/app/TaskListPanel";
import { AppDrawerContent } from "../components/app/AppDrawerContent";
import { styles } from "../styles/appStyles";
import { useTheme, listColors } from "../styles/theme";

const arrayMove = <T,>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};

const EMPTY_TASKS: Task[] = [];
const EMPTY_TASK_LISTS: TaskList[] = [];

const Drawer = createDrawerNavigator();

type AppScreenContentProps = {
  onOpenSettings: () => void;
  onOpenShareCode: () => void;
};

const AppScreenContent = ({
  onOpenSettings,
  onOpenShareCode,
}: AppScreenContentProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;

  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const taskLists = appState.taskLists;
  const userEmail = appState.user?.email ?? "";

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [appErrorMessage, setAppErrorMessage] = useState<string | null>(null);
  const [createListName, setCreateListName] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(listColors[0]);
  const [editListName, setEditListName] = useState("");
  const [editListBackground, setEditListBackground] = useState<string | null>(
    listColors[0],
  );
  const [newTaskText, setNewTaskText] = useState("");
  const [joinListInput, setJoinListInput] = useState("");
  const [joinListError, setJoinListError] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(
    null,
  );
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [isJoiningList, setIsJoiningList] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isGeneratingShareCode, setIsGeneratingShareCode] = useState(false);
  const [isRemovingShareCode, setIsRemovingShareCode] = useState(false);
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [taskListCarouselApi, setTaskListCarouselApi] =
    useState<CarouselApi | null>(null);
  const isScrollingRef = useRef(false);
  const pendingIndexRef = useRef<number | null>(null);
  const [isReorderHandleActive, setIsReorderHandleActive] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [localTasksMap, setLocalTasksMap] = useState<Record<string, Task[]>>(
    {},
  );

  const stableTaskLists = taskLists.length > 0 ? taskLists : EMPTY_TASK_LISTS;
  const selectedTaskList: TaskList | null =
    taskLists.find((list) => list.id === selectedTaskListId) ?? null;

  useEffect(() => {
    const newMap: Record<string, Task[]> = {};
    for (const tl of taskLists) {
      newMap[tl.id] = tl.tasks;
    }
    setLocalTasksMap(newMap);
  }, [taskLists]);

  useEffect(() => {
    if (taskLists.length === 0) {
      setSelectedTaskListId(null);
      return;
    }
    if (
      !selectedTaskListId ||
      !taskLists.some((list) => list.id === selectedTaskListId)
    ) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [taskLists, selectedTaskListId]);

  useEffect(() => {
    if (!taskLists.some((list) => list.id === selectedTaskListId)) {
      setEditListName("");
      setEditListBackground(listColors[0]);
      setNewTaskText("");
      return;
    }
    const selected = taskLists.find((l) => l.id === selectedTaskListId);
    if (selected) {
      setEditListName(selected.name);
      setEditListBackground(selected.background);
      setNewTaskText("");
    }
  }, [selectedTaskListId, taskLists]);

  useEffect(() => {
    setShareErrorMessage(null);
    setIsGeneratingShareCode(false);
    setIsRemovingShareCode(false);
  }, [selectedTaskListId]);

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
    setIsReorderHandleActive(false);
  }, [selectedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const currentTasks = selectedTaskList?.tasks ?? EMPTY_TASKS;
    const exists = currentTasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, selectedTaskList?.tasks]);

  useEffect(() => {
    if (!taskListCarouselApi || stableTaskLists.length === 0) return;
    const index = stableTaskLists.findIndex(
      (taskList) => taskList.id === selectedTaskListId,
    );
    if (index >= 0) {
      if (taskListCarouselApi.getCurrentIndex() === index) return;
      taskListCarouselApi.scrollTo(index);
    }
  }, [selectedTaskListId, taskListCarouselApi, stableTaskLists]);

  const handleReorderTaskWithOptimisticUpdate = useCallback(
    async (taskListId: string, draggedTaskId: string, targetTaskId: string) => {
      const currentTasks = localTasksMap[taskListId];
      if (!currentTasks) return;

      const oldIndex = currentTasks.findIndex((t) => t.id === draggedTaskId);
      const newIndex = currentTasks.findIndex((t) => t.id === targetTaskId);

      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalTasksMap((prev) => ({
          ...prev,
          [taskListId]: arrayMove(prev[taskListId] ?? [], oldIndex, newIndex),
        }));
      }

      try {
        await updateTasksOrder(taskListId, draggedTaskId, targetTaskId);
      } catch {
        const originalList = taskLists.find((tl) => tl.id === taskListId);
        if (originalList) {
          setLocalTasksMap((prev) => ({
            ...prev,
            [taskListId]: originalList.tasks,
          }));
        }
      }
    },
    [localTasksMap, taskLists],
  );

  const handleEditListDialogChange = useCallback(
    (open: boolean) => {
      setIsEditListDialogOpen(open);
      if (open) return;
      if (!selectedTaskList) {
        setEditListName("");
        setEditListBackground(listColors[0]);
        return;
      }
      setEditListName(selectedTaskList.name);
      setEditListBackground(selectedTaskList.background || listColors[0]);
    },
    [selectedTaskList],
  );

  const handleShareDialogChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open);
  }, []);

  const handleEditStart = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  }, []);

  const handleEditEnd = useCallback(
    async (task: Task) => {
      if (!editingTaskId || editingTaskId !== task.id) return;

      const trimmedText = editingTaskText.trim();
      if (!trimmedText) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }
      const normalizedDate = editingTaskDate.trim();
      if (trimmedText === task.text && normalizedDate === (task.date ?? "")) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }
      await handleUpdateTask(task.id, {
        text: trimmedText,
        date: normalizedDate,
      });
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
    },
    [editingTaskId, editingTaskText, editingTaskDate],
  );

  const handleDateChange = useCallback(
    async (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      await handleUpdateTask(task.id, { date: normalizedDate });
    },
    [editingTaskId],
  );

  const handleCarouselSelect = useCallback(
    (api: CarouselApi) => {
      if (isScrollingRef.current) {
        pendingIndexRef.current = api.selectedIndex;
        return;
      }
      const taskList = stableTaskLists[api.selectedIndex];
      if (!taskList || taskList.id === selectedTaskListId) return;
      setSelectedTaskListId(taskList.id);
    },
    [stableTaskLists, selectedTaskListId],
  );

  const handleCreateList = async (): Promise<boolean> => {
    const trimmedName = createListName.trim();
    if (!trimmedName) {
      setAppErrorMessage(t("form.required"));
      return false;
    }
    setIsCreatingList(true);
    setAppErrorMessage(null);
    try {
      const newListId = await createTaskList(trimmedName, createListBackground);
      setCreateListName("");
      setCreateListBackground(listColors[0]);
      setSelectedTaskListId(newListId);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
      return false;
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

  const handleJoinList = async (): Promise<boolean> => {
    const trimmedCode = joinListInput.trim().toUpperCase();
    if (!trimmedCode) {
      setJoinListError(t("pages.sharecode.enterCode"));
      return false;
    }
    setIsJoiningList(true);
    setJoinListError(null);
    try {
      const taskListId = await fetchTaskListIdByShareCode(trimmedCode);
      if (!taskListId) {
        setJoinListError(t("pages.sharecode.notFound"));
        return false;
      }
      await addSharedTaskListToOrder(taskListId);
      setJoinListInput("");
      setSelectedTaskListId(taskListId);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setJoinListError(error.message);
      } else {
        setJoinListError(t("pages.sharecode.error"));
      }
      return false;
    } finally {
      setIsJoiningList(false);
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
    setAppErrorMessage(null);
    try {
      await updateTaskListOrder(draggedTaskListId, targetTaskListId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskList) return;
    const trimmedText = newTaskText.trim();
    if (!trimmedText) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setAppErrorMessage(null);
    setNewTaskText("");
    try {
      await addTask(selectedTaskList.id, trimmedText);
    } catch (error) {
      setNewTaskText(trimmedText);
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!selectedTaskList) return;
    if (typeof updates.text === "string" && updates.text.trim().length === 0) {
      setAppErrorMessage(t("form.required"));
      return;
    }
    setAppErrorMessage(null);
    try {
      await updateTask(selectedTaskList.id, taskId, updates);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleReorderTask = async (
    draggedTaskId: string,
    targetTaskId: string,
  ) => {
    if (!selectedTaskList) return;
    if (!draggedTaskId || !targetTaskId) return;
    if (draggedTaskId === targetTaskId) return;
    setAppErrorMessage(null);
    try {
      await updateTasksOrder(selectedTaskList.id, draggedTaskId, targetTaskId);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleSortTasks = async () => {
    if (!selectedTaskList) return;
    setAppErrorMessage(null);
    try {
      await sortTasks(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!selectedTaskList) return;
    setAppErrorMessage(null);
    try {
      await deleteCompletedTasks(selectedTaskList.id);
    } catch (error) {
      if (error instanceof Error) {
        setAppErrorMessage(error.message);
      } else {
        setAppErrorMessage(t("app.error"));
      }
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

  const canSaveList =
    Boolean(selectedTaskList) &&
    !isSavingList &&
    editListName.trim().length > 0;
  const canDeleteList = Boolean(selectedTaskList) && !isDeletingList;
  const shareCode = selectedTaskList?.shareCode ?? null;

  const taskListHeader = (
    <View>
      <View style={styles.appHeader}>
        <View style={styles.appTitleRow}>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("app.drawerTitle")}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={({ pressed }) => [
                styles.headerIconButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppIcon name="menu" size={20} color={theme.text} />
            </Pressable>
          ) : null}
          <View style={styles.headerActions} />
        </View>
      </View>
      {appErrorMessage ? (
        <Text
          accessibilityRole="alert"
          style={[styles.appError, { color: theme.error }]}
        >
          {appErrorMessage}
        </Text>
      ) : null}
      {selectedTaskList ? (
        <>
          <Dialog
            open={isEditListDialogOpen}
            onOpenChange={handleEditListDialogChange}
            title={t("taskList.editDetails")}
            theme={theme}
            footer={
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.cancel")}
                  onPress={() => handleEditListDialogChange(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      flex: 1,
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: theme.text }]}
                  >
                    {t("app.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.save")}
                  onPress={handleSaveList}
                  disabled={!canSaveList}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      flex: 1,
                      backgroundColor: canSaveList
                        ? theme.primary
                        : theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: canSaveList ? theme.primaryText : theme.muted },
                    ]}
                  >
                    {t("app.save")}
                  </Text>
                </Pressable>
              </>
            }
          >
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("app.taskListName")}
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
                  value={editListName}
                  onChangeText={setEditListName}
                  placeholder={t("app.taskListNamePlaceholder")}
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveList}
                  editable={!isSavingList}
                  accessibilityLabel={t("app.taskListName")}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("taskList.selectColor")}
                </Text>
                <View style={styles.colorRow}>
                  {([null, ...listColors] as (string | null)[]).map((color) => {
                    const isSelected = color === editListBackground;
                    return (
                      <Pressable
                        key={`edit-${color ?? "none"}`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          color
                            ? t("taskList.selectColor")
                            : t("taskList.backgroundNone")
                        }
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setEditListBackground(color)}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: color || theme.background,
                            borderColor: isSelected
                              ? theme.primary
                              : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        {!color && (
                          <AppIcon
                            name="close"
                            size={16}
                            color={isSelected ? theme.primary : theme.muted}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.deleteList")}
                onPress={confirmDeleteList}
                disabled={!canDeleteList}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.error, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: theme.error }]}
                >
                  {t("taskList.deleteList")}
                </Text>
              </Pressable>
            </View>
          </Dialog>
          <Dialog
            open={isShareDialogOpen}
            onOpenChange={handleShareDialogChange}
            title={t("taskList.shareTitle")}
            description={t("taskList.shareDescription")}
            theme={theme}
          >
            <View style={styles.form}>
              {shareCode ? (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      {t("taskList.shareCode")}
                    </Text>
                    <View
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.inputBackground,
                        },
                      ]}
                    >
                      <Text selectable style={{ color: theme.text }}>
                        {shareCode}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.removeShare")}
                    onPress={handleRemoveShareCode}
                    disabled={isRemovingShareCode}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { borderColor: theme.error, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.error },
                      ]}
                    >
                      {isRemovingShareCode
                        ? t("common.loading")
                        : t("taskList.removeShare")}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.generateShare")}
                  onPress={handleGenerateShareCode}
                  disabled={isGeneratingShareCode}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: isGeneratingShareCode
                        ? theme.border
                        : theme.primary,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isGeneratingShareCode
                          ? theme.muted
                          : theme.primaryText,
                      },
                    ]}
                  >
                    {isGeneratingShareCode
                      ? t("common.loading")
                      : t("taskList.generateShare")}
                  </Text>
                </Pressable>
              )}
              {shareErrorMessage ? (
                <Text style={[styles.appError, { color: theme.error }]}>
                  {shareErrorMessage}
                </Text>
              ) : null}
            </View>
          </Dialog>
        </>
      ) : null}
    </View>
  );

  const showTaskListLocator = stableTaskLists.length > 1;
  const selectedTaskListIndex = Math.max(
    0,
    stableTaskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );

  const indicator = showTaskListLocator ? (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("app.taskListLocator.label")}
      style={styles.indicatorContainer}
    >
      {stableTaskLists.map((taskList, index) => {
        const isSelected = index === selectedTaskListIndex;
        return (
          <Pressable
            key={taskList.id}
            accessibilityRole="tab"
            accessibilityLabel={t("app.taskListLocator.goTo", {
              index: index + 1,
              total: stableTaskLists.length,
            })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => taskListCarouselApi?.scrollTo(index)}
            style={({ pressed }) => [
              styles.indicatorDot,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.indicatorDotInner,
                { backgroundColor: theme.text, opacity: isSelected ? 1 : 0.2 },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const carouselItems = stableTaskLists.map((taskList) => {
    const isActive = taskList.id === selectedTaskListId;
    const listTasks = localTasksMap[taskList.id] ?? taskList.tasks;
    const activeEditingTaskId = isActive ? editingTaskId : null;
    const activeEditingTaskText = isActive ? editingTaskText : "";
    const activeEditingTaskDate = isActive ? editingTaskDate : "";
    const activeNewTaskText = isActive ? newTaskText : "";

    const header = (
      <View style={[styles.taskHeaderRow, { marginBottom: 16 }]}>
        <Text
          style={[styles.settingsTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {taskList.name}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.editDetails")}
            onPress={() => handleEditListDialogChange(true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="edit" size={18} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.shareTitle")}
            onPress={() => handleShareDialogChange(true)}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="share" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
    );

    return (
      <CarouselItem key={taskList.id}>
        <View
          style={{
            flex: 1,
            backgroundColor: taskList.background ?? theme.background,
          }}
        >
          <TaskListPanel
            header={header}
            t={t}
            theme={theme}
            tasks={listTasks}
            newTaskText={activeNewTaskText}
            addDisabled={!isActive}
            emptyLabel={t("pages.tasklist.noTasks")}
            editingTaskId={activeEditingTaskId}
            editingTaskText={activeEditingTaskText}
            editingTaskDate={activeEditingTaskDate}
            onEditingTaskTextChange={setEditingTaskText}
            onEditingTaskDateChange={setEditingTaskDate}
            onEditStart={handleEditStart}
            onEditEnd={handleEditEnd}
            onDateChange={handleDateChange}
            onChangeNewTaskText={setNewTaskText}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onReorderTask={(draggedTaskId, targetTaskId) =>
              handleReorderTaskWithOptimisticUpdate(
                taskList.id,
                draggedTaskId,
                targetTaskId,
              )
            }
            onSortTasks={handleSortTasks}
            onDeleteCompletedTasks={handleDeleteCompletedTasks}
          />
        </View>
      </CarouselItem>
    );
  });

  const taskListContent =
    stableTaskLists.length > 0 ? (
      <Carousel
        style={{ flex: 1 }}
        setApi={setTaskListCarouselApi}
        onSelect={handleCarouselSelect}
        opts={{
          enabled: !isReorderHandleActive,
          loop: false,
          minScrollDistancePerSwipe: 10,
          onScrollStart: () => {
            isScrollingRef.current = true;
          },
          onScrollEnd: () => {
            isScrollingRef.current = false;
            if (pendingIndexRef.current !== null) {
              const taskList = stableTaskLists[pendingIndexRef.current];
              pendingIndexRef.current = null;
              if (taskList && taskList.id !== selectedTaskListId) {
                setSelectedTaskListId(taskList.id);
              }
            }
          },
          onConfigurePanGesture: (gesture) => {
            "worklet";
            gesture.activeOffsetX([-8, 8]).failOffsetY([-6, 6]);
          },
        }}
      >
        <CarouselContent style={{ flex: 1 }}>{carouselItems}</CarouselContent>
      </Carousel>
    ) : (
      <TaskListPanel
        t={t}
        theme={theme}
        tasks={EMPTY_TASKS}
        newTaskText=""
        addDisabled
        emptyLabel=""
        editingTaskId={null}
        editingTaskText=""
        editingTaskDate=""
        onEditingTaskTextChange={() => {}}
        onEditingTaskDateChange={() => {}}
        onEditStart={() => {}}
        onEditEnd={() => {}}
        onDateChange={() => {}}
        onChangeNewTaskText={() => {}}
        onAddTask={() => {}}
        onToggleTask={() => {}}
        onReorderTask={() => {}}
        onSortTasks={() => {}}
        onDeleteCompletedTasks={() => {}}
      />
    );

  const currentBackground = selectedTaskList?.background ?? theme.background;

  const drawerContentProps = {
    t,
    theme,
    userEmail,
    taskLists,
    selectedTaskListId,
    createListName,
    createListBackground,
    isCreatingList,
    isJoiningList,
    joinListInput,
    joinListError,
    onSelectTaskList: setSelectedTaskListId,
    onOpenSettings,
    onChangeCreateListName: setCreateListName,
    onChangeCreateListBackground: setCreateListBackground,
    onChangeJoinListInput: (value: string) => {
      setJoinListInput(value);
      setJoinListError(null);
    },
    onClearJoinListError: () => setJoinListError(null),
    onCreateList: handleCreateList,
    onJoinList: handleJoinList,
    onReorderTaskList: handleReorderTaskList,
  };

  return (
    <View style={[styles.drawerRoot, { backgroundColor: currentBackground }]}>
      <View style={[styles.appContent, { paddingBottom: 0 }]}>
        {taskListHeader}
        {indicator}
      </View>
      {taskListContent}
    </View>
  );
};

type AppScreenProps = {
  onOpenSettings: () => void;
  onOpenShareCode: () => void;
};

export const AppScreen = ({
  onOpenSettings,
  onOpenShareCode,
}: AppScreenProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;
  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const userEmail = appState.user?.email ?? "";
  const taskLists = appState.taskLists;

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [createListName, setCreateListName] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(listColors[0]);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isJoiningList, setIsJoiningList] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joinListError, setJoinListError] = useState<string | null>(null);

  useEffect(() => {
    if (taskLists.length === 0) {
      setSelectedTaskListId(null);
      return;
    }
    if (
      !selectedTaskListId ||
      !taskLists.some((list) => list.id === selectedTaskListId)
    ) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [taskLists, selectedTaskListId]);

  const handleCreateList = async (): Promise<boolean> => {
    const trimmedName = createListName.trim();
    if (!trimmedName) return false;
    setIsCreatingList(true);
    try {
      const newListId = await createTaskList(trimmedName, createListBackground);
      setCreateListName("");
      setCreateListBackground(listColors[0]);
      setSelectedTaskListId(newListId);
      return true;
    } catch {
      return false;
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleJoinList = async (): Promise<boolean> => {
    const trimmedCode = joinListInput.trim().toUpperCase();
    if (!trimmedCode) {
      setJoinListError(t("pages.sharecode.enterCode"));
      return false;
    }
    setIsJoiningList(true);
    setJoinListError(null);
    try {
      const taskListId = await fetchTaskListIdByShareCode(trimmedCode);
      if (!taskListId) {
        setJoinListError(t("pages.sharecode.notFound"));
        return false;
      }
      await addSharedTaskListToOrder(taskListId);
      setJoinListInput("");
      setSelectedTaskListId(taskListId);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setJoinListError(error.message);
      } else {
        setJoinListError(t("pages.sharecode.error"));
      }
      return false;
    } finally {
      setIsJoiningList(false);
    }
  };

  const handleReorderTaskList = async (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => {
    if (!draggedTaskListId || !targetTaskListId) return;
    if (draggedTaskListId === targetTaskListId) return;
    try {
      await updateTaskListOrder(draggedTaskListId, targetTaskListId);
    } catch {}
  };

  const drawerContentProps = {
    t,
    theme,
    userEmail,
    taskLists,
    selectedTaskListId,
    createListName,
    createListBackground,
    isCreatingList,
    isJoiningList,
    joinListInput,
    joinListError,
    onSelectTaskList: setSelectedTaskListId,
    onOpenSettings,
    onChangeCreateListName: setCreateListName,
    onChangeCreateListBackground: setCreateListBackground,
    onChangeJoinListInput: (value: string) => {
      setJoinListInput(value);
      setJoinListError(null);
    },
    onClearJoinListError: () => setJoinListError(null),
    onCreateList: handleCreateList,
    onJoinList: handleJoinList,
    onReorderTaskList: handleReorderTaskList,
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <AppDrawerContent {...drawerContentProps} {...props} />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: isWideLayout ? "permanent" : "front",
        drawerStyle: {
          width: isWideLayout ? 360 : Math.min(width, 420),
          borderRightWidth: isWideLayout ? 1 : 0,
          borderRightColor: theme.border,
        },
      }}
    >
      <Drawer.Screen name="Main">
        {() => (
          <AppScreenContent
            onOpenSettings={onOpenSettings}
            onOpenShareCode={onOpenShareCode}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
};
