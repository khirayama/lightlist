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
import { listColors } from "../styles/theme";

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
    null,
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
      setEditListBackground(null);
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
        setEditListBackground(selectedTaskList.background || null);
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
      <View className="mb-4">
        <View className="flex-row items-center justify-between gap-3">
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("app.drawerTitle")}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
            >
              <AppIcon
                name="menu"
                size={24}
                className="fill-text dark:fill-text-dark"
              />
            </Pressable>
          ) : null}
          <View className="flex-row items-center justify-end flex-wrap gap-2" />
        </View>
      </View>
      {appErrorMessage ? (
        <Text
          accessibilityRole="alert"
          className="text-[13px] font-inter text-error dark:text-error-dark mb-3"
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
            footer={
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.cancel")}
                  onPress={() => handleEditListDialogChange(false)}
                  className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                >
                  <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                    {t("app.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.save")}
                  onPress={handleSaveList}
                  disabled={!canSaveList}
                  className={`flex-1 rounded-[12px] py-3.5 items-center active:opacity-90 ${
                    canSaveList
                      ? "bg-primary dark:bg-primary-dark"
                      : "bg-border dark:bg-border-dark"
                  }`}
                >
                  <Text
                    className={`text-[16px] font-inter-semibold ${
                      canSaveList
                        ? "text-primary-text dark:text-primary-text-dark"
                        : "text-muted dark:text-muted-dark"
                    }`}
                  >
                    {t("app.save")}
                  </Text>
                </Pressable>
              </>
            }
          >
            <View className="gap-4">
              <View className="gap-1.5">
                <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                  {t("app.taskListName")}
                </Text>
                <TextInput
                  className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                  value={editListName}
                  onChangeText={setEditListName}
                  placeholder={t("app.taskListNamePlaceholder")}
                  placeholderClassName="text-placeholder dark:text-placeholder-dark"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveList}
                  editable={!isSavingList}
                  accessibilityLabel={t("app.taskListName")}
                />
              </View>
              <View className="gap-1.5">
                <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                  {t("taskList.selectColor")}
                </Text>
                <View className="flex-row flex-wrap gap-2">
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
                        style={color ? { backgroundColor: color } : undefined}
                        className={`w-[30px] h-[30px] rounded-full justify-center items-center border ${
                          isSelected
                            ? "border-primary dark:border-primary-dark border-2"
                            : "border-border dark:border-border-dark"
                        } ${!color ? "bg-background dark:bg-background-dark" : ""}`}
                      >
                        {!color && (
                          <AppIcon
                            name="close"
                            size={16}
                            className={
                              isSelected
                                ? "fill-primary dark:fill-primary-dark"
                                : "fill-muted dark:fill-muted-dark"
                            }
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
                className="rounded-[12px] border border-error dark:border-error-dark py-3 items-center active:opacity-90 mt-2"
              >
                <Text className="text-[15px] font-inter-semibold text-error dark:text-error-dark">
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
          >
            <View className="gap-4">
              {shareCode ? (
                <>
                  <View className="gap-1.5">
                    <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                      {t("taskList.shareCode")}
                    </Text>
                    <View className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 bg-input-background dark:bg-input-background-dark">
                      <Text
                        selectable
                        className="text-[16px] font-inter text-text dark:text-text-dark"
                      >
                        {shareCode}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.removeShare")}
                    onPress={handleRemoveShareCode}
                    disabled={isRemovingShareCode}
                    className="rounded-[12px] border border-error dark:border-error-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-error dark:text-error-dark">
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
                  className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
                    isGeneratingShareCode
                      ? "bg-border dark:bg-border-dark"
                      : "bg-primary dark:bg-primary-dark"
                  }`}
                >
                  <Text
                    className={`text-[16px] font-inter-semibold ${
                      isGeneratingShareCode
                        ? "text-muted dark:text-muted-dark"
                        : "text-primary-text dark:text-primary-text-dark"
                    }`}
                  >
                    {isGeneratingShareCode
                      ? t("common.loading")
                      : t("taskList.generateShare")}
                  </Text>
                </Pressable>
              )}
              {shareErrorMessage ? (
                <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
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
      className="flex-row items-center justify-center gap-1.5 py-1 mb-2"
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
            className="w-4 h-4 justify-center items-center active:opacity-70"
          >
            <View
              className={`w-2 h-2 rounded-full bg-text dark:bg-text-dark ${
                isSelected ? "opacity-100" : "opacity-20"
              }`}
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
              style={
                taskList.background
                  ? { backgroundColor: taskList.background }
                  : undefined
              }
              className={`flex-1 ${!taskList.background ? "bg-background dark:bg-background-dark" : ""}`}
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
      <View className="flex-1 justify-center items-center">
        <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
          {t("pages.tasklist.noTasks")}
        </Text>
      </View>
    );

  const currentBackground = selectedTaskList?.background;

  return (
    <View
      style={
        currentBackground ? { backgroundColor: currentBackground } : undefined
      }
      className={`flex-1 ${!currentBackground ? "bg-background dark:bg-background-dark" : ""}`}
    >
      <View className="px-6 pb-0 max-w-[768px] w-full self-center">
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
  >(null);
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
      setCreateListBackground(null);
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
      setCreateListBackground(null);
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
