import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
import type { TaskList } from "@lightlist/sdk/types";
import {
  addSharedTaskListToOrder,
  createTaskList,
  deleteTaskList,
  fetchTaskListIdByShareCode,
  generateShareCode,
  removeShareCode,
  updateTaskList,
  updateTaskListOrder,
} from "@lightlist/sdk/mutations/app";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";
import { AppIcon } from "../components/ui/AppIcon";
import { Carousel } from "../components/ui/Carousel";
import { Dialog } from "../components/ui/Dialog";
import { TaskListCard } from "../components/app/TaskListCard";
import { DrawerPanel, type ColorOption } from "../components/app/DrawerPanel";
import { styles } from "../styles/appStyles";
import { useTheme, listColors } from "../styles/theme";

const EMPTY_TASK_LISTS: TaskList[] = [];

const Drawer = createDrawerNavigator();

type AppScreenContentProps = {
  onOpenSettings: () => void;
  onOpenShareCode: () => void;
  selectedTaskListId: string | null;
  onSelectTaskList: (id: string | null) => void;
};

const AppScreenContent = ({
  onOpenSettings,
  onOpenShareCode,
  selectedTaskListId,
  onSelectTaskList,
}: AppScreenContentProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;

  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const taskListsData = appState.taskLists;
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    taskListsData,
    updateTaskListOrder,
  );

  const [appErrorMessage, setAppErrorMessage] = useState<string | null>(null);

  // List Edit State
  const [editListName, setEditListName] = useState("");
  const [editListBackground, setEditListBackground] = useState<string | null>(
    listColors[0],
  );
  const [isSavingList, setIsSavingList] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);

  // Share State
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(
    null,
  );
  const [isGeneratingShareCode, setIsGeneratingShareCode] = useState(false);
  const [isRemovingShareCode, setIsRemovingShareCode] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const stableTaskLists = taskLists.length > 0 ? taskLists : EMPTY_TASK_LISTS;
  const selectedTaskList: TaskList | null =
    taskLists.find((list) => list.id === selectedTaskListId) ?? null;

  // Sync edit form with selected list
  useEffect(() => {
    if (!selectedTaskList) {
      setEditListName("");
      setEditListBackground(listColors[0]);
      return;
    }
    setEditListName(selectedTaskList.name);
    setEditListBackground(selectedTaskList.background);
  }, [selectedTaskList]);

  useEffect(() => {
    setShareErrorMessage(null);
    setIsGeneratingShareCode(false);
    setIsRemovingShareCode(false);
  }, [selectedTaskListId]);

  const handleEditListDialogChange = useCallback(
    (open: boolean) => {
      setIsEditListDialogOpen(open);
      if (open && selectedTaskList) {
        setEditListName(selectedTaskList.name);
        setEditListBackground(selectedTaskList.background || listColors[0]);
      }
    },
    [selectedTaskList],
  );

  const handleShareDialogChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open);
  }, []);

  const handleCarouselIndexChange = useCallback(
    (index: number) => {
      const taskList = stableTaskLists[index];
      if (taskList && taskList.id !== selectedTaskListId) {
        onSelectTaskList(taskList.id);
      }
    },
    [stableTaskLists, selectedTaskListId, onSelectTaskList],
  );

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
      setIsEditListDialogOpen(false);
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
      setIsEditListDialogOpen(false);
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
            onPress={() => onSelectTaskList(taskList.id)}
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

  const taskListContent =
    stableTaskLists.length > 0 ? (
      <Carousel
        style={{ flex: 1 }}
        index={selectedTaskListIndex}
        onIndexChange={handleCarouselIndexChange}
        showIndicators={false}
      >
        {stableTaskLists.map((taskList) => {
          const isActive = taskList.id === selectedTaskListId;

          return (
            <View
              key={taskList.id}
              style={{
                flex: 1,
                backgroundColor: taskList.background ?? theme.background,
              }}
            >
              <TaskListCard
                taskList={taskList}
                isActive={isActive}
                onActivate={onSelectTaskList}
                t={t}
                enableEditDialog
                showEditListDialog={isEditListDialogOpen}
                onEditDialogOpenChange={(tl, open) => {
                  // Switch to the list we want to edit if different
                  if (tl.id !== selectedTaskListId) {
                    onSelectTaskList(tl.id);
                  }
                  handleEditListDialogChange(open);
                }}
                enableShareDialog
                showShareDialog={isShareDialogOpen}
                onShareDialogOpenChange={(tl, open) => {
                  if (tl.id !== selectedTaskListId) {
                    onSelectTaskList(tl.id);
                  }
                  handleShareDialogChange(open);
                }}
              />
            </View>
          );
        })}
      </Carousel>
    ) : (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          {t("pages.tasklist.noTasks")}
        </Text>
      </View>
    );

  const currentBackground = selectedTaskList?.background ?? theme.background;

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
  const taskListsData = appState.taskLists;
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    taskListsData,
    updateTaskListOrder,
  );

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

  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isJoinListDialogOpen, setIsJoinListDialogOpen] = useState(false);

  const colorOptions: ColorOption[] = listColors.map((color) => ({
    value: color,
  }));

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

  const handleCreateList = async () => {
    const trimmedName = createListName.trim();
    if (!trimmedName) return;
    setIsCreatingList(true);
    try {
      const newListId = await createTaskList(trimmedName, createListBackground);
      setCreateListName("");
      setCreateListBackground(listColors[0]);
      setSelectedTaskListId(newListId);
      setIsCreateListDialogOpen(false);
    } catch {
      // Error handling
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleJoinList = async () => {
    const trimmedCode = joinListInput.trim().toUpperCase();
    if (!trimmedCode) {
      setJoinListError(t("pages.sharecode.enterCode"));
      return;
    }
    setIsJoiningList(true);
    setJoinListError(null);
    try {
      const taskListId = await fetchTaskListIdByShareCode(trimmedCode);
      if (!taskListId) {
        setJoinListError(t("pages.sharecode.notFound"));
        return;
      }
      await addSharedTaskListToOrder(taskListId);
      setJoinListInput("");
      setSelectedTaskListId(taskListId);
      setIsJoinListDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setJoinListError(error.message);
      } else {
        setJoinListError(t("pages.sharecode.error"));
      }
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
      await reorderTaskList(draggedTaskListId, targetTaskListId);
    } catch {}
  };

  const handleCreateListDialogChange = (open: boolean) => {
    setIsCreateListDialogOpen(open);
    if (!open) {
      setCreateListName("");
      setCreateListBackground(listColors[0]);
    }
  };

  const handleJoinListDialogChange = (open: boolean) => {
    setIsJoinListDialogOpen(open);
    if (!open) {
      setJoinListInput("");
      setJoinListError(null);
    }
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <DrawerPanel
          isWideLayout={isWideLayout}
          userEmail={userEmail}
          showCreateListDialog={isCreateListDialogOpen}
          onCreateListDialogChange={handleCreateListDialogChange}
          createListInput={createListName}
          onCreateListInputChange={setCreateListName}
          createListBackground={createListBackground}
          onCreateListBackgroundChange={setCreateListBackground}
          colors={colorOptions}
          onCreateList={handleCreateList}
          hasTaskLists={taskLists.length > 0}
          taskLists={taskLists}
          onReorderTaskList={handleReorderTaskList}
          selectedTaskListId={selectedTaskListId}
          onSelectTaskList={setSelectedTaskListId}
          onCloseDrawer={() => props.navigation.closeDrawer()}
          onOpenSettings={onOpenSettings}
          showJoinListDialog={isJoinListDialogOpen}
          onJoinListDialogChange={handleJoinListDialogChange}
          joinListInput={joinListInput}
          onJoinListInputChange={(value) => {
            setJoinListInput(value);
            setJoinListError(null);
          }}
          onJoinList={handleJoinList}
          joinListError={joinListError}
          joiningList={isJoiningList}
          creatingList={isCreatingList}
        />
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
            selectedTaskListId={selectedTaskListId}
            onSelectTaskList={setSelectedTaskListId}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
};
