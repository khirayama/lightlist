import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { type DrawerContentComponentProps } from "@react-navigation/drawer";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { AppIcon } from "../ui/AppIcon";
import { Dialog } from "../ui/Dialog";
import { styles } from "../../styles/appStyles";
import { listColors } from "../../styles/theme";
import type { AppScreenProps } from "../../types/app";
import type { TaskList } from "@lightlist/sdk/types";

type Props = DrawerContentComponentProps & AppScreenProps;

export const AppDrawerContent = (props: Props) => {
  const {
    t,
    theme,
    userEmail,
    taskLists,
    selectedTaskListId,
    createListName,
    createListBackground,
    isCreatingList,
    isJoiningList,
    onSelectTaskList,
    onOpenSettings,
    onChangeCreateListName,
    onChangeCreateListBackground,
    onChangeJoinListInput,
    onClearJoinListError,
    onCreateList,
    onJoinList,
    onReorderTaskList,
    navigation,
    joinListInput,
    joinListError,
  } = props;

  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isJoinListDialogOpen, setIsJoinListDialogOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1024;

  const canCreateList = !isCreatingList && createListName.trim().length > 0;
  const canJoinList = !isJoiningList && joinListInput.trim().length > 0;
  const canDragList = taskLists.length > 1;

  const handleCreateListDialogChange = (open: boolean) => {
    setIsCreateListDialogOpen(open);
    if (!open) {
      onChangeCreateListName("");
      onChangeCreateListBackground(listColors[0]);
    }
  };

  const handleJoinListDialogChange = (open: boolean) => {
    setIsJoinListDialogOpen(open);
    if (!open) {
      onChangeJoinListInput("");
      onClearJoinListError();
    }
  };

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    const created = await onCreateList();
    if (created) {
      handleCreateListDialogChange(false);
    }
  };

  const handleJoinListSubmit = async () => {
    if (!canJoinList) return;
    const joined = await onJoinList();
    if (joined) {
      handleJoinListDialogChange(false);
      navigation.closeDrawer();
    }
  };

  const handleSelectTaskList = (taskListId: string) => {
    onSelectTaskList(taskListId);
    navigation.closeDrawer();
  };

  const handleOpenSettings = () => {
    navigation.closeDrawer();
    onOpenSettings();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, padding: 20 }}>
      <View style={styles.drawerHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.drawerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {isWideLayout ? userEmail : t("app.drawerTitle")}
          </Text>
          {!isWideLayout && (
            <Text
              style={[styles.drawerSubtitle, { color: theme.muted }]}
              numberOfLines={1}
            >
              {userEmail}
            </Text>
          )}
        </View>
        <View style={styles.drawerHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
            onPress={handleOpenSettings}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="settings" size={20} color={theme.text} />
          </Pressable>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={() => navigation.closeDrawer()}
              style={({ pressed }) => [
                styles.headerIconButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppIcon name="close" size={20} color={theme.text} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <DraggableFlatList
        data={taskLists}
        keyExtractor={(item) => item.id}
        animationConfig={{ duration: 0 }}
        onDragEnd={({ from, to }) => {
          const draggedList = taskLists[from];
          const targetList = taskLists[to];
          if (!draggedList || !targetList || from === to) return;
          void onReorderTaskList(draggedList.id, targetList.id);
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerList}
        ListFooterComponent={
          <View style={styles.section}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.createNew")}
                onPress={() => handleCreateListDialogChange(true)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.primaryText, fontSize: 14 },
                  ]}
                >
                  {t("app.createNew")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.joinList")}
                onPress={() => handleJoinListDialogChange(true)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.text, fontSize: 14 },
                  ]}
                >
                  {t("app.joinList")}
                </Text>
              </Pressable>
            </View>
            <Dialog
              open={isJoinListDialogOpen}
              onOpenChange={handleJoinListDialogChange}
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
              theme={theme}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => handleJoinListDialogChange(false)}
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
                    accessibilityLabel={t("app.join")}
                    onPress={handleJoinListSubmit}
                    disabled={!canJoinList}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        flex: 1,
                        backgroundColor: canJoinList
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
                          color: canJoinList ? theme.primaryText : theme.muted,
                        },
                      ]}
                    >
                      {isJoiningList ? t("app.joining") : t("app.join")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t("pages.sharecode.codeLabel")}
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
                    value={joinListInput}
                    onChangeText={onChangeJoinListInput}
                    placeholder={t("pages.sharecode.codePlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleJoinListSubmit}
                    editable={!isJoiningList}
                    accessibilityLabel={t("pages.sharecode.codeLabel")}
                    autoFocus
                  />
                  {joinListError ? (
                    <Text style={[styles.error, { color: theme.error }]}>
                      {joinListError}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Dialog>
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
                    {([null, ...listColors] as (string | null)[]).map(
                      (color) => {
                        const isSelected = color === createListBackground;
                        return (
                          <Pressable
                            key={`create-${color ?? "none"}`}
                            accessibilityRole="button"
                            accessibilityLabel={
                              color
                                ? t("taskList.selectColor")
                                : t("taskList.backgroundNone")
                            }
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => onChangeCreateListBackground(color)}
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
                      },
                    )}
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
            getIndex() ?? taskLists.findIndex((list) => list.id === item.id);
          const canMoveListUp = canDragList && currentIndex > 0;
          const canMoveListDown =
            canDragList &&
            currentIndex >= 0 &&
            currentIndex < taskLists.length - 1;
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
            const targetList = taskLists[currentIndex + offset];
            if (!targetList) return;
            void onReorderTaskList(item.id, targetList.id);
          };

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={item.name || t("app.taskListName")}
              onPress={() => handleSelectTaskList(item.id)}
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
                    backgroundColor: item.background ?? theme.background,
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
    </View>
  );
};
