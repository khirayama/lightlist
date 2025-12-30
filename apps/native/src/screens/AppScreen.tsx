import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppIcon } from "../components/ui/AppIcon";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { styles } from "../styles/appStyles";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../components/ui/Carousel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/Drawer";
import { Dialog } from "../components/ui/Dialog";
import { TaskListPanel } from "../components/app/TaskListPanel";
import { listColors, type Theme } from "../styles/theme";

type AppScreenProps = {
  t: TFunction;
  theme: Theme;
  taskLists: TaskList[];
  selectedTaskList: TaskList | null;
  selectedTaskListId: string | null;
  tasks: Task[];
  appErrorMessage: string | null;
  createListName: string;
  createListBackground: string;
  editListName: string;
  editListBackground: string;
  newTaskText: string;
  isCreatingList: boolean;
  isSavingList: boolean;
  isDeletingList: boolean;
  isAddingTask: boolean;
  shareCode: string | null;
  shareErrorMessage: string | null;
  isGeneratingShareCode: boolean;
  isRemovingShareCode: boolean;
  onOpenSettings: () => void;
  onOpenShareCode: () => void;
  onSelectTaskList: (taskListId: string) => void;
  onChangeCreateListName: (value: string) => void;
  onChangeCreateListBackground: (color: string) => void;
  onChangeEditListName: (value: string) => void;
  onChangeEditListBackground: (color: string) => void;
  onChangeNewTaskText: (value: string) => void;
  onCreateList: () => Promise<boolean>;
  onSaveList: () => void | Promise<void>;
  onConfirmDeleteList: () => void;
  onAddTask: () => void | Promise<void>;
  onToggleTask: (task: Task) => void | Promise<void>;
  onConfirmSignOut: () => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => void | Promise<void>;
  onReorderTask: (
    draggedTaskId: string,
    targetTaskId: string,
  ) => void | Promise<void>;
  onSortTasks: () => void | Promise<void>;
  onDeleteCompletedTasks: () => void | Promise<void>;
  onReorderTaskList: (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => void | Promise<void>;
  onGenerateShareCode: () => void | Promise<void>;
  onRemoveShareCode: () => void | Promise<void>;
  isUpdatingTask: boolean;
  isReorderingTasks: boolean;
  isSortingTasks: boolean;
  isDeletingCompletedTasks: boolean;
  isReorderingTaskLists: boolean;
};

const EMPTY_TASKS: Task[] = [];
const EMPTY_TASK_LISTS: TaskList[] = [];

export const AppScreen = ({
  t,
  theme,
  taskLists,
  selectedTaskList,
  selectedTaskListId,
  tasks,
  appErrorMessage,
  createListName,
  createListBackground,
  editListName,
  editListBackground,
  newTaskText,
  isCreatingList,
  isSavingList,
  isDeletingList,
  isAddingTask,
  shareCode,
  shareErrorMessage,
  isGeneratingShareCode,
  isRemovingShareCode,
  onOpenSettings,
  onOpenShareCode,
  onSelectTaskList,
  onChangeCreateListName,
  onChangeCreateListBackground,
  onChangeEditListName,
  onChangeEditListBackground,
  onChangeNewTaskText,
  onCreateList,
  onSaveList,
  onConfirmDeleteList,
  onAddTask,
  onToggleTask,
  onConfirmSignOut,
  onUpdateTask,
  onReorderTask,
  onSortTasks,
  onDeleteCompletedTasks,
  onReorderTaskList,
  onGenerateShareCode,
  onRemoveShareCode,
  isUpdatingTask,
  isReorderingTasks,
  isSortingTasks,
  isDeletingCompletedTasks,
  isReorderingTaskLists,
}: AppScreenProps) => {
  const canCreateList = !isCreatingList && createListName.trim().length > 0;
  const canSaveList =
    Boolean(selectedTaskList) &&
    !isSavingList &&
    editListName.trim().length > 0;
  const canDeleteList = Boolean(selectedTaskList) && !isDeletingList;
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;
  const [taskListCarouselApi, setTaskListCarouselApi] =
    useState<CarouselApi | null>(null);
  const [isReorderHandleActive, setIsReorderHandleActive] = useState(false);
  const [orderedTaskLists, setOrderedTaskLists] =
    useState<TaskList[]>(taskLists);
  const [orderedTasksByListId, setOrderedTasksByListId] = useState<
    Record<string, Task[]>
  >({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const stableTaskLists = taskLists.length > 0 ? taskLists : EMPTY_TASK_LISTS;
  const stableTasks = tasks.length > 0 ? tasks : EMPTY_TASKS;

  useEffect(() => {
    setOrderedTaskLists(stableTaskLists);
  }, [stableTaskLists]);

  useEffect(() => {
    const next: Record<string, Task[]> = {};
    stableTaskLists.forEach((taskList) => {
      next[taskList.id] = taskList.tasks;
    });
    setOrderedTasksByListId(next);
  }, [stableTaskLists]);

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [selectedTaskListId]);

  useEffect(() => {
    setIsReorderHandleActive(false);
  }, [selectedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const exists = stableTasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, stableTasks]);

  const handleCreateListDialogChange = (open: boolean) => {
    setIsCreateListDialogOpen(open);
    if (!open) {
      onChangeCreateListName("");
      onChangeCreateListBackground(listColors[0]);
    }
  };

  const handleEditListDialogChange = (open: boolean) => {
    setIsEditListDialogOpen(open);
    if (open) return;
    if (!selectedTaskList) {
      onChangeEditListName("");
      onChangeEditListBackground(listColors[0]);
      return;
    }
    onChangeEditListName(selectedTaskList.name);
    onChangeEditListBackground(selectedTaskList.background || listColors[0]);
  };

  const handleShareDialogChange = (open: boolean) => {
    setIsShareDialogOpen(open);
  };

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    const created = await onCreateList();
    if (created) {
      handleCreateListDialogChange(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleSelectTaskListFromDrawer = (taskListId: string) => {
    onSelectTaskList(taskListId);
    closeDrawer();
  };

  const handleOpenSettingsFromDrawer = () => {
    closeDrawer();
    onOpenSettings();
  };

  const handleOpenShareCodeFromDrawer = () => {
    closeDrawer();
    onOpenShareCode();
  };

  const handleConfirmSignOutFromDrawer = () => {
    closeDrawer();
    onConfirmSignOut();
  };

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  };

  const handleEditEnd = async (task: Task) => {
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
    await onUpdateTask(task.id, {
      text: trimmedText,
      date: normalizedDate,
    });
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  };

  const handleDateChange = async (task: Task, nextDate: string) => {
    const normalizedDate = nextDate.trim();
    if (editingTaskId === task.id) {
      setEditingTaskDate(normalizedDate);
    }
    if (normalizedDate === (task.date ?? "")) return;
    await onUpdateTask(task.id, { date: normalizedDate });
  };

  useEffect(() => {
    if (!taskListCarouselApi || stableTaskLists.length === 0) return;
    const index = stableTaskLists.findIndex(
      (taskList) => taskList.id === selectedTaskListId,
    );
    if (index >= 0) {
      taskListCarouselApi.scrollTo(index);
    }
  }, [selectedTaskListId, taskListCarouselApi, stableTaskLists]);

  useEffect(() => {
    if (isWideLayout) {
      setIsDrawerOpen(false);
    }
  }, [isWideLayout]);

  const handleCarouselSelect = (api: CarouselApi) => {
    const taskList = stableTaskLists[api.selectedIndex];
    if (!taskList || taskList.id === selectedTaskListId) return;
    onSelectTaskList(taskList.id);
  };

  const taskListHeader = (
    <View>
      <View style={styles.appHeader}>
        <View style={styles.appTitleRow}>
          {!isWideLayout ? (
            <DrawerTrigger
              accessibilityRole="button"
              accessibilityLabel={t("app.drawerTitle")}
              style={({ pressed }) => [
                styles.headerIconButton,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <AppIcon name="menu" size={20} color={theme.text} />
            </DrawerTrigger>
          ) : null}
          <View style={styles.headerActions}>
            {selectedTaskList ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.editDetails")}
                  onPress={() => handleEditListDialogChange(true)}
                  style={({ pressed }) => [
                    styles.headerIconButton,
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
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
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <AppIcon name="share" size={18} color={theme.text} />
                </Pressable>
              </>
            ) : null}
          </View>
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
                  onPress={onSaveList}
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
                      {
                        color: canSaveList ? theme.primaryText : theme.muted,
                      },
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
                  onChangeText={onChangeEditListName}
                  placeholder={t("app.taskListNamePlaceholder")}
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={onSaveList}
                  editable={!isSavingList}
                  accessibilityLabel={t("app.taskListName")}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("taskList.selectColor")}
                </Text>
                <View style={styles.colorRow}>
                  {listColors.map((color) => {
                    const isSelected = color === editListBackground;
                    return (
                      <Pressable
                        key={`edit-${color}`}
                        accessibilityRole="button"
                        accessibilityLabel={t("taskList.selectColor")}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => onChangeEditListBackground(color)}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: color,
                            borderColor: isSelected
                              ? theme.primary
                              : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.deleteList")}
                onPress={onConfirmDeleteList}
                disabled={!canDeleteList}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: theme.error,
                    opacity: pressed ? 0.9 : 1,
                  },
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
                    onPress={onRemoveShareCode}
                    disabled={isRemovingShareCode}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        borderColor: theme.error,
                        opacity: pressed ? 0.9 : 1,
                      },
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
                  onPress={onGenerateShareCode}
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

  const drawerPanelContent = (
    <>
      <DrawerHeader>
        <DrawerTitle style={{ color: theme.text }}>
          {t("app.drawerTitle")}
        </DrawerTitle>
        {!isWideLayout ? (
          <DrawerClose
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={({ pressed }) => [
              styles.headerButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.headerButtonText, { color: theme.text }]}>
              {t("common.close")}
            </Text>
          </DrawerClose>
        ) : null}
      </DrawerHeader>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("settings.title")}
        onPress={handleOpenSettingsFromDrawer}
        style={({ pressed }) => [
          styles.drawerNavButton,
          {
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={[styles.drawerNavText, { color: theme.text }]}>
          {t("settings.title")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("pages.sharecode.title")}
        onPress={handleOpenShareCodeFromDrawer}
        style={({ pressed }) => [
          styles.drawerNavButton,
          {
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={[styles.drawerNavText, { color: theme.text }]}>
          {t("pages.sharecode.title")}
        </Text>
      </Pressable>
      <DraggableFlatList
        data={orderedTaskLists}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data, from, to }) => {
          if (isReorderingTaskLists) {
            setOrderedTaskLists(data);
            return;
          }
          const draggedList = orderedTaskLists[from];
          const targetList = orderedTaskLists[to];
          setOrderedTaskLists(data);
          if (!draggedList || !targetList || from === to) return;
          void onReorderTaskList(draggedList.id, targetList.id);
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerList}
        ListFooterComponent={
          <View style={styles.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("app.createTaskList")}
              onPress={() => handleCreateListDialogChange(true)}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                {t("app.createTaskList")}
              </Text>
            </Pressable>
            <Dialog
              open={isCreateListDialogOpen}
              onOpenChange={handleCreateListDialogChange}
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
              theme={theme}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => handleCreateListDialogChange(false)}
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
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.text },
                      ]}
                    >
                      {t("app.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.create")}
                    onPress={handleCreateListSubmit}
                    disabled={!canCreateList}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        flex: 1,
                        backgroundColor: canCreateList
                          ? theme.primary
                          : theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: canCreateList
                            ? theme.primaryText
                            : theme.muted,
                        },
                      ]}
                    >
                      {isCreatingList ? t("app.creating") : t("app.create")}
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
                    value={createListName}
                    onChangeText={onChangeCreateListName}
                    placeholder={t("app.taskListNamePlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    returnKeyType="done"
                    onSubmitEditing={handleCreateListSubmit}
                    editable={!isCreatingList}
                    accessibilityLabel={t("app.taskListName")}
                    autoFocus
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t("taskList.selectColor")}
                  </Text>
                  <View style={styles.colorRow}>
                    {listColors.map((color) => {
                      const isSelected = color === createListBackground;
                      return (
                        <Pressable
                          key={`create-${color}`}
                          accessibilityRole="button"
                          accessibilityLabel={t("taskList.selectColor")}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => onChangeCreateListBackground(color)}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: color,
                              borderColor: isSelected
                                ? theme.primary
                                : theme.border,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>
            </Dialog>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("app.emptyState")}
          </Text>
        }
        renderItem={({
          item,
          drag,
          isActive,
          getIndex,
        }: RenderItemParams<TaskList>) => {
          const isSelected = item.id === selectedTaskListId;
          const currentIndex =
            getIndex() ??
            orderedTaskLists.findIndex((list) => list.id === item.id);
          const canDragList =
            !isReorderingTaskLists && orderedTaskLists.length > 1;
          const canMoveListUp = canDragList && currentIndex > 0;
          const canMoveListDown =
            canDragList &&
            currentIndex >= 0 &&
            currentIndex < orderedTaskLists.length - 1;
          const accessibilityActions: { name: string; label: string }[] = [];

          if (canMoveListUp) {
            accessibilityActions.push({
              name: "moveUp",
              label: t("app.moveUp"),
            });
          }
          if (canMoveListDown) {
            accessibilityActions.push({
              name: "moveDown",
              label: t("app.moveDown"),
            });
          }

          const handleMoveListByOffset = (offset: number) => {
            if (!canDragList || currentIndex < 0) return;
            const targetList = orderedTaskLists[currentIndex + offset];
            if (!targetList) return;
            void onReorderTaskList(item.id, targetList.id);
          };

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={item.name || t("app.taskListName")}
              onPress={() => handleSelectTaskListFromDrawer(item.id)}
              style={({ pressed }) => [
                styles.drawerListItem,
                {
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isSelected
                    ? theme.inputBackground
                    : theme.surface,
                  opacity: pressed ? 0.9 : isActive ? 0.7 : 1,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.reorder")}
                accessibilityActions={accessibilityActions}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === "moveUp") {
                    handleMoveListByOffset(-1);
                    return;
                  }
                  if (event.nativeEvent.actionName === "moveDown") {
                    handleMoveListByOffset(1);
                  }
                }}
                onLongPress={canDragList ? drag : undefined}
                delayLongPress={150}
                onPress={() => {}}
                disabled={!canDragList}
                style={({ pressed }) => [
                  styles.taskActionButton,
                  {
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <AppIcon
                  name="drag-indicator"
                  size={18}
                  color={canDragList ? theme.text : theme.muted}
                />
              </Pressable>
              <View
                style={[
                  styles.drawerListSwatch,
                  {
                    backgroundColor: item.background,
                    borderColor: theme.border,
                  },
                ]}
              />
              <View style={styles.drawerListItemText}>
                <Text
                  style={[styles.drawerListItemName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.name || t("app.taskListName")}
                </Text>
                <Text
                  style={[styles.drawerListItemCount, { color: theme.muted }]}
                >
                  {t("taskList.taskCount", {
                    count: item.tasks.length,
                  })}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </>
  );

  const taskListContent =
    stableTaskLists.length > 0 ? (
      <Carousel
        style={{ flex: 1 }}
        setApi={setTaskListCarouselApi}
        onSelect={handleCarouselSelect}
        opts={{
          enabled: !isReorderingTasks && !isReorderHandleActive,
          loop: false,
          onConfigurePanGesture: (gesture) => {
            "worklet";
            gesture.activeOffsetX([-12, 12]).failOffsetY([-6, 6]);
          },
        }}
      >
        <CarouselContent style={{ flex: 1 }}>
          {stableTaskLists.map((taskList) => {
            const isActive = taskList.id === selectedTaskListId;
            const listTasks =
              orderedTasksByListId[taskList.id] ?? taskList.tasks;
            const activeEditingTaskId = isActive ? editingTaskId : null;
            const activeEditingTaskText = isActive ? editingTaskText : "";
            const activeEditingTaskDate = isActive ? editingTaskDate : "";
            const activeNewTaskText = isActive ? newTaskText : "";

            return (
              <CarouselItem key={taskList.id}>
                <TaskListPanel
                  t={t}
                  theme={theme}
                  tasks={listTasks}
                  newTaskText={activeNewTaskText}
                  isAddingTask={isActive ? isAddingTask : false}
                  isUpdatingTask={isActive ? isUpdatingTask : false}
                  isReorderingTasks={!isActive || isReorderingTasks}
                  isSortingTasks={isActive ? isSortingTasks : false}
                  isDeletingCompletedTasks={
                    isActive ? isDeletingCompletedTasks : false
                  }
                  addDisabled={!isActive}
                  emptyLabel={t("pages.tasklist.noTasks")}
                  editingTaskId={activeEditingTaskId}
                  editingTaskText={activeEditingTaskText}
                  editingTaskDate={activeEditingTaskDate}
                  onEditingTaskTextChange={(value) => {
                    if (!isActive) return;
                    setEditingTaskText(value);
                  }}
                  onEditingTaskDateChange={(value) => {
                    if (!isActive) return;
                    setEditingTaskDate(value);
                  }}
                  onEditStart={(task) => {
                    if (!isActive) return;
                    handleEditStart(task);
                  }}
                  onEditEnd={(task) => {
                    if (!isActive) return;
                    void handleEditEnd(task);
                  }}
                  onDateChange={(task, nextDate) => {
                    if (!isActive) return;
                    return handleDateChange(task, nextDate);
                  }}
                  onChangeNewTaskText={(value) => {
                    if (!isActive) return;
                    onChangeNewTaskText(value);
                  }}
                  onAddTask={() => {
                    if (!isActive) return;
                    return onAddTask();
                  }}
                  onToggleTask={(task) => {
                    if (!isActive) return;
                    return onToggleTask(task);
                  }}
                  onReorderTask={(draggedTaskId, targetTaskId) => {
                    if (!isActive) return;
                    return onReorderTask(draggedTaskId, targetTaskId);
                  }}
                  onReorderPreview={(nextTasks) => {
                    if (!isActive) return;
                    setOrderedTasksByListId((prev) => ({
                      ...prev,
                      [taskList.id]: nextTasks,
                    }));
                  }}
                  onReorderHandlePressIn={() => {
                    if (!isActive) return;
                    setIsReorderHandleActive(true);
                  }}
                  onReorderHandlePressOut={() => {
                    if (!isActive) return;
                    setIsReorderHandleActive(false);
                  }}
                  onSortTasks={() => {
                    if (!isActive) return;
                    return onSortTasks();
                  }}
                  onDeleteCompletedTasks={() => {
                    if (!isActive) return;
                    return onDeleteCompletedTasks();
                  }}
                />
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    ) : (
      <TaskListPanel
        t={t}
        theme={theme}
        tasks={EMPTY_TASKS}
        newTaskText=""
        isAddingTask={false}
        isUpdatingTask={false}
        isReorderingTasks
        isSortingTasks={false}
        isDeletingCompletedTasks={false}
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

  if (isWideLayout) {
    return (
      <View style={styles.splitRoot}>
        <View
          style={[
            styles.splitSidebar,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.splitSidebarContent}>{drawerPanelContent}</View>
        </View>
        <View style={styles.splitMain}>
          <View style={[styles.appContent, { paddingBottom: 0 }]}>
            {taskListHeader}
          </View>
          {taskListContent}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.drawerRoot}>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <View style={[styles.appContent, { paddingBottom: 0 }]}>
          {taskListHeader}
        </View>
        {taskListContent}
        <DrawerContent
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          overlayProps={{ accessibilityLabel: t("common.close") }}
        >
          {drawerPanelContent}
        </DrawerContent>
      </Drawer>
    </View>
  );
};
