import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { styles } from "../styles/appStyles";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/Drawer";
import { Dialog } from "../components/ui/Dialog";
import { TaskListPanel } from "../components/app/TaskListPanel";
import { listColors, type Theme } from "../styles/theme";

type TaskListScreenProps = {
  t: TFunction;
  theme: Theme;
  taskLists: TaskList[];
  selectedTaskList: TaskList | null;
  selectedTaskListId: string | null;
  tasks: Task[];
  userEmail: string;
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

export const TaskListScreen = ({
  t,
  theme,
  taskLists,
  selectedTaskList,
  selectedTaskListId,
  tasks,
  userEmail,
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
}: TaskListScreenProps) => {
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
  const [orderedTaskLists, setOrderedTaskLists] =
    useState<TaskList[]>(taskLists);
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");

  useEffect(() => {
    setOrderedTaskLists(taskLists);
  }, [taskLists]);

  useEffect(() => {
    setOrderedTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [selectedTaskListId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const exists = tasks.some((task) => task.id === editingTaskId);
    if (exists) return;
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  }, [editingTaskId, tasks]);

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

  const taskListHeader = (
    <View>
      <View style={styles.appHeader}>
        <View style={styles.appTitleRow}>
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
            <Feather name="menu" size={20} color={theme.text} />
          </DrawerTrigger>
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
                  <Feather name="edit-2" size={18} color={theme.text} />
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
                  <Feather name="share-2" size={18} color={theme.text} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
        {userEmail ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.appSubtitle, { color: theme.muted }]}
          >
            {t("status.signedInAs", { email: userEmail })}
          </Text>
        ) : null}
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

  return (
    <View style={styles.drawerRoot}>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <View style={[styles.appContent, { paddingBottom: 0 }]}>
          {taskListHeader}
        </View>
        <TaskListPanel
          t={t}
          theme={theme}
          tasks={orderedTasks}
          newTaskText={newTaskText}
          isAddingTask={isAddingTask}
          isUpdatingTask={isUpdatingTask}
          isReorderingTasks={isReorderingTasks}
          isSortingTasks={isSortingTasks}
          isDeletingCompletedTasks={isDeletingCompletedTasks}
          addDisabled={!selectedTaskList}
          emptyLabel={selectedTaskList ? t("pages.tasklist.noTasks") : ""}
          editingTaskId={editingTaskId}
          editingTaskText={editingTaskText}
          editingTaskDate={editingTaskDate}
          onEditingTaskTextChange={setEditingTaskText}
          onEditingTaskDateChange={setEditingTaskDate}
          onEditStart={handleEditStart}
          onEditEnd={handleEditEnd}
          onChangeNewTaskText={onChangeNewTaskText}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onReorderTask={onReorderTask}
          onReorderPreview={setOrderedTasks}
          onSortTasks={onSortTasks}
          onDeleteCompletedTasks={onDeleteCompletedTasks}
        />
        <DrawerContent
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          overlayProps={{ accessibilityLabel: t("common.close") }}
        >
          <DrawerHeader>
            <DrawerTitle style={{ color: theme.text }}>
              {t("app.drawerTitle")}
            </DrawerTitle>
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
          </DrawerHeader>
          {userEmail ? (
            <DrawerDescription style={{ color: theme.muted }}>
              {t("status.signedInAs", { email: userEmail })}
            </DrawerDescription>
          ) : null}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("app.signOut")}
            onPress={handleConfirmSignOutFromDrawer}
            style={({ pressed }) => [
              styles.drawerNavButton,
              {
                borderColor: theme.error,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.drawerNavText, { color: theme.error }]}>
              {t("app.signOut")}
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
            ListHeaderComponent={
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {t("app.createTaskList")}
                </Text>
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
                  <Text
                    style={[styles.buttonText, { color: theme.primaryText }]}
                  >
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
                              onPress={() =>
                                onChangeCreateListBackground(color)
                              }
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
              const accessibilityActions: { name: string; label: string }[] =
                [];

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
                      style={[
                        styles.drawerListItemCount,
                        { color: theme.muted },
                      ]}
                    >
                      {t("taskList.taskCount", {
                        count: item.tasks.length,
                      })}
                    </Text>
                  </View>
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
                    <Text
                      style={[
                        styles.taskActionText,
                        { color: canDragList ? theme.text : theme.muted },
                      ]}
                    >
                      {t("taskList.reorder")}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            }}
          />
        </DrawerContent>
      </Drawer>
    </View>
  );
};
