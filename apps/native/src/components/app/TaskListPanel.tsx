import type { TFunction } from "i18next";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import type { Task } from "@lightlist/sdk/types";

import { styles } from "../../styles/appStyles";
import type { Theme } from "../../styles/theme";

type TaskListPanelProps = {
  t: TFunction;
  theme: Theme;
  tasks: Task[];
  newTaskText: string;
  taskListError?: string | null;
  isAddingTask: boolean;
  isUpdatingTask: boolean;
  isReorderingTasks: boolean;
  isSortingTasks: boolean;
  isDeletingCompletedTasks: boolean;
  addDisabled?: boolean;
  emptyLabel: string;
  editingTaskId: string | null;
  editingTaskText: string;
  editingTaskDate: string;
  onEditingTaskTextChange: (value: string) => void;
  onEditingTaskDateChange: (value: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task) => void;
  onChangeNewTaskText: (value: string) => void;
  onAddTask: () => void | Promise<void>;
  onToggleTask: (task: Task) => void | Promise<void>;
  onReorderTask: (
    draggedTaskId: string,
    targetTaskId: string,
  ) => void | Promise<void>;
  onReorderPreview?: (nextTasks: Task[]) => void;
  onSortTasks: () => void | Promise<void>;
  onDeleteCompletedTasks: () => void | Promise<void>;
  onReorderHandlePressIn?: () => void;
  onReorderHandlePressOut?: () => void;
};

export const TaskListPanel = ({
  t,
  theme,
  tasks,
  newTaskText,
  taskListError,
  isAddingTask,
  isUpdatingTask,
  isReorderingTasks,
  isSortingTasks,
  isDeletingCompletedTasks,
  addDisabled = false,
  emptyLabel,
  editingTaskId,
  editingTaskText,
  editingTaskDate,
  onEditingTaskTextChange,
  onEditingTaskDateChange,
  onEditStart,
  onEditEnd,
  onChangeNewTaskText,
  onAddTask,
  onToggleTask,
  onReorderTask,
  onReorderPreview,
  onSortTasks,
  onDeleteCompletedTasks,
  onReorderHandlePressIn,
  onReorderHandlePressOut,
}: TaskListPanelProps) => {
  const inputDisabled = addDisabled || isAddingTask;
  const canAddTask = !inputDisabled && newTaskText.trim().length > 0;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const canSortTasks = tasks.length > 1 && !isSortingTasks;
  const canDeleteCompletedTasks =
    completedTasksCount > 0 && !isDeletingCompletedTasks;

  const confirmDeleteCompletedTasks = () => {
    if (completedTasksCount === 0) return;
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

  const listHeader = (
    <View style={styles.section}>
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
            {isSortingTasks ? t("common.loading") : t("pages.tasklist.sort")}
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
                color: canDeleteCompletedTasks ? theme.error : theme.muted,
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
          onSubmitEditing={() => {
            if (!canAddTask) return;
            void onAddTask();
          }}
          editable={!inputDisabled}
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
              backgroundColor: canAddTask ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: canAddTask ? theme.primaryText : theme.muted },
            ]}
          >
            {t("taskList.addTask")}
          </Text>
        </Pressable>
      </View>
      {taskListError ? (
        <Text style={[styles.error, { color: theme.error }]}>
          {taskListError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <DraggableFlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      activationDistance={8}
      onDragEnd={({ data, from, to }) => {
        onReorderPreview?.(data);
        if (isReorderingTasks) return;
        const draggedTask = tasks[from];
        const targetTask = tasks[to];
        if (!draggedTask || !targetTask || from === to) return;
        void onReorderTask(draggedTask.id, targetTask.id);
      }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.appContent}
      ItemSeparatorComponent={() => (
        <View
          style={[styles.taskSeparator, { backgroundColor: theme.border }]}
        />
      )}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        emptyLabel ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {emptyLabel}
          </Text>
        ) : null
      }
      renderItem={({
        item,
        drag,
        isActive,
        getIndex,
      }: RenderItemParams<Task>) => {
        const isEditing = editingTaskId === item.id;
        const currentIndex =
          getIndex() ?? tasks.findIndex((task) => task.id === item.id);
        const canDragTask =
          !isEditing && !isReorderingTasks && tasks.length > 1;
        const canMoveTaskUp = canDragTask && currentIndex > 0;
        const canMoveTaskDown =
          canDragTask && currentIndex >= 0 && currentIndex < tasks.length - 1;
        const accessibilityActions: { name: string; label: string }[] = [];

        if (canMoveTaskUp) {
          accessibilityActions.push({
            name: "moveUp",
            label: t("app.moveUp"),
          });
        }
        if (canMoveTaskDown) {
          accessibilityActions.push({
            name: "moveDown",
            label: t("app.moveDown"),
          });
        }

        const handleMoveTaskByOffset = (offset: number) => {
          if (!canDragTask || currentIndex < 0) return;
          const targetTask = tasks[currentIndex + offset];
          if (!targetTask) return;
          void onReorderTask(item.id, targetTask.id);
        };

        return (
          <View style={[styles.taskItem, isActive && { opacity: 0.7 }]}>
            <View style={styles.taskRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.reorder")}
                accessibilityActions={accessibilityActions}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === "moveUp") {
                    handleMoveTaskByOffset(-1);
                    return;
                  }
                  if (event.nativeEvent.actionName === "moveDown") {
                    handleMoveTaskByOffset(1);
                  }
                }}
                onLongPress={canDragTask ? drag : undefined}
                onPressIn={onReorderHandlePressIn}
                onPressOut={onReorderHandlePressOut}
                delayLongPress={150}
                disabled={!canDragTask}
                style={({ pressed }) => [
                  styles.taskActionButton,
                  {
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather
                  name="menu"
                  size={18}
                  color={canDragTask ? theme.text : theme.muted}
                />
              </Pressable>
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
                    onChangeText={onEditingTaskTextChange}
                    placeholder={t("taskList.addTaskPlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void onEditEnd(item);
                    }}
                    onBlur={() => {
                      void onEditEnd(item);
                    }}
                    editable={!isUpdatingTask}
                    accessibilityLabel={t("taskList.editTask")}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("taskList.editTask")}
                    onPress={() => onEditStart(item)}
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
                  onChangeText={onEditingTaskDateChange}
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
          </View>
        );
      }}
    />
  );
};
