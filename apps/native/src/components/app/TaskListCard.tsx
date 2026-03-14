import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Gesture } from "react-native-gesture-handler";
import { AppIcon } from "../ui/AppIcon";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ReorderableList, {
  type ReorderableListDragEndEvent,
  type ReorderableListDragStartEvent,
  type ReorderableListRenderItem,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";
import { runOnJS } from "react-native-reanimated";
import type { Task, TaskList } from "@lightlist/sdk/types";
import {
  addTask,
  deleteCompletedTasks,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
  sortTasks,
  updateTask,
  updateTaskList,
  updateTasksOrder,
} from "@lightlist/sdk/mutations/app";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";
import { formatDate, parseISODate } from "@lightlist/sdk/utils/dateParser";

import { Dialog } from "../ui/Dialog";
import { resolveErrorMessage } from "@lightlist/sdk/utils/errors";
import {
  logTaskAdd,
  logTaskUpdate,
  logTaskReorder,
  logTaskSort,
  logTaskDeleteCompleted,
  logTaskListDelete,
  logShareCodeGenerate,
  logShareCodeRemove,
} from "@lightlist/sdk/analytics";
import { TaskItem } from "./TaskItem";
import { listColors } from "../../styles/theme";
import { useAppDirection } from "../../context/appDirection";

type TaskListCardProps = {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  onSortingChange?: (sorting: boolean) => void;
  onDeleted?: () => void;
};

export const TaskListCard = ({
  taskList,
  isActive,
  onSortingChange,
  onDeleted,
}: TaskListCardProps) => {
  const { t } = useTranslation();
  const uiDirection = useAppDirection();
  const [isTaskDragActive, setIsTaskDragActive] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    taskList.tasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
    {
      suspendExternalSync: isTaskDragActive,
    },
  );
  const [newTaskText, setNewTaskText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const addButtonVisibility = useRef(new Animated.Value(0)).current;
  const addTaskInputRef = useRef<TextInput | null>(null);
  const historyCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const panGesture = useMemo(
    () => Gesture.Pan().activeOffsetY([-12, 12]).failOffsetX([-24, 24]),
    [],
  );

  const { tasksById, completedTaskCount } = useMemo(() => {
    const nextTasksById: Record<string, Task> = {};
    let nextCompletedTaskCount = 0;
    tasks.forEach((task) => {
      nextTasksById[task.id] = task;
      if (task.completed) {
        nextCompletedTaskCount += 1;
      }
    });
    return {
      tasksById: nextTasksById,
      completedTaskCount: nextCompletedTaskCount,
    };
  }, [tasks]);

  // Edit dialog state
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [editListName, setEditListName] = useState(taskList.name);
  const [editListBackground, setEditListBackground] = useState<string | null>(
    taskList.background,
  );
  const [isSavingList, setIsSavingList] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGeneratingShareCode, setIsGeneratingShareCode] = useState(false);
  const [isRemovingShareCode, setIsRemovingShareCode] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const shareCode = taskList.shareCode ?? null;

  useEffect(() => {
    if (!isActive) {
      setEditingTaskId(null);
      setEditingTaskText("");
      setEditingTaskDate("");
      setNewTaskText("");
      setTaskError(null);
      setAddTaskError(null);
      setHistoryOpen(false);
      setIsAddInputFocused(false);
      setIsTaskDragActive(false);
      setDraggingTaskId(null);
    }
  }, [isActive]);

  useEffect(() => {
    onSortingChange?.(isTaskDragActive);
  }, [isTaskDragActive, onSortingChange]);

  useEffect(() => {
    return () => {
      onSortingChange?.(false);
    };
  }, [onSortingChange]);

  useEffect(() => {
    return () => {
      if (historyCloseTimeoutRef.current) {
        clearTimeout(historyCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    Animated.timing(addButtonVisibility, {
      toValue: isAddInputFocused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [addButtonVisibility, isAddInputFocused]);

  const canSortTasks = tasks.length > 1;
  const canDeleteCompletedTasks = completedTaskCount > 0;
  const canDragTask = tasks.length > 1;
  const canAddTask = newTaskText.trim().length > 0;

  const dateLabel = t("pages.tasklist.setDate");
  const clearDateLabel = t("pages.tasklist.clearDate");
  const closeLabel = t("common.close");
  const isIos = Platform.OS === "ios";

  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());

  const datePickerTask = datePickerTaskId
    ? (tasksById[datePickerTaskId] ?? null)
    : null;
  const datePickerOpen = isIos && Boolean(datePickerTask);
  const currentDateValue = datePickerTask
    ? editingTaskId === datePickerTask.id
      ? editingTaskDate
      : (datePickerTask.date ?? "")
    : "";
  const canClearDate = currentDateValue.trim().length > 0;

  const runTaskMutation = useCallback(
    async ({
      task,
      updates,
    }: {
      task: Task;
      updates: Partial<Task>;
    }): Promise<boolean> => {
      setTaskError(null);
      try {
        await updateTask(taskList.id, task.id, updates);
        return true;
      } catch (error) {
        setTaskError(resolveErrorMessage(error, t, "common.error"));
        return false;
      }
    },
    [taskList.id, t],
  );

  const applyDateChange = useCallback(
    (task: Task, nextDate: string) => {
      const normalizedDate = nextDate.trim();
      if (editingTaskId === task.id) {
        setEditingTaskDate(normalizedDate);
      }
      if (normalizedDate === (task.date ?? "")) return;
      void runTaskMutation({
        task,
        updates: { date: normalizedDate },
      });
    },
    [editingTaskId, runTaskMutation],
  );

  const closeDatePicker = () => {
    setDatePickerTaskId(null);
  };

  const openDatePicker = useCallback(
    (task: Task) => {
      const sourceDate =
        editingTaskId === task.id ? editingTaskDate : (task.date ?? "");
      const parsedDate = parseISODate(sourceDate) ?? new Date();
      if (!isIos) {
        const canClear = sourceDate.trim().length > 0;
        DateTimePickerAndroid.open({
          value: parsedDate,
          mode: "date",
          onChange: (event, selectedDate) => {
            if (event.type === "neutralButtonPressed") {
              applyDateChange(task, "");
              return;
            }
            if (event.type === "dismissed") return;
            if (!selectedDate) return;
            applyDateChange(task, formatDate(selectedDate));
          },
          ...(canClear ? { neutralButtonLabel: clearDateLabel } : {}),
        });
        return;
      }
      setDatePickerValue(parsedDate);
      setDatePickerTaskId(task.id);
    },
    [editingTaskId, editingTaskDate, isIos, applyDateChange, clearDateLabel],
  );

  const handleDatePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (!datePickerTask) return;
    if (event.type === "dismissed") {
      closeDatePicker();
      return;
    }
    if (event.type === "neutralButtonPressed") {
      applyDateChange(datePickerTask, "");
      closeDatePicker();
      return;
    }
    if (!selectedDate) return;
    setDatePickerValue(selectedDate);
    applyDateChange(datePickerTask, formatDate(selectedDate));
  };

  const handleClearDate = () => {
    if (!datePickerTask) {
      closeDatePicker();
      return;
    }
    applyDateChange(datePickerTask, "");
    closeDatePicker();
  };

  const handleAddTask = async (text?: string) => {
    const trimmedText = (text ?? newTaskText).trim();
    if (!trimmedText) return;

    setNewTaskText("");
    setAddTaskError(null);
    setTaskError(null);

    try {
      await addTask(taskList.id, trimmedText);
      logTaskAdd({ has_date: false });
    } catch (error) {
      setNewTaskText(trimmedText);
      setAddTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const historySuggestions = taskList.history;
  const historyOptions = useMemo(() => {
    const input = newTaskText.trim();
    if (!historySuggestions || historySuggestions.length === 0) return [];
    if (input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const seen = new Set<string>();
    const options: string[] = [];

    for (const candidate of historySuggestions) {
      const option = candidate.trim();
      if (!option) continue;

      const optionLower = option.toLowerCase();
      if (optionLower === inputLower) continue;
      if (!optionLower.includes(inputLower)) continue;
      if (seen.has(optionLower)) continue;

      seen.add(optionLower);
      options.push(option);
      if (options.length >= 20) break;
    }

    return options;
  }, [historySuggestions, newTaskText]);

  useEffect(() => {
    if (historyOptions.length === 0) {
      setHistoryOpen(false);
    }
  }, [historyOptions.length]);

  const handleEditStartTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskDate(task.date ?? "");
  }, []);

  const handleEditEndTask = useCallback(
    async (task: Task, text?: string) => {
      if (editingTaskId !== task.id) return;

      const currentTask = tasksById[task.id];
      if (!currentTask) {
        setEditingTaskId(null);
        return;
      }

      const trimmedText = (text ?? editingTaskText).trim();
      if (!trimmedText) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }

      const normalizedDate = editingTaskDate.trim();
      if (
        trimmedText === currentTask.text &&
        normalizedDate === (currentTask.date ?? "")
      ) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        return;
      }

      const changedFields: string[] = [];
      if (trimmedText !== currentTask.text) changedFields.push("text");
      if (normalizedDate !== (currentTask.date ?? ""))
        changedFields.push("date");
      const isUpdated = await runTaskMutation({
        task: currentTask,
        updates: {
          text: trimmedText,
          date: normalizedDate,
        },
      });
      if (isUpdated) {
        setEditingTaskId(null);
        setEditingTaskText("");
        setEditingTaskDate("");
        if (changedFields.length > 0) {
          logTaskUpdate({ fields: changedFields.join(",") });
        }
      }
    },
    [
      editingTaskId,
      editingTaskText,
      editingTaskDate,
      tasksById,
      runTaskMutation,
    ],
  );

  const handleTaskDateChange = useCallback(
    (taskId: string, _date: string) => {
      const task = tasksById[taskId];
      if (!task) return;
      openDatePicker(task);
    },
    [openDatePicker, tasksById],
  );

  const handleToggleTask = useCallback(
    async (task: Task) => {
      const isUpdated = await runTaskMutation({
        task,
        updates: {
          completed: !task.completed,
        },
      });
      if (isUpdated) {
        logTaskUpdate({ fields: "completed" });
      }
    },
    [runTaskMutation],
  );

  const handleSortTasks = async () => {
    setTaskError(null);
    try {
      await sortTasks(taskList.id);
      logTaskSort();
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    setTaskError(null);
    try {
      const count = completedTaskCount;
      await deleteCompletedTasks(taskList.id);
      logTaskDeleteCompleted({ count });
    } catch (error) {
      setTaskError(resolveErrorMessage(error, t, "common.error"));
    }
  };

  const confirmDeleteCompletedTasks = () => {
    if (completedTaskCount === 0) return;
    Alert.alert(
      t("pages.tasklist.deleteCompleted"),
      t("pages.tasklist.deleteCompletedConfirm", {
        count: completedTaskCount,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void handleDeleteCompletedTasks();
          },
        },
      ],
    );
  };

  const handleReorderTask = useCallback(
    async (draggedTaskId: string, targetTaskId: string) => {
      setTaskError(null);
      try {
        await reorderTask(draggedTaskId, targetTaskId);
        setIsTaskDragActive(false);
        logTaskReorder();
      } catch (error) {
        setIsTaskDragActive(false);
        setTaskError(resolveErrorMessage(error, t, "common.error"));
      }
    },
    [reorderTask, t],
  );

  const handleTaskDragStart = useCallback(
    (index: number) => {
      setIsTaskDragActive(true);
      const draggedTask = tasks[index];
      setDraggingTaskId(draggedTask?.id ?? null);
    },
    [tasks],
  );

  const handleTaskDragEnd = useCallback((from: number, to: number) => {
    setDraggingTaskId(null);
    if (from === to) {
      setIsTaskDragActive(false);
    }
  }, []);

  const onTaskDragStart = useCallback(
    (event: ReorderableListDragStartEvent) => {
      "worklet";
      runOnJS(handleTaskDragStart)(event.index);
    },
    [handleTaskDragStart],
  );

  const onTaskDragEnd = useCallback(
    (event: ReorderableListDragEndEvent) => {
      "worklet";
      runOnJS(handleTaskDragEnd)(event.from, event.to);
    },
    [handleTaskDragEnd],
  );

  const handleTaskReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (from === to) return;
      const draggedTask = tasks[from];
      const targetTask = tasks[to];
      if (!draggedTask || !targetTask) {
        setIsTaskDragActive(false);
        return;
      }
      void handleReorderTask(draggedTask.id, targetTask.id);
    },
    [handleReorderTask, tasks],
  );

  const handleSaveList = async () => {
    const trimmedName = editListName.trim();
    if (!trimmedName) return;
    setIsSavingList(true);
    setEditError(null);
    try {
      await updateTaskList(taskList.id, {
        name: trimmedName,
        background: editListBackground,
      });
      setIsEditListDialogOpen(false);
    } catch (error) {
      setEditError(resolveErrorMessage(error, t, "common.error"));
    } finally {
      setIsSavingList(false);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(t("taskList.deleteList"), t("taskList.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("taskList.deleteList"),
        style: "destructive",
        onPress: async () => {
          setIsDeletingList(true);
          try {
            await deleteTaskList(taskList.id);
            setIsEditListDialogOpen(false);
            onDeleted?.();
            logTaskListDelete();
          } catch (error) {
            setEditError(resolveErrorMessage(error, t, "common.error"));
          } finally {
            setIsDeletingList(false);
          }
        },
      },
    ]);
  };

  const handleGenerateShareCode = async () => {
    setIsGeneratingShareCode(true);
    setShareError(null);
    try {
      await generateShareCode(taskList.id);
      logShareCodeGenerate();
    } catch (error) {
      setShareError(resolveErrorMessage(error, t, "common.error"));
    } finally {
      setIsGeneratingShareCode(false);
    }
  };

  const handleRemoveShareCode = async () => {
    setIsRemovingShareCode(true);
    setShareError(null);
    try {
      await removeShareCode(taskList.id);
      logShareCodeRemove();
    } catch (error) {
      setShareError(resolveErrorMessage(error, t, "common.error"));
    } finally {
      setIsRemovingShareCode(false);
    }
  };

  const canSaveList = !isSavingList && editListName.trim().length > 0;

  const renderItem = useCallback<ReorderableListRenderItem<Task>>(
    ({ item, index }) => {
      const isEditing = editingTaskId === item.id;
      const currentIndex = index;
      const canMoveTaskUp = canDragTask && currentIndex > 0;
      const canMoveTaskDown =
        canDragTask && currentIndex >= 0 && currentIndex < tasks.length - 1;

      const handleMoveTaskByOffset = (offset: number) => {
        if (!canDragTask || currentIndex < 0) return;
        const targetTask = tasks[currentIndex + offset];
        if (!targetTask) return;
        void handleReorderTask(item.id, targetTask.id);
      };

      return (
        <TaskItem
          task={item}
          isEditing={isEditing}
          editingText={isEditing ? editingTaskText : ""}
          onEditingTextChange={setEditingTaskText}
          onEditStart={handleEditStartTask}
          onEditEnd={handleEditEndTask}
          onToggle={handleToggleTask}
          onDateChange={handleTaskDateChange}
          editingDate={isEditing ? editingTaskDate : ""}
          isDragActive={draggingTaskId === item.id}
          canDrag={canDragTask}
          canMoveUp={canMoveTaskUp}
          canMoveDown={canMoveTaskDown}
          onMoveUp={() => handleMoveTaskByOffset(-1)}
          onMoveDown={() => handleMoveTaskByOffset(1)}
        />
      );
    },
    [
      editingTaskId,
      tasks,
      draggingTaskId,
      canDragTask,
      editingTaskText,
      editingTaskDate,
      handleEditStartTask,
      handleEditEndTask,
      handleToggleTask,
      handleTaskDateChange,
      handleReorderTask,
    ],
  );

  const datePickerFooter = (
    <>
      {canClearDate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearDateLabel}
          onPress={handleClearDate}
          className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center"
        >
          <Text className="text-[15px] font-inter-semibold text-muted dark:text-muted-dark">
            {clearDateLabel}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={closeDatePicker}
        className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center"
      >
        <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
          {closeLabel}
        </Text>
      </Pressable>
    </>
  );

  const header = (
    <View className="flex-row items-center justify-between gap-3 mb-4">
      <Text
        className="text-xl font-inter-semibold text-text dark:text-text-dark flex-1"
        numberOfLines={1}
      >
        {taskList.name}
      </Text>
      <View className="flex-row items-center justify-end flex-wrap gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("taskList.editDetails")}
          onPress={() => {
            setEditListName(taskList.name);
            setEditListBackground(taskList.background);
            setEditError(null);
            setIsEditListDialogOpen(true);
          }}
          className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
        >
          <AppIcon name="edit" className="fill-text dark:fill-text-dark" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("taskList.shareTitle")}
          onPress={() => {
            setShareError(null);
            setIsShareDialogOpen(true);
          }}
          className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
        >
          <AppIcon name="share" className="fill-text dark:fill-text-dark" />
        </Pressable>
      </View>
    </View>
  );

  const addButtonAnimatedStyle = {
    opacity: addButtonVisibility,
    width: addButtonVisibility.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 48],
    }),
    marginStart: addButtonVisibility.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
    transform: [
      {
        translateX: addButtonVisibility.interpolate({
          inputRange: [0, 1],
          outputRange: [uiDirection === "rtl" ? -8 : 8, 0],
        }),
      },
    ],
  };

  const listHeader = (
    <View className="mb-6">
      {header}
      <View className="flex-row items-center mb-4">
        <TextInput
          ref={addTaskInputRef}
          className="flex-1 rounded-[12px] border border-border dark:border-border-dark px-3 py-2 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
          value={newTaskText}
          onChangeText={(value) => {
            setNewTaskText(value);
            setAddTaskError(null);
            setHistoryOpen(true);
          }}
          placeholder={t("pages.tasklist.addTaskPlaceholder")}
          placeholderClassName="text-placeholder dark:text-placeholder-dark"
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            setHistoryOpen(false);
            void handleAddTask();
          }}
          onFocus={() => {
            if (historyCloseTimeoutRef.current) {
              clearTimeout(historyCloseTimeoutRef.current);
              historyCloseTimeoutRef.current = null;
            }
            setIsAddInputFocused(true);
            setHistoryOpen(true);
          }}
          onBlur={() => {
            setIsAddInputFocused(false);
            if (historyCloseTimeoutRef.current) {
              clearTimeout(historyCloseTimeoutRef.current);
            }
            historyCloseTimeoutRef.current = setTimeout(() => {
              setHistoryOpen(false);
              historyCloseTimeoutRef.current = null;
            }, 120);
          }}
          editable={isActive}
          accessibilityLabel={t("pages.tasklist.addTaskPlaceholder")}
        />
        <Animated.View style={[addButtonAnimatedStyle, { overflow: "hidden" }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("taskList.addTask")}
            onPress={() => {
              void handleAddTask();
            }}
            disabled={!canAddTask || !isAddInputFocused}
            className="p-2.5 items-center justify-center active:opacity-90"
          >
            <AppIcon
              name="send"
              className={
                canAddTask
                  ? "fill-text dark:fill-text-dark"
                  : "fill-muted dark:fill-muted-dark"
              }
            />
          </Pressable>
        </Animated.View>
      </View>
      {historyOpen && historyOptions.length > 0 ? (
        <View className="mb-2 overflow-hidden rounded-[12px] border border-border bg-surface dark:border-border-dark dark:bg-surface-dark">
          {historyOptions.map((text, index) => (
            <Pressable
              key={text}
              accessibilityRole="button"
              accessibilityLabel={text}
              onPress={() => {
                if (historyCloseTimeoutRef.current) {
                  clearTimeout(historyCloseTimeoutRef.current);
                  historyCloseTimeoutRef.current = null;
                }
                setHistoryOpen(false);
                addTaskInputRef.current?.focus();
                void handleAddTask(text);
              }}
              className={`px-3 py-3 active:opacity-90 ${
                index > 0
                  ? "border-t border-border dark:border-border-dark"
                  : ""
              }`}
            >
              <Text
                className="text-[15px] font-inter text-text dark:text-text-dark"
                numberOfLines={1}
              >
                {text}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {addTaskError ? (
        <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
          {addTaskError}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.sort")}
          onPress={handleSortTasks}
          disabled={!canSortTasks}
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 active:opacity-90"
        >
          <AppIcon
            name="sort"
            className={
              canSortTasks
                ? "fill-text dark:fill-text-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
          <Text
            className={`text-[15px] font-inter-semibold ${
              canSortTasks
                ? "text-text dark:text-text-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {t("pages.tasklist.sort")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.tasklist.deleteCompleted")}
          onPress={confirmDeleteCompletedTasks}
          disabled={!canDeleteCompletedTasks}
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 active:opacity-90"
        >
          <Text
            className={`text-[15px] font-inter-semibold ${
              canDeleteCompletedTasks
                ? "text-error dark:text-error-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {t("pages.tasklist.deleteCompleted")}
          </Text>
          <AppIcon
            name="delete"
            className={
              canDeleteCompletedTasks
                ? "fill-error dark:fill-error-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
        </Pressable>
      </View>
      {taskError ? (
        <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
          {taskError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      <Dialog
        open={datePickerOpen}
        onOpenChange={(open) => {
          if (!open) closeDatePicker();
        }}
        title={dateLabel}
        footer={datePickerFooter}
      >
        {datePickerOpen ? (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleDatePickerChange}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={isEditListDialogOpen}
        onOpenChange={(open) => {
          setIsEditListDialogOpen(open);
          if (!open) setEditError(null);
        }}
        title={t("taskList.editDetails")}
        footer={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
              onPress={() => setIsEditListDialogOpen(false)}
              className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
            >
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("common.cancel")}
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
                    ? "text-primaryText dark:text-primaryText-dark"
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
          {editError ? (
            <Text className="text-[13px] font-inter text-error dark:text-error-dark">
              {editError}
            </Text>
          ) : null}
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
            onPress={handleDeleteList}
            disabled={isDeletingList}
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
        onOpenChange={(open) => {
          setIsShareDialogOpen(open);
          if (!open) setShareError(null);
        }}
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
                    : "text-primaryText dark:text-primaryText-dark"
                }`}
              >
                {isGeneratingShareCode
                  ? t("common.loading")
                  : t("taskList.generateShare")}
              </Text>
            </Pressable>
          )}
          {shareError ? (
            <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
              {shareError}
            </Text>
          ) : null}
        </View>
      </Dialog>

      <View
        style={{ flex: 1, backgroundColor: taskList.background ?? undefined }}
      >
        <ReorderableList
          data={tasks}
          keyExtractor={(item) => item.id}
          onReorder={handleTaskReorder}
          onDragStart={onTaskDragStart}
          onDragEnd={onTaskDragEnd}
          panGesture={panGesture}
          dragEnabled={canDragTask}
          shouldUpdateActiveItem
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24,
            maxWidth: 768,
            width: "100%",
            alignSelf: "center",
          }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text className="text-[15px] font-inter text-muted dark:text-muted-dark">
              {t("pages.tasklist.noTasks")}
            </Text>
          }
          renderItem={renderItem}
        />
      </View>
    </>
  );
};
