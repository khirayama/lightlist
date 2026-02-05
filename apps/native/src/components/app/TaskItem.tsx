import React, { memo } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { AppIcon } from "../ui/AppIcon";
import type { Task } from "@lightlist/sdk/types";
import { parseISODate } from "@lightlist/sdk/utils/dateParser";
import i18n from "../../utils/i18n";

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

type TaskItemProps = {
  item: Task;
  isEditing: boolean;
  editingText: string;
  editingDate: string;
  onEditStart: (task: Task) => void;
  onEditEnd: () => void;
  onEditChangeText: (text: string) => void;
  onToggleComplete: (task: Task) => void;
  onOpenDatePicker: (task: Task) => void;
  drag: () => void;
  isDragActive: boolean;
  canDrag: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  dateLabel: string;
  editPlaceholder: string;
  reorderLabel: string;
  toggleCompleteLabel: string;
  editTaskLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
};

export const TaskItem = memo(
  ({
    item,
    isEditing,
    editingText,
    editingDate,
    onEditStart,
    onEditEnd,
    onEditChangeText,
    onToggleComplete,
    onOpenDatePicker,
    drag,
    isDragActive,
    canDrag,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    dateLabel,
    editPlaceholder,
    reorderLabel,
    toggleCompleteLabel,
    editTaskLabel,
    moveUpLabel,
    moveDownLabel,
  }: TaskItemProps) => {
    const rawDateValue = isEditing ? editingDate : (item.date ?? "");
    const dateValue = rawDateValue.trim();
    const hasDate = dateValue.length > 0;
    const dateButtonLabel = hasDate ? `${dateLabel}: ${dateValue}` : dateLabel;

    const accessibilityActions = [];
    if (canMoveUp) {
      accessibilityActions.push({
        name: "moveUp",
        label: moveUpLabel,
      });
    }
    if (canMoveDown) {
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
            accessibilityLabel={reorderLabel}
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "moveUp") {
                onMoveUp();
                return;
              }
              if (event.nativeEvent.actionName === "moveDown") {
                onMoveDown();
              }
            }}
            onLongPress={canDrag && !isEditing ? drag : undefined}
            delayLongPress={150}
            disabled={!canDrag || isEditing}
            className="rounded-[10px] p-1 items-center justify-center active:opacity-80"
          >
            <View className="right-[5px]">
              <AppIcon
                name="drag-indicator"
                className={
                  canDrag && !isEditing
                    ? "fill-text dark:fill-text-dark"
                    : "fill-muted dark:fill-muted-dark"
                }
              />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleCompleteLabel}
            onPress={() => onToggleComplete(item)}
            disabled={isEditing}
            className={`w-5 h-5 rounded-full border items-center justify-center ${
              item.completed
                ? "bg-border dark:bg-border-dark border-transparent"
                : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
            } ${isEditing ? "opacity-60" : ""}`}
          >
            {item.completed && (
              <View className="w-3.5 h-3.5 items-center justify-center">
                <AppIcon
                  name="check"
                  size={14}
                  className="fill-surface dark:fill-surface-dark"
                />
              </View>
            )}
          </Pressable>
          <View className="flex-1 gap-1">
            {hasDate ? (
              <Text className="text-[12px] font-inter text-muted dark:text-muted-dark -mb-0.5">
                {formatDisplayDate(dateValue, i18n.language)}
              </Text>
            ) : null}
            {isEditing ? (
              <TextInput
                className={`text-[15px] font-inter py-0 my-0 ${
                  item.completed
                    ? "text-muted dark:text-muted-dark line-through"
                    : "text-text dark:text-text-dark"
                }`}
                autoFocus
                value={editingText}
                onChangeText={onEditChangeText}
                placeholder={editPlaceholder}
                placeholderClassName="text-placeholder dark:text-placeholder-dark"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onEditEnd}
                onBlur={onEditEnd}
                editable
                accessibilityLabel={editTaskLabel}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={editTaskLabel}
                onPress={() => onEditStart(item)}
                className="flex-1 active:opacity-80"
              >
                <Text
                  className={`text-[15px] font-inter leading-6 text-text dark:text-text-dark ${
                    item.completed ? "line-through" : ""
                  }`}
                >
                  {item.text}
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dateButtonLabel}
            onPress={() => onOpenDatePicker(item)}
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
  },
);

TaskItem.displayName = "TaskItem";
