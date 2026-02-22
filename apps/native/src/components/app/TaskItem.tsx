import { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useReorderableDrag } from "react-native-reorderable-list";
import { parseISODate } from "@lightlist/sdk/utils/dateParser";
import { AppIcon } from "../ui/AppIcon";
import i18n from "../../utils/i18n";

interface TaskForSortable {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  order?: number;
}

interface TaskItemProps<T extends TaskForSortable = TaskForSortable> {
  task: T;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T, text?: string) => void;
  onToggle: (task: T) => void;
  onDateChange?: (taskId: string, date: string) => void;
  setDateLabel: string;
  dragHintLabel: string;
  editingDate?: string;
  isDragActive?: boolean;
  canDrag?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpLabel?: string;
  moveDownLabel?: string;
}

const formatDisplayDate = (dateString: string, language: string) => {
  const date = parseISODate(dateString);
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(date);
  } catch {
    return dateString;
  }
};

function TaskItemComponent<T extends TaskForSortable = TaskForSortable>({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDateChange,
  setDateLabel,
  dragHintLabel,
  editingDate,
  isDragActive = false,
  canDrag = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  moveUpLabel,
  moveDownLabel,
}: TaskItemProps<T>) {
  const drag = useReorderableDrag();
  const rawDateValue = isEditing ? (editingDate ?? "") : (task.date ?? "");
  const dateValue = rawDateValue.trim();
  const hasDate = dateValue.length > 0;
  const dateButtonLabel = hasDate
    ? `${setDateLabel}: ${dateValue}`
    : setDateLabel;

  const accessibilityActions: { name: string; label: string }[] = [];
  if (canMoveUp && onMoveUp && moveUpLabel) {
    accessibilityActions.push({
      name: "moveUp",
      label: moveUpLabel,
    });
  }
  if (canMoveDown && onMoveDown && moveDownLabel) {
    accessibilityActions.push({
      name: "moveDown",
      label: moveDownLabel,
    });
  }

  return (
    <View className={`gap-2 py-2 ${isDragActive ? "opacity-70" : ""}`}>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dragHintLabel}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "moveUp") {
              onMoveUp?.();
              return;
            }
            if (event.nativeEvent.actionName === "moveDown") {
              onMoveDown?.();
            }
          }}
          onPressIn={canDrag && !isEditing ? drag : undefined}
          disabled={!canDrag || isEditing}
          className="rounded-[10px] p-1 items-center justify-center active:opacity-80"
        >
          <View className="right-[5px]">
            <AppIcon
              name="drag-indicator"
              className={
                canDrag && !isEditing
                  ? "fill-placeholder dark:fill-placeholder-dark"
                  : "fill-muted dark:fill-muted-dark"
              }
            />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={task.text}
          onPress={() => onToggle(task)}
          disabled={isEditing}
          className={`w-5 h-5 rounded-full border items-center justify-center ${
            task.completed
              ? "bg-border dark:bg-border-dark border-transparent"
              : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
          } ${isEditing ? "opacity-60" : ""}`}
        >
          {task.completed ? (
            <View className="w-3.5 h-3.5 items-center justify-center">
              <AppIcon
                name="check"
                size={14}
                className="fill-surface dark:fill-surface-dark"
              />
            </View>
          ) : null}
        </Pressable>

        <View className="flex-1 gap-1">
          {hasDate ? (
            <Text className="text-[12px] font-inter text-muted dark:text-muted-dark -mb-0.5">
              {formatDisplayDate(dateValue, i18n.language)}
            </Text>
          ) : null}

          {isEditing ? (
            <TextInput
              className={`text-[16px] font-inter-medium py-0 my-0 leading-7 ${
                task.completed
                  ? "text-muted dark:text-muted-dark line-through"
                  : "text-text dark:text-text-dark"
              }`}
              autoFocus
              value={editingText}
              onChangeText={onEditingTextChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => onEditEnd(task)}
              onBlur={() => onEditEnd(task)}
              editable
              accessibilityLabel={task.text}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={task.text}
              onPress={() => onEditStart(task)}
              className="flex-1 active:opacity-80"
            >
              <Text
                className={`text-[16px] font-inter-medium leading-7 text-text dark:text-text-dark ${
                  task.completed ? "line-through" : ""
                }`}
              >
                {task.text}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dateButtonLabel}
          onPress={() => onDateChange?.(task.id, task.date ?? "")}
          className="rounded-[10px] p-1 items-center justify-center active:opacity-80"
        >
          <AppIcon
            name="calendar-today"
            className="fill-muted dark:fill-muted-dark"
          />
        </Pressable>
      </View>
    </View>
  );
}

const areTaskItemPropsEqual = (
  prevProps: TaskItemProps,
  nextProps: TaskItemProps,
): boolean => {
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;
  return (
    prevTask.id === nextTask.id &&
    prevTask.text === nextTask.text &&
    prevTask.completed === nextTask.completed &&
    (prevTask.date ?? "") === (nextTask.date ?? "") &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editingText === nextProps.editingText &&
    (prevProps.editingDate ?? "") === (nextProps.editingDate ?? "") &&
    prevProps.setDateLabel === nextProps.setDateLabel &&
    prevProps.dragHintLabel === nextProps.dragHintLabel &&
    prevProps.isDragActive === nextProps.isDragActive &&
    prevProps.canDrag === nextProps.canDrag &&
    prevProps.canMoveUp === nextProps.canMoveUp &&
    prevProps.canMoveDown === nextProps.canMoveDown &&
    prevProps.moveUpLabel === nextProps.moveUpLabel &&
    prevProps.moveDownLabel === nextProps.moveDownLabel
  );
};

export const TaskItem = memo(
  TaskItemComponent,
  areTaskItemPropsEqual,
) as typeof TaskItemComponent;
