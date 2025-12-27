import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { styles } from "../appStyles";
import { Dialog } from "../components/Dialog";
import { listColors, type Theme } from "../theme";

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
  onConfirmDeleteTask: (task: Task) => void;
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
  onConfirmDeleteTask,
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
  const canAddTask =
    Boolean(selectedTaskList) && !isAddingTask && newTaskText.trim().length > 0;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const canSortTasks = tasks.length > 1 && !isSortingTasks;
  const canDeleteCompletedTasks =
    completedTasksCount > 0 && !isDeletingCompletedTasks;
  const selectedTaskListIndex =
    selectedTaskListId === null
      ? -1
      : taskLists.findIndex((list) => list.id === selectedTaskListId);
  const canMoveTaskListUp = selectedTaskListIndex > 0 && !isReorderingTaskLists;
  const canMoveTaskListDown =
    selectedTaskListIndex >= 0 &&
    selectedTaskListIndex < taskLists.length - 1 &&
    !isReorderingTaskLists;

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

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDate("");
  };

  const handleSaveTask = async () => {
    if (!editingTaskId) return;
    const trimmedText = editingTaskText.trim();
    if (!trimmedText) return;
    const normalizedDate = editingTaskDate.trim();
    await onUpdateTask(editingTaskId, {
      text: trimmedText,
      date: normalizedDate,
    });
    cancelEditTask();
  };

  const confirmDeleteCompletedTasks = () => {
    if (!selectedTaskList || completedTasksCount === 0) return;
    Alert.alert(
      t("pages.tasklist.deleteCompleted"),
      t("pages.tasklist.deleteCompletedConfirm", {
        count: completedTasksCount,
      }),
      [
        { text: t("app.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void onDeleteCompletedTasks();
          },
        },
      ],
    );
  };

  const handleMoveTaskListUp = () => {
    if (!selectedTaskListId || !canMoveTaskListUp) return;
    const target = taskLists[selectedTaskListIndex - 1];
    if (!target) return;
    void onReorderTaskList(selectedTaskListId, target.id);
  };

  const handleMoveTaskListDown = () => {
    if (!selectedTaskListId || !canMoveTaskListDown) return;
    const target = taskLists[selectedTaskListIndex + 1];
    if (!target) return;
    void onReorderTaskList(selectedTaskListId, target.id);
  };

  const handleCreateListDialogChange = (open: boolean) => {
    setIsCreateListDialogOpen(open);
    if (!open) {
      onChangeCreateListName("");
      onChangeCreateListBackground(listColors[0]);
    }
  };

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    const created = await onCreateList();
    if (created) {
      handleCreateListDialogChange(false);
    }
  };

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.appContent}
      ItemSeparatorComponent={() => (
        <View
          style={[styles.taskSeparator, { backgroundColor: theme.border }]}
        />
      )}
      ListHeaderComponent={
        <View>
          <View style={styles.appHeader}>
            <View style={styles.appTitleRow}>
              <View>
                <Text style={[styles.appTitle, { color: theme.text }]}>
                  {t("app.title")}
                </Text>
                {userEmail ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.appSubtitle, { color: theme.muted }]}
                  >
                    {t("status.signedInAs", { email: userEmail })}
                  </Text>
                ) : null}
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("settings.title")}
                  onPress={onOpenSettings}
                  style={({ pressed }) => [
                    styles.headerButton,
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.headerButtonText, { color: theme.text }]}
                  >
                    {t("settings.title")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("pages.sharecode.title")}
                  onPress={onOpenShareCode}
                  style={({ pressed }) => [
                    styles.headerButton,
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.headerButtonText, { color: theme.text }]}
                  >
                    {t("pages.sharecode.title")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.signOut")}
                  onPress={onConfirmSignOut}
                  style={({ pressed }) => [
                    styles.headerButton,
                    {
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.headerButtonText, { color: theme.text }]}
                  >
                    {t("app.signOut")}
                  </Text>
                </Pressable>
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
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("app.title")}
            </Text>
            {taskLists.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                {t("app.emptyState")}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listScroll}
              >
                {taskLists.map((list) => {
                  const isSelected = list.id === selectedTaskListId;
                  return (
                    <Pressable
                      key={list.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onSelectTaskList(list.id)}
                      style={({ pressed }) => [
                        styles.taskListItem,
                        {
                          backgroundColor: list.background,
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.taskListName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {list.name || t("app.taskListName")}
                      </Text>
                      <Text
                        style={[styles.taskListCount, { color: theme.muted }]}
                      >
                        {t("taskList.taskCount", { count: list.tasks.length })}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
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
          {selectedTaskList ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t("taskList.editDetails")}
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.moveUp")}
                  onPress={handleMoveTaskListUp}
                  disabled={!canMoveTaskListUp}
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
                      { color: canMoveTaskListUp ? theme.text : theme.muted },
                    ]}
                  >
                    {t("app.moveUp")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.moveDown")}
                  onPress={handleMoveTaskListDown}
                  disabled={!canMoveTaskListDown}
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
                      { color: canMoveTaskListDown ? theme.text : theme.muted },
                    ]}
                  >
                    {t("app.moveDown")}
                  </Text>
                </Pressable>
              </View>
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
                <View style={styles.buttonRow}>
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.deleteList")}
                    onPress={onConfirmDeleteList}
                    disabled={!canDeleteList}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        flex: 1,
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
                      {t("taskList.deleteList")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
          {selectedTaskList ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t("taskList.shareTitle")}
              </Text>
              <Text style={[styles.helpText, { color: theme.muted }]}>
                {t("taskList.shareDescription")}
              </Text>
              {shareCode ? (
                <View style={styles.form}>
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
                </View>
              ) : (
                <View style={styles.form}>
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
                </View>
              )}
              {shareErrorMessage ? (
                <Text style={[styles.appError, { color: theme.error }]}>
                  {shareErrorMessage}
                </Text>
              ) : null}
            </View>
          ) : null}
          {selectedTaskList ? (
            <View style={styles.section}>
              <View style={styles.taskHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {selectedTaskList.name || t("app.taskListName")}
                </Text>
                <Text style={[styles.taskCount, { color: theme.muted }]}>
                  {t("taskList.taskCount", {
                    count: selectedTaskList.tasks.length,
                  })}
                </Text>
              </View>
              <View style={styles.taskActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("pages.tasklist.sort")}
                  onPress={onSortTasks}
                  disabled={!canSortTasks}
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
                      { color: canSortTasks ? theme.text : theme.muted },
                    ]}
                  >
                    {isSortingTasks
                      ? t("common.loading")
                      : t("pages.tasklist.sort")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("pages.tasklist.deleteCompleted")}
                  onPress={confirmDeleteCompletedTasks}
                  disabled={!canDeleteCompletedTasks}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      flex: 1,
                      borderColor: theme.error,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color: canDeleteCompletedTasks
                          ? theme.error
                          : theme.muted,
                      },
                    ]}
                  >
                    {isDeletingCompletedTasks
                      ? t("common.loading")
                      : t("pages.tasklist.deleteCompleted")}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.taskInputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.taskInput,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    },
                  ]}
                  value={newTaskText}
                  onChangeText={onChangeNewTaskText}
                  placeholder={t("taskList.addTaskPlaceholder")}
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={onAddTask}
                  editable={!isAddingTask}
                  accessibilityLabel={t("taskList.addTaskPlaceholder")}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("taskList.addTask")}
                  onPress={onAddTask}
                  disabled={!canAddTask}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: canAddTask
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
                        color: canAddTask ? theme.primaryText : theme.muted,
                      },
                    ]}
                  >
                    {t("taskList.addTask")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        selectedTaskList ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("pages.tasklist.noTasks")}
          </Text>
        ) : null
      }
      renderItem={({ item, index }) => {
        const isEditing = editingTaskId === item.id;
        const canMoveTaskUp = !isEditing && !isReorderingTasks && index > 0;
        const canMoveTaskDown =
          !isEditing && !isReorderingTasks && index < tasks.length - 1;
        const canSaveTask =
          !isUpdatingTask && editingTaskText.trim().length > 0;

        const handleMoveTaskUp = () => {
          if (!canMoveTaskUp) return;
          const targetTask = tasks[index - 1];
          if (!targetTask) return;
          void onReorderTask(item.id, targetTask.id);
        };

        const handleMoveTaskDown = () => {
          if (!canMoveTaskDown) return;
          const targetTask = tasks[index + 1];
          if (!targetTask) return;
          void onReorderTask(item.id, targetTask.id);
        };

        return (
          <View style={styles.taskItem}>
            <View style={styles.taskRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.toggleComplete")}
                onPress={() => {
                  void onToggleTask(item);
                }}
                disabled={isEditing}
                style={[
                  styles.taskCheck,
                  {
                    borderColor: theme.border,
                    backgroundColor: item.completed
                      ? theme.primary
                      : "transparent",
                    opacity: isEditing ? 0.6 : 1,
                  },
                ]}
              />
              <View style={styles.taskContent}>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.input,
                      styles.taskEditInput,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.inputBackground,
                      },
                    ]}
                    value={editingTaskText}
                    onChangeText={setEditingTaskText}
                    placeholder={t("taskList.addTaskPlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveTask}
                    editable={!isUpdatingTask}
                    accessibilityLabel={t("taskList.editTask")}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.editTask")}
                    onPress={() => startEditTask(item)}
                    style={({ pressed }) => [
                      styles.taskTextButton,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskText,
                        { color: theme.text },
                        item.completed && styles.taskTextCompleted,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                )}
                {!isEditing && item.date ? (
                  <Text style={[styles.taskMetaText, { color: theme.muted }]}>
                    {item.date}
                  </Text>
                ) : null}
              </View>
              <View style={styles.taskActionColumn}>
                {isEditing ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.save")}
                    onPress={handleSaveTask}
                    disabled={!canSaveTask}
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
                        { color: canSaveTask ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.save")}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.moveUp")}
                    onPress={handleMoveTaskUp}
                    disabled={!canMoveTaskUp}
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
                        { color: canMoveTaskUp ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.moveUp")}
                    </Text>
                  </Pressable>
                )}
                {isEditing ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={cancelEditTask}
                    style={({ pressed }) => [
                      styles.taskActionButton,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.taskActionText, { color: theme.text }]}
                    >
                      {t("app.cancel")}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.moveDown")}
                    onPress={handleMoveTaskDown}
                    disabled={!canMoveTaskDown}
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
                        { color: canMoveTaskDown ? theme.text : theme.muted },
                      ]}
                    >
                      {t("app.moveDown")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
            {isEditing ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {t("pages.tasklist.setDate")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.taskEditInput,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    },
                  ]}
                  value={editingTaskDate}
                  onChangeText={setEditingTaskDate}
                  placeholder={t("pages.tasklist.setDate")}
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  editable={!isUpdatingTask}
                  accessibilityLabel={t("pages.tasklist.setDate")}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("taskList.deleteTask")}
              onPress={() => {
                onConfirmDeleteTask(item);
              }}
              style={({ pressed }) => [
                styles.taskDeleteButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.taskDeleteText, { color: theme.error }]}>
                {t("taskList.deleteTask")}
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
};
