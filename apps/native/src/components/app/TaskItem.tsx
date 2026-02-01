import React, { memo } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { styles } from "../../styles/appStyles";
import { useTheme } from "../../styles/theme";
import type { Task } from "@lightlist/sdk/types";
import i18n from "../../utils/i18n";

const parseDateValue = (value: string) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }
  return null;
};

const formatDisplayDate = (dateString: string, language: string) => {
  const date = parseDateValue(dateString);
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
    const theme = useTheme();

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
      <View style={[styles.taskItem, isDragActive && { opacity: 0.7 }]}>
        <View style={styles.taskRow}>
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
            style={({ pressed }) => [
              styles.taskActionButton,
              {
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={{ right: 5 }}>
              <AppIcon
                name="drag-indicator"
                color={canDrag && !isEditing ? theme.text : theme.muted}
              />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleCompleteLabel}
            onPress={() => onToggleComplete(item)}
            disabled={isEditing}
            style={[
              styles.taskCheck,
              {
                borderColor: theme.border,
                backgroundColor: item.completed ? theme.primary : "transparent",
                opacity: isEditing ? 0.6 : 1,
              },
            ]}
          />
          <View style={styles.taskContent}>
            {hasDate ? (
              <Text
                style={[
                  styles.taskMetaText,
                  { color: theme.muted, marginBottom: -2 },
                ]}
              >
                {formatDisplayDate(dateValue, i18n.language)}
              </Text>
            ) : null}
            {isEditing ? (
              <TextInput
                style={[
                  styles.taskText,
                  {
                    color: theme.text,
                    paddingVertical: 0,
                    marginVertical: 0,
                  },
                ]}
                autoFocus
                value={editingText}
                onChangeText={onEditChangeText}
                placeholder={editPlaceholder}
                placeholderTextColor={theme.placeholder}
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
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dateButtonLabel}
            onPress={() => onOpenDatePicker(item)}
            style={({ pressed }) => [
              styles.taskActionButton,
              {
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <AppIcon name="calendar-today" color={theme.muted} />
          </Pressable>
        </View>
      </View>
    );
  },
);

TaskItem.displayName = "TaskItem";
